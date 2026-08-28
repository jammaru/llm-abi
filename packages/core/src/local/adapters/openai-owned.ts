import { publicModelId } from "../../deployment/model/identity.ts";
import type { RuntimeKind } from "../../deployment/types.ts";
import { DISCOVERY_TIMEOUT_MS, MAX_MODEL_COUNT } from "../limits.ts";
import { readBoundedJSON, timeoutSignal } from "../transport.ts";
import type { RuntimeTransport } from "../transport.ts";
import { joinURL } from "../url.ts";
import type { DetectionResult, DiscoveredModel } from "../types.ts";
import { asArray, asRecord, asString } from "./shared.ts";

export async function detectOpenAIOwnedRuntime(
  transport: RuntimeTransport,
  baseURL: string,
  options: {
    readonly runtime: RuntimeKind;
    readonly ownedBy: string;
    readonly hinted: boolean;
    readonly timeoutMs?: number;
  },
): Promise<{ detection: DetectionResult; models: readonly DiscoveredModel[] }> {
  const timeoutMs = options.timeoutMs ?? DISCOVERY_TIMEOUT_MS;
  const modelsResponse = await transport.fetch(joinURL(baseURL, "v1/models"), {
    method: "GET",
    signal: timeoutSignal(timeoutMs),
  });
  if (!modelsResponse.ok) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }
  const modelsBody = asRecord(await readBoundedJSON(modelsResponse));
  const data = asArray(modelsBody?.["data"]) ?? [];
  const owned = data.some((item) => {
    const owner = asString(asRecord(item)?.["owned_by"])?.toLowerCase();
    return owner === options.ownedBy;
  });
  if (!owned && !options.hinted) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }
  if (!owned && options.hinted && data.length === 0) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }

  const models: DiscoveredModel[] = [];
  for (const item of data.slice(0, MAX_MODEL_COUNT)) {
    const id = asString(asRecord(item)?.["id"]);
    if (!id) {
      continue;
    }
    models.push({
      id: publicModelId(id),
      loaded: true,
      format: "safetensors",
      engine:
        options.runtime === "vllm" || options.runtime === "sglang" ? options.runtime : undefined,
    });
  }

  if (models.length === 0) {
    return { detection: { confidence: "unknown", evidence: [] }, models: [] };
  }

  return {
    detection: {
      runtime: options.runtime,
      confidence: owned ? "exact" : "strong",
      evidence: [
        {
          path: "/v1/models",
          detail: owned ? `owned_by ${options.ownedBy}` : `explicit --runtime ${options.runtime}`,
        },
      ],
    },
    models,
  };
}
