import type {
  Compatibility,
  Diagnostic,
  DiagnosticSeverity,
  Evidence,
  SchemaInput,
} from "../types.ts";
import type { ResolvedTarget } from "../types.ts";

export type RuntimeKind =
  | "lmstudio"
  | "ollama"
  | "llamacpp"
  | "mlx-lm"
  | "vllm"
  | "sglang"
  | "transformers"
  | "unknown";

export type EngineKind =
  | "llamacpp"
  | "mlx"
  | "outlines"
  | "ollama"
  | "vllm"
  | "sglang"
  | "transformers"
  | "unknown";

export type ModelFormat = "gguf" | "mlx" | "safetensors" | "unknown";

export type ApiSurface = "openai" | "native" | "anthropic" | "mixed";

export type FeatureSupport = "supported" | "unsupported" | "conditional" | "unknown";

export type RuntimeCoverage = "profiled" | "partial" | "unknown";

export type FamilySource = "runtime-metadata" | "explicit" | "id-pattern" | "unknown";

export type DeploymentEndpoint = "chat-completions" | "responses" | "native-chat";

export type DeploymentDiagnosticCode =
  | "runtime-unprofiled"
  | "runtime-feature-unsupported"
  | "runtime-feature-conditional"
  | "runtime-feature-unknown"
  | "schema-engine-unresolved"
  | "model-unprofiled"
  | "model-feature-unsupported"
  | "model-feature-unknown"
  | "endpoint-unsupported"
  | "stateful-responses-unsupported"
  | "runtime-version-unknown";

export interface EngineDescriptor {
  readonly kind: EngineKind;
  readonly version?: string;
}

export interface RuntimeDescriptor {
  readonly kind: RuntimeKind;
  readonly version?: string;
  readonly apiSurface: ApiSurface;
  readonly engine?: EngineDescriptor;
}

export interface ModelDescriptor {
  readonly id: string;
  readonly family?: string;
  readonly familySource?: FamilySource;
  readonly architecture?: string;
  readonly format?: ModelFormat;
  readonly quantization?: string;
  readonly digest?: string;
  readonly parameters?: string;
  readonly contextLength?: number;
  readonly maxContextLength?: number;
  readonly modalities?: readonly ("text" | "image" | "audio" | "video")[];
}

export interface DeploymentDescriptor {
  readonly runtime: RuntimeDescriptor;
  readonly model: ModelDescriptor;
}

export interface DeploymentRequest {
  readonly endpoint: string;
  readonly structuredOutput?: boolean;
  readonly tools?: boolean;
  readonly parallelTools?: boolean;
  readonly stream?: boolean;
  readonly stateful?: boolean;
  readonly vision?: boolean;
  readonly reasoning?: boolean;
}

export interface CheckDeploymentInput {
  readonly schema?: SchemaInput;
  readonly deployment: DeploymentDescriptor;
  readonly request: DeploymentRequest;
  readonly typeName?: string;
}

export interface RuntimeCapabilities {
  readonly chatCompletions: FeatureSupport;
  readonly nativeChat: FeatureSupport;
  readonly responses: FeatureSupport;
  readonly structuredOutput: FeatureSupport;
  readonly tools: FeatureSupport;
  readonly parallelTools: FeatureSupport;
  readonly streaming: FeatureSupport;
  readonly statefulResponses: FeatureSupport;
  readonly reasoningControl: FeatureSupport;
  readonly vision: FeatureSupport;
  readonly embeddings: FeatureSupport;
}

export interface ModelCapabilities {
  readonly tools: FeatureSupport;
  readonly parallelTools: FeatureSupport;
  readonly vision: FeatureSupport;
  readonly reasoning: FeatureSupport;
}

export interface RuntimeProfileMatch {
  readonly apiSurface?: ApiSurface;
  readonly modelFormats?: readonly ModelFormat[];
  readonly engines?: readonly EngineKind[];
}

export interface FeatureNote {
  readonly reason: string;
  readonly action: string;
}

export interface RuntimeProfile {
  readonly id: string;
  readonly runtime: RuntimeKind;
  readonly revision: string;
  readonly maturity: "supported" | "partial" | "experimental";
  readonly evidence: Evidence;
  readonly evidenceSource: string;
  readonly lastVerified: string;
  readonly match: RuntimeProfileMatch;
  readonly schemaTarget?: string;
  readonly capabilities: RuntimeCapabilities;
  readonly featureNotes?: Partial<Record<keyof RuntimeCapabilities, FeatureNote>>;
}

export interface ModelProfileMatch {
  readonly exact?: readonly string[];
  readonly prefixes?: readonly string[];
  readonly family?: readonly string[];
}

export interface ModelProfile {
  readonly id: string;
  readonly family: string;
  readonly revision: string;
  readonly evidence: Evidence;
  readonly evidenceSource: string;
  readonly lastVerified: string;
  readonly match: ModelProfileMatch;
  readonly capabilities: ModelCapabilities;
}

export interface ResolvedRuntimeProfile {
  readonly id: string;
  readonly runtime: RuntimeKind;
  readonly revision: string;
  readonly evidence: Evidence;
  readonly evidenceSource: string;
  readonly lastVerified: string;
  readonly schemaTarget?: string;
}

export interface ResolvedModelProfile {
  readonly id: string;
  readonly family: string;
  readonly revision: string;
  readonly evidence: Evidence;
}

export interface ResolvedDeployment {
  readonly runtime: RuntimeDescriptor;
  readonly engine?: EngineDescriptor;
  readonly model: ModelDescriptor;
  readonly schemaTarget?: string;
}

export interface DeploymentFix {
  readonly preferred: boolean;
  readonly endpoint?: DeploymentEndpoint;
  readonly message: string;
}

export interface DeploymentDiagnostic {
  readonly code: DeploymentDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly path: readonly string[];
  readonly message: string;
  readonly reason?: string;
  readonly action?: string;
  readonly keyword?: string;
  readonly fixes?: readonly DeploymentFix[];
}

export interface CheckDeploymentResult {
  readonly compatibility: Compatibility;
  readonly coverage: RuntimeCoverage;
  readonly deployment: ResolvedDeployment;
  readonly schema?: {
    readonly target: ResolvedTarget;
    readonly compatibility: Compatibility;
    readonly diagnostics: readonly Diagnostic[];
  };
  readonly runtime: {
    readonly profile?: ResolvedRuntimeProfile;
    readonly diagnostics: readonly DeploymentDiagnostic[];
  };
  readonly model: {
    readonly profile?: ResolvedModelProfile;
    readonly diagnostics: readonly DeploymentDiagnostic[];
  };
  readonly diagnostics: readonly DeploymentDiagnostic[];
  readonly fixes: readonly DeploymentFix[];
}

export function defineRuntimeProfile(profile: RuntimeProfile): RuntimeProfile {
  return profile;
}

export function defineModelProfile(profile: ModelProfile): ModelProfile {
  return profile;
}
