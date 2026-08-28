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

  const models: DiscoveredModel[] = [];
  for (const item of data.slice(0, MAX_MODEL_COUNT)) {
    const model = asRecord(item);
    const id = asString(model?.["id"]);
    if (!id || id === "none") {
      continue;
    }
    const meta = asRecord(model?.["meta"]);
    models.push({
      id: publicModelId(id),
      loaded: true,
      format: "gguf",
      contextLength: asNumber(meta?.["n_ctx_train"]),
      engine: "llamacpp",
    });
  }

  return {
    detection: {
      runtime: "llamacpp",
      confidence: "exact",
      evidence: [
        { path: "/health", detail: health.status === 503 ? "loading" : "ok" },
        { path: "/v1/models", detail: "owned_by llamacpp" },
      ],
    },
    models,
  };
}
