import { publicModelId } from "../../deployment/model/identity.ts";
import { DISCOVERY_TIMEOUT_MS, MAX_MODEL_COUNT } from "../limits.ts";
import { readBoundedJSON, timeoutSignal } from "../transport.ts";
import type { RuntimeTransport } from "../transport.ts";
import { joinURL } from "../url.ts";
import type { DetectionResult, DiscoveredModel } from "../types.ts";
import { asArray, asNumber, asRecord, asString } from "./shared.ts";

export async function detectLlamaCpp(
  transport: RuntimeTransport,
  baseURL: string,
  timeoutMs: number = DISCOVERY_TIMEOUT_MS,
): Promise<{ detection: DetectionResult; models: readonly DiscoveredModel[] }> {
  const health = await transport.fetch(joinURL(baseURL, "health"), {
    method: "GET",
    signal: timeoutSignal(timeoutMs),
  });
  const healthBody = asRecord(await readBoundedJSON(health).catch(() => undefined));
  const healthOk =
    (health.ok && asString(healthBody?.["status"]) === "ok") ||
    (health.status === 503 &&
      asString(asRecord(healthBody?.["error"])?.["type"]) === "unavailable_error");
  if (!healthOk) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }

  const modelsResponse = await transport.fetch(joinURL(baseURL, "v1/models"), {
    method: "GET",
    signal: timeoutSignal(timeoutMs),
  });
  if (!modelsResponse.ok) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }
  const modelsBody = asRecord(await readBoundedJSON(modelsResponse));
  const data = asArray(modelsBody?.["data"]) ?? [];
  const owned = data.some((item) => asString(asRecord(item)?.["owned_by"]) === "llamacpp");
  if (!owned) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }

  const listed: DiscoveredModel[] = [];
  for (const item of data.slice(0, MAX_MODEL_COUNT)) {
    const model = asRecord(item);
    const id = asString(model?.["id"]);
    if (!id || id === "none") {
      continue;
    }
    const meta = asRecord(model?.["meta"]);
    listed.push({
      id: publicModelId(id),
      loaded: false,
      format: "gguf",
      contextLength: asNumber(meta?.["n_ctx_train"]),
      engine: "llamacpp",
    });
  }

  const loading = health.status === 503;
  const residentId = loading
    ? undefined
    : await readLlamaCppResidentId(transport, baseURL, timeoutMs);
  const models = selectLlamaCppLoaded(listed, residentId, loading);

  return {
    detection: {
      runtime: "llamacpp",
      confidence: "exact",
      evidence: [
        { path: "/health", detail: loading ? "loading" : "ok" },
        { path: "/v1/models", detail: "owned_by llamacpp" },
      ],
    },
    models,
  };
}

async function readLlamaCppResidentId(
  transport: RuntimeTransport,
  baseURL: string,
  timeoutMs: number,
): Promise<string | undefined> {
  const response = await transport.fetch(joinURL(baseURL, "props"), {
    method: "GET",
    signal: timeoutSignal(timeoutMs),
  });
  if (!response.ok) {
    return undefined;
  }
  const props = asRecord(await readBoundedJSON(response).catch(() => undefined));
  const alias = asString(props?.["model_alias"]);
  const generated = asString(asRecord(props?.["default_generation_settings"])?.["model"]);
  const raw = alias ?? generated;
  return raw ? publicModelId(raw) : undefined;
}

function selectLlamaCppLoaded(
  listed: readonly DiscoveredModel[],
  residentId: string | undefined,
  loading: boolean,
): readonly DiscoveredModel[] {
  if (loading) {
    return [];
  }
  if (residentId) {
    const matched = listed.filter((model) => model.id === residentId);
    if (matched.length > 0) {
      return matched.map((model) => markLoaded(model));
    }
    return [{ id: residentId, loaded: true, format: "gguf", engine: "llamacpp" }];
  }
  if (listed.length === 1 && listed[0]) {
    return [markLoaded(listed[0])];
  }
  return [];
}

function markLoaded(model: DiscoveredModel): DiscoveredModel {
  return {
    id: model.id,
    loaded: true,
    format: model.format,
    family: model.family,
    architecture: model.architecture,
    quantization: model.quantization,
    digest: model.digest,
    parameters: model.parameters,
    contextLength: model.contextLength,
    parallel: model.parallel,
    engine: model.engine,
  };
}
