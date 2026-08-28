import type { DeploymentDescriptor, RuntimeKind } from "../deployment/types.ts";
import type { EndpointKind } from "./url.ts";

export type DetectionConfidence = "exact" | "strong" | "weak" | "unknown";

export interface DetectionEvidence {
  readonly path: string;
  readonly detail: string;
}

export interface DetectionResult {
  readonly runtime?: RuntimeKind;
  readonly confidence: DetectionConfidence;
  readonly evidence: readonly DetectionEvidence[];
  readonly version?: string;
}

export interface DiscoveredModel {
  readonly id: string;
  readonly loaded: boolean;
  readonly format?: "gguf" | "mlx" | "safetensors" | "unknown";
  readonly family?: string;
  readonly architecture?: string;
  readonly quantization?: string;
  readonly digest?: string;
  readonly parameters?: string;
  readonly contextLength?: number;
  readonly parallel?: number;
  readonly engine?: "llamacpp" | "mlx" | "outlines" | "ollama" | "vllm" | "sglang" | "unknown";
}

export interface DiscoveredDeployment {
  readonly baseURL: string;
  readonly endpointKind: EndpointKind;
  readonly detection: DetectionResult;
  readonly models: readonly DiscoveredModel[];
  readonly deployment?: DeploymentDescriptor;
}

export interface DiscoverOptions {
  readonly endpoints?: readonly { readonly runtime?: RuntimeKind; readonly baseURL: string }[];
  readonly transport?: import("./transport.ts").RuntimeTransport;
  readonly timeoutMs?: number;
}

export type ProbeStatus = "passed" | "failed" | "inconclusive" | "skipped";
export type ProbeMechanism =
  | "transport"
  | "acceptance"
  | "schema-validation"
  | "adversarial"
  | "tool-validation";

export interface ProbeObservation {
  readonly id: string;
  readonly status: ProbeStatus;
  readonly mechanism: ProbeMechanism;
  readonly detail: string;
}

export interface ProbeDeploymentResult {
  readonly schemaVersion: 1;
  readonly staticCompatibility?: string;
  readonly observations: readonly ProbeObservation[];
  readonly skippedReason?: string;
}
