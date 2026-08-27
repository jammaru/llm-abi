import type { Compatibility, DiagnosticSeverity, Evidence } from "../types.ts";

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export type RequestEndpoint = "chat-completions" | "responses";

export type RequestDiagnosticCode = "chat-tools-reasoning";

export type ReasoningEffortSource = "explicit" | "model-default" | "omitted";

export type RequestCoverage = "profiled" | "unknown";

export interface CheckRequestInput {
  readonly provider: string;
  readonly model: string;
  readonly endpoint: string;
  readonly tools?: boolean | "function";
  readonly reasoningEffort?: ReasoningEffort;
}

export interface RequestFix {
  readonly preferred: boolean;
  readonly endpoint?: RequestEndpoint;
  readonly reasoningEffort?: ReasoningEffort;
  readonly message: string;
}

export interface RequestDiagnostic {
  readonly code: RequestDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly path: readonly string[];
  readonly message: string;
  readonly reason?: string;
  readonly action?: string;
  readonly keyword?: string;
  readonly fixes?: readonly RequestFix[];
}

export interface EffectiveRequest {
  readonly provider: string;
  readonly model: string;
  readonly family: string | undefined;
  readonly endpoint: RequestEndpoint;
  readonly tools: boolean;
  readonly reasoningEffort: ReasoningEffort | undefined;
  readonly reasoningEffortSource: ReasoningEffortSource;
}

export interface ResolvedRequestProfile {
  readonly id: string;
  readonly vendor: string;
  readonly family: string;
  readonly revision: string;
  readonly evidence: Evidence;
  readonly providers: readonly string[];
}

export interface CheckRequestResult {
  readonly coverage: RequestCoverage;
  readonly compatibility: Compatibility;
  readonly diagnostics: readonly RequestDiagnostic[];
  readonly effective: EffectiveRequest;
  readonly profile: ResolvedRequestProfile | undefined;
  readonly fixes: readonly RequestFix[];
}

export interface RequestModelMatch {
  readonly exact: readonly string[];
  readonly prefixes: readonly string[];
}

export interface RequestRuleWhen {
  readonly endpoints: readonly RequestEndpoint[];
  readonly functionTools: boolean;
  readonly reasoningNot?: readonly ReasoningEffort[];
}

export interface RequestRule {
  readonly id: string;
  readonly when: RequestRuleWhen;
  readonly compatibility: Compatibility;
  readonly code: RequestDiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly reason: string;
  readonly defaultReason: string;
  readonly action: string;
  readonly keyword?: string;
  readonly path: readonly string[];
  readonly fixes: readonly RequestFix[];
}

export interface RequestProfile {
  readonly id: string;
  readonly vendor: string;
  readonly family: string;
  readonly providers: readonly string[];
  readonly revision: string;
  readonly evidence: Evidence;
  readonly models: RequestModelMatch;
  readonly defaults: {
    readonly reasoningEffort?: ReasoningEffort;
  };
  readonly rules: readonly RequestRule[];
}

export function defineRequestProfile(profile: RequestProfile): RequestProfile {
  return profile;
}
