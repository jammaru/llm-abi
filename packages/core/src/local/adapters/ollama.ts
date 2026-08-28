import { publicModelId } from "../../deployment/model/identity.ts";
import { DISCOVERY_TIMEOUT_MS, MAX_MODEL_COUNT } from "../limits.ts";
import { readBoundedJSON, timeoutSignal } from "../transport.ts";
import type { RuntimeTransport } from "../transport.ts";
import { joinURL } from "../url.ts";
import type { DetectionResult, DiscoveredModel } from "../types.ts";
import { asArray, asNumber, asRecord, asString } from "./shared.ts";

export async function detectOllama(
  transport: RuntimeTransport,
  baseURL: string,
  timeoutMs: number = DISCOVERY_TIMEOUT_MS,
): Promise<{ detection: DetectionResult; models: readonly DiscoveredModel[] }> {
  const versionResponse = await transport.fetch(joinURL(baseURL, "api/version"), {
    method: "GET",
    signal: timeoutSignal(timeoutMs),
  });
  if (!versionResponse.ok) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }
  const versionBody = asRecord(await readBoundedJSON(versionResponse));
  const version = asString(versionBody?.["version"]);
  if (!version) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }

  const psResponse = await transport.fetch(joinURL(baseURL, "api/ps"), {
    method: "GET",
    signal: timeoutSignal(timeoutMs),
  });
  if (!psResponse.ok) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }
  const psBody = asRecord(await readBoundedJSON(psResponse));
  const running = asArray(psBody?.["models"]) ?? [];
  const models: DiscoveredModel[] = [];
  for (const item of running.slice(0, MAX_MODEL_COUNT)) {
    const model = asRecord(item);
    if (!model) {
      continue;
    }
    const details = asRecord(model["details"]);
    const name = asString(model["name"]) ?? asString(model["model"]);
    if (!name) {
      continue;
    }
    const formatRaw = asString(details?.["format"])?.toLowerCase();
    models.push({
      id: publicModelId(name),
      loaded: true,
      format: formatRaw === "gguf" ? "gguf" : formatRaw ? "unknown" : undefined,
      family: asString(details?.["family"]),
      quantization: asString(details?.["quantization_level"]),
      digest: asString(model["digest"]),
      parameters: asString(details?.["parameter_size"]),
      contextLength: asNumber(model["context_length"]),
      engine: "ollama",
    });
  }
  return {
    detection: {
      runtime: "ollama",
      confidence: "exact",
      version,
      evidence: [
        { path: "/api/version", detail: `version ${version}` },
        { path: "/api/ps", detail: "running model list" },
      ],
    },
    models,
  };
}
