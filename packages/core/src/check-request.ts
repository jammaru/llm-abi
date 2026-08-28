import { LlmAbiError } from "./errors.ts";
import { findRequestProfile, toResolvedRequest } from "./request/registry.ts";
import type {
  CheckRequestInput,
  CheckRequestResult,
  EffectiveRequest,
  ReasoningEffort,
  RequestDiagnostic,
  RequestEndpoint,
  RequestFix,
  RequestProfile,
  RequestRule,
} from "./request/types.ts";
import { worstCompatibility } from "./compatibility/rank.ts";
import type { Compatibility } from "./types.ts";

const MAX_MODEL_ID = 256;

const REASONING_EFFORTS = new Set<ReasoningEffort>([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

const ENDPOINT_ALIASES = new Map<string, RequestEndpoint>([
  ["chat-completions", "chat-completions"],
  ["chat", "chat-completions"],
  ["/v1/chat/completions", "chat-completions"],
  ["v1/chat/completions", "chat-completions"],
  ["responses", "responses"],
  ["/v1/responses", "responses"],
  ["v1/responses", "responses"],
]);

export function checkRequest(input: CheckRequestInput): CheckRequestResult {
  const provider = normalizeProvider(input.provider);
  const model = normalizeModel(input.model);
  const endpoint = normalizeEndpoint(input.endpoint);
  const tools = hasFunctionTools(input.tools);
  if (input.reasoningEffort !== undefined && !REASONING_EFFORTS.has(input.reasoningEffort)) {
    throw new LlmAbiError(
      `Unknown reasoningEffort "${String(input.reasoningEffort)}". Known values: none, minimal, low, medium, high, xhigh, max.`,
      "unknown-reasoning-effort",
    );
  }

  const profile = findRequestProfile(provider, model);
  const effective = applyDefaults(provider, model, endpoint, tools, input.reasoningEffort, profile);
  const matched = profile ? evaluateRules(profile, effective) : [];
  const diagnostics = matched.map((item) => item.diagnostic);
  return {
    coverage: profile ? "profiled" : "unknown",
    compatibility: worstCompatibility(matched.map((item) => item.compatibility)),
    diagnostics,
    effective,
    profile: profile ? toResolvedRequest(profile) : undefined,
    fixes: collectFixes(diagnostics),
  };
}

function applyDefaults(
  provider: string,
  model: string,
  endpoint: RequestEndpoint,
  tools: boolean,
  reasoningEffort: ReasoningEffort | undefined,
  profile: RequestProfile | undefined,
): EffectiveRequest {
  if (reasoningEffort !== undefined) {
    return {
      provider,
      model,
      family: profile?.family,
      endpoint,
      tools,
      reasoningEffort,
      reasoningEffortSource: "explicit",
    };
  }
  if (profile?.defaults.reasoningEffort !== undefined) {
    return {
      provider,
      model,
      family: profile.family,
      endpoint,
      tools,
      reasoningEffort: profile.defaults.reasoningEffort,
      reasoningEffortSource: "model-default",
    };
  }
  return {
    provider,
    model,
    family: profile?.family,
    endpoint,
    tools,
    reasoningEffort: undefined,
    reasoningEffortSource: "omitted",
  };
}

function evaluateRules(
  profile: RequestProfile,
  effective: EffectiveRequest,
): readonly { readonly diagnostic: RequestDiagnostic; readonly compatibility: Compatibility }[] {
  const matched: { diagnostic: RequestDiagnostic; compatibility: Compatibility }[] = [];
  for (const rule of profile.rules) {
    if (!ruleApplies(rule, effective)) {
      continue;
    }
    matched.push({
      compatibility: rule.compatibility,
      diagnostic: {
        code: rule.code,
        severity: rule.severity,
        path: rule.path,
        message: rule.message,
        reason:
          effective.reasoningEffortSource === "model-default" ? rule.defaultReason : rule.reason,
        action: rule.action,
        keyword: rule.keyword,
        fixes: rule.fixes,
      },
    });
  }
  return matched;
}

function ruleApplies(rule: RequestRule, effective: EffectiveRequest): boolean {
  if (!rule.when.endpoints.includes(effective.endpoint)) {
    return false;
  }
  if (rule.when.functionTools && !effective.tools) {
    return false;
  }
  if (!rule.when.functionTools && effective.tools) {
    return false;
  }
  const excluded = rule.when.reasoningNot;
  if (excluded) {
    const effort = effective.reasoningEffort;
    if (effort === undefined || excluded.includes(effort)) {
      return false;
    }
  }
  return true;
}

function collectFixes(diagnostics: readonly RequestDiagnostic[]): RequestFix[] {
  const fixes: RequestFix[] = [];
  for (const diagnostic of diagnostics) {
    if (!diagnostic.fixes) {
      continue;
    }
    for (const fix of diagnostic.fixes) {
      fixes.push(fix);
    }
  }
  return fixes;
}

function normalizeProvider(provider: string): string {
  if (typeof provider !== "string" || provider.trim() === "") {
    throw new LlmAbiError("Request provider is required.", "invalid-request");
  }
  return provider.trim().toLowerCase();
}

function normalizeModel(model: string): string {
  if (typeof model !== "string" || model.trim() === "") {
    throw new LlmAbiError("Request model is required.", "invalid-request");
  }
  const id = model.trim().toLowerCase();
  if (id.length > MAX_MODEL_ID) {
    throw new LlmAbiError(
      `Request model exceeds ${String(MAX_MODEL_ID)} characters.`,
      "invalid-request",
    );
  }
  return id;
}

function normalizeEndpoint(endpoint: string): RequestEndpoint {
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new LlmAbiError("Request endpoint is required.", "invalid-request");
  }
  const key = endpoint.trim().toLowerCase();
  const resolved = ENDPOINT_ALIASES.get(key);
  if (!resolved) {
    throw new LlmAbiError(
      `Unknown endpoint "${endpoint}". Known endpoints: chat-completions, responses.`,
      "unknown-request-endpoint",
    );
  }
  return resolved;
}

function hasFunctionTools(tools: CheckRequestInput["tools"]): boolean {
  if (tools === undefined || tools === false) {
    return false;
  }
  if (tools === true || tools === "function") {
    return true;
  }
  throw new LlmAbiError(
    `Unknown tools value "${String(tools)}". Use true, false, or "function".`,
    "invalid-request",
  );
}
