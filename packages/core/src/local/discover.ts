import { inferQwen38Family } from "../deployment/model/identity.ts";
import type { DeploymentDescriptor, RuntimeKind } from "../deployment/types.ts";
import { detectLlamaCpp } from "./adapters/llamacpp.ts";
import { detectLmStudio } from "./adapters/lmstudio.ts";
import { detectOllama } from "./adapters/ollama.ts";
import { DISCOVERY_TIMEOUT_MS } from "./limits.ts";
import { createFetchTransport } from "./transport.ts";
import type { RuntimeTransport } from "./transport.ts";
import { endpointKindOf, parseBaseURL } from "./url.ts";
import type { DiscoverOptions, DiscoveredDeployment, DiscoveredModel } from "./types.ts";

const DEFAULT_ENDPOINTS: readonly { readonly runtime?: RuntimeKind; readonly baseURL: string }[] = [
  { runtime: "lmstudio", baseURL: "http://127.0.0.1:1234" },
  { runtime: "ollama", baseURL: "http://127.0.0.1:11434" },
  { baseURL: "http://127.0.0.1:8080" },
];

export async function discoverLocalDeployments(
  options: DiscoverOptions = {},
): Promise<readonly DiscoveredDeployment[]> {
  const transport = options.transport ?? createFetchTransport();
  const timeoutMs = options.timeoutMs ?? DISCOVERY_TIMEOUT_MS;
  const endpoints = options.endpoints ?? DEFAULT_ENDPOINTS;
  const found: DiscoveredDeployment[] = [];
  // Serial on purpose: parallel GETs can evict local models under memory pressure.
  for (const endpoint of endpoints) {
    // oxlint-disable-next-line no-await-in-loop -- discovery must stay sequential
    const discovered = await discoverOne(transport, endpoint.baseURL, endpoint.runtime, timeoutMs);
    if (discovered) {
      found.push(discovered);
    }
  }
  return found;
}

async function discoverOne(
  transport: RuntimeTransport,
  baseURL: string,
  hint: RuntimeKind | undefined,
  timeoutMs: number,
): Promise<DiscoveredDeployment | undefined> {
  const url = parseBaseURL(baseURL);
  const endpointKind = endpointKindOf(url);
  try {
    if (hint === "lmstudio") {
      const result = await detectLmStudio(transport, url.origin, timeoutMs);
      if (result.detection.confidence === "exact") {
        return toDiscovered(url.origin, endpointKind, result.detection, result.models);
      }
      return undefined;
    }
    if (hint === "ollama") {
      const result = await detectOllama(transport, url.origin, timeoutMs);
      if (result.detection.confidence === "exact") {
        return toDiscovered(url.origin, endpointKind, result.detection, result.models);
      }
      return undefined;
    }
    if (hint === "llamacpp") {
      const result = await detectLlamaCpp(transport, url.origin, timeoutMs);
      if (result.detection.confidence === "exact") {
        return toDiscovered(url.origin, endpointKind, result.detection, result.models);
      }
      return undefined;
    }

    const llama = await detectLlamaCpp(transport, url.origin, timeoutMs);
    if (llama.detection.confidence === "exact") {
      return toDiscovered(url.origin, endpointKind, llama.detection, llama.models);
    }
    const ollama = await detectOllama(transport, url.origin, timeoutMs);
    if (ollama.detection.confidence === "exact") {
      return toDiscovered(url.origin, endpointKind, ollama.detection, ollama.models);
    }
    const lmstudio = await detectLmStudio(transport, url.origin, timeoutMs);
    if (lmstudio.detection.confidence === "exact") {
      return toDiscovered(url.origin, endpointKind, lmstudio.detection, lmstudio.models);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function toDiscovered(
  baseURL: string,
  endpointKind: DiscoveredDeployment["endpointKind"],
  detection: DiscoveredDeployment["detection"],
  models: readonly DiscoveredModel[],
): DiscoveredDeployment {
  const first = models[0];
  return {
    baseURL,
    endpointKind,
    detection,
    models,
    deployment: first && detection.runtime ? toDescriptor(detection.runtime, first) : undefined,
  };
}

function toDescriptor(runtime: RuntimeKind, model: DiscoveredModel): DeploymentDescriptor {
  const inferred = inferQwen38Family(model.id);
  return {
    runtime: {
      kind: runtime,
      apiSurface: runtime === "ollama" ? "mixed" : "openai",
      engine: model.engine ? { kind: model.engine === "mlx" ? "mlx" : model.engine } : undefined,
    },
    model: {
      id: model.id,
      family: inferred.family,
      familySource: inferred.source,
      architecture: model.architecture,
      format: model.format,
      quantization: model.quantization,
      digest: model.digest,
      parameters: model.parameters,
      contextLength: model.contextLength,
    },
  };
}
