import { LlmAbiError } from "../errors.ts";
import { inferQwen38Family, looksLikeQwen38Family, publicModelId } from "./model/identity.ts";
import type {
  ApiSurface,
  DeploymentDescriptor,
  DeploymentEndpoint,
  DeploymentRequest,
  EngineKind,
  ModelFormat,
  RuntimeKind,
} from "./types.ts";

const MAX_MODEL_ID = 256;
const MAX_VERSION = 64;
const MAX_FAMILY = 64;

const RUNTIME_KINDS = new Set<RuntimeKind>([
  "lmstudio",
  "ollama",
  "llamacpp",
  "mlx-lm",
  "vllm",
  "sglang",
  "transformers",
  "unknown",
]);

const ENGINE_KINDS = new Set<EngineKind>([
  "llamacpp",
  "mlx",
  "outlines",
  "ollama",
  "vllm",
  "sglang",
  "transformers",
  "unknown",
]);

const API_SURFACES = new Set<ApiSurface>(["openai", "native", "anthropic", "mixed"]);

const MODEL_FORMATS = new Set<ModelFormat>(["gguf", "mlx", "safetensors", "unknown"]);

const ENDPOINT_ALIASES = new Map<string, DeploymentEndpoint>([
  ["chat-completions", "chat-completions"],
  ["chat", "chat-completions"],
  ["/v1/chat/completions", "chat-completions"],
  ["v1/chat/completions", "chat-completions"],
  ["responses", "responses"],
  ["/v1/responses", "responses"],
  ["v1/responses", "responses"],
  ["native-chat", "native-chat"],
  ["native", "native-chat"],
  ["/api/chat", "native-chat"],
]);

export interface NormalizedDeployment {
  readonly runtime: {
    readonly kind: RuntimeKind;
    readonly version?: string;
    readonly apiSurface: ApiSurface;
    readonly engine?: { readonly kind: EngineKind; readonly version?: string };
  };
  readonly model: {
    readonly id: string;
    readonly family?: string;
    readonly familySource: "runtime-metadata" | "explicit" | "id-pattern" | "unknown";
    readonly architecture?: string;
    readonly format?: ModelFormat;
    readonly quantization?: string;
    readonly digest?: string;
    readonly parameters?: string;
    readonly contextLength?: number;
    readonly maxContextLength?: number;
    readonly modalities?: readonly ("text" | "image" | "audio" | "video")[];
  };
}

export function normalizeDeployment(input: DeploymentDescriptor): NormalizedDeployment {
  const kind = requireRuntimeKind(input.runtime.kind);
  const apiSurface = requireApiSurface(input.runtime.apiSurface);
  const modelId = normalizeModelId(input.model.id);
  const family = normalizeOptionalName(input.model.family, MAX_FAMILY, "family");
  const familySource = resolveFamilySource(input, family, modelId);

  return {
    runtime: {
      kind,
      version: normalizeOptionalName(input.runtime.version, MAX_VERSION, "runtime version"),
      apiSurface,
      engine: input.runtime.engine
        ? {
            kind: requireEngineKind(input.runtime.engine.kind),
            version: normalizeOptionalName(
              input.runtime.engine.version,
              MAX_VERSION,
              "engine version",
            ),
          }
        : undefined,
    },
    model: {
      id: modelId,
      family: familySource.family,
      familySource: familySource.source,
      architecture: normalizeOptionalName(input.model.architecture, MAX_FAMILY, "architecture"),
      format: input.model.format ? requireFormat(input.model.format) : undefined,
      quantization: normalizeOptionalName(input.model.quantization, MAX_FAMILY, "quantization"),
      digest: normalizeOptionalName(input.model.digest, 128, "digest"),
      parameters: normalizeOptionalName(input.model.parameters, MAX_FAMILY, "parameters"),
      contextLength: input.model.contextLength,
      maxContextLength: input.model.maxContextLength,
      modalities: input.model.modalities,
    },
  };
}

export function normalizeRequest(request: DeploymentRequest): {
  readonly endpoint: DeploymentEndpoint;
  readonly structuredOutput: boolean;
  readonly tools: boolean;
  readonly parallelTools: boolean;
  readonly stream: boolean;
  readonly stateful: boolean;
  readonly vision: boolean;
  readonly reasoning: boolean;
} {
  return {
    endpoint: normalizeEndpoint(request.endpoint),
    structuredOutput: request.structuredOutput === true,
    tools: request.tools === true,
    parallelTools: request.parallelTools === true,
    stream: request.stream === true,
    stateful: request.stateful === true,
    vision: request.vision === true,
    reasoning: request.reasoning === true,
  };
}

function resolveFamilySource(
  input: DeploymentDescriptor,
  family: string | undefined,
  modelId: string,
): { family?: string; source: NormalizedDeployment["model"]["familySource"] } {
  if (input.model.familySource === "runtime-metadata" && family && looksLikeQwen38Family(family)) {
    return { family, source: "runtime-metadata" };
  }
  if (input.model.family && family) {
    if (looksLikeQwen38Family(family) || input.model.familySource === "explicit") {
      return { family, source: "explicit" };
    }
    return { source: "unknown" };
  }
  const inferred = inferQwen38Family(modelId);
  return { family: inferred.family, source: inferred.source };
}

function normalizeModelId(id: string): string {
  if (typeof id !== "string" || id.trim() === "") {
    throw new LlmAbiError("Deployment model id is required.", "invalid-deployment");
  }
  const visible = publicModelId(id.trim());
  if (visible.length > MAX_MODEL_ID) {
    throw new LlmAbiError(
      `Deployment model id exceeds ${String(MAX_MODEL_ID)} characters.`,
      "invalid-deployment",
    );
  }
  return visible;
}

function normalizeOptionalName(
  value: string | undefined,
  max: number,
  label: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  if (trimmed.length > max) {
    throw new LlmAbiError(
      `Deployment ${label} exceeds ${String(max)} characters.`,
      "invalid-deployment",
    );
  }
  return trimmed;
}

function normalizeEndpoint(endpoint: string): DeploymentEndpoint {
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new LlmAbiError("Deployment endpoint is required.", "invalid-deployment");
  }
  const resolved = ENDPOINT_ALIASES.get(endpoint.trim().toLowerCase());
  if (!resolved) {
    throw new LlmAbiError(
      `Unknown endpoint "${endpoint}". Known endpoints: chat-completions, responses, native-chat.`,
      "unknown-request-endpoint",
    );
  }
  return resolved;
}

function requireRuntimeKind(kind: string): RuntimeKind {
  if (!RUNTIME_KINDS.has(kind as RuntimeKind)) {
    throw new LlmAbiError(`Unknown runtime "${kind}".`, "invalid-deployment");
  }
  return kind as RuntimeKind;
}

function requireEngineKind(kind: string): EngineKind {
  if (!ENGINE_KINDS.has(kind as EngineKind)) {
    throw new LlmAbiError(`Unknown engine "${kind}".`, "invalid-deployment");
  }
  return kind as EngineKind;
}

function requireApiSurface(surface: string): ApiSurface {
  if (!API_SURFACES.has(surface as ApiSurface)) {
    throw new LlmAbiError(`Unknown apiSurface "${surface}".`, "invalid-deployment");
  }
  return surface as ApiSurface;
}

function requireFormat(format: string): ModelFormat {
  if (!MODEL_FORMATS.has(format as ModelFormat)) {
    throw new LlmAbiError(`Unknown model format "${format}".`, "invalid-deployment");
  }
  return format as ModelFormat;
}
