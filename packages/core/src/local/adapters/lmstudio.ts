import { publicModelId } from "../../deployment/model/identity.ts";
import { DISCOVERY_TIMEOUT_MS, MAX_MODEL_COUNT } from "../limits.ts";
import { readBoundedJSON, timeoutSignal } from "../transport.ts";
import type { RuntimeTransport } from "../transport.ts";
import { joinURL } from "../url.ts";
import type { DetectionResult, DiscoveredModel } from "../types.ts";
import { asArray, asNumber, asRecord, asString } from "./shared.ts";

export async function detectLmStudio(
  transport: RuntimeTransport,
  baseURL: string,
  timeoutMs: number = DISCOVERY_TIMEOUT_MS,
): Promise<{ detection: DetectionResult; models: readonly DiscoveredModel[] }> {
  const response = await transport.fetch(joinURL(baseURL, "api/v1/models"), {
    method: "GET",
    signal: timeoutSignal(timeoutMs),
  });
  if (!response.ok) {
    return {
      detection: { confidence: "unknown", evidence: [] },
      models: [],
    };
  }
  const body = asRecord(await readBoundedJSON(response));
  const models = asArray(body?.["models"]);
  if (!models) {
    return {
      detection: { confidence: "unknown", evidence: [] },
      models: [],
    };
  }
  const discovered: DiscoveredModel[] = [];
  for (const item of models.slice(0, MAX_MODEL_COUNT)) {
    const model = asRecord(item);
    if (!model) {
      continue;
    }
    const key = asString(model["key"]) ?? asString(model["display_name"]);
    if (!key) {
      continue;
    }
    const instances = asArray(model["loaded_instances"]) ?? [];
    const first = asRecord(instances[0]);
    const config = asRecord(first?.["config"]);
    const quant = asRecord(model["quantization"]);
    const formatRaw = asString(model["format"])?.toLowerCase();
    const format =
      formatRaw === "gguf" || formatRaw === "mlx" ? formatRaw : formatRaw ? "unknown" : undefined;
    discovered.push({
      id: publicModelId(key),
      loaded: instances.length > 0,
      format,
      architecture: asString(model["architecture"]),
      quantization: asString(quant?.["name"]),
      parameters: asString(model["params_string"]),
      contextLength: asNumber(config?.["context_length"]),
      parallel: asNumber(config?.["parallel"]),
      engine: format === "gguf" ? "llamacpp" : format === "mlx" ? "mlx" : undefined,
    });
  }
  const hasNativeShape = discovered.some(
    (model) => model.format !== undefined || model.architecture !== undefined,
  );
  return {
    detection: {
      runtime: hasNativeShape ? "lmstudio" : undefined,
      confidence: hasNativeShape ? "exact" : "unknown",
      evidence: hasNativeShape
        ? [{ path: "/api/v1/models", detail: "native model list with key/format metadata" }]
        : [],
    },
    models: discovered.filter((model) => model.loaded),
  };
}
