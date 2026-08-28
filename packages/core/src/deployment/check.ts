import { worstCompatibility } from "../compatibility/rank.ts";
import { compile } from "../compile.ts";
import type { Compatibility } from "../types.ts";
import { findModelProfile } from "./model/registry.ts";
import { normalizeDeployment, normalizeRequest } from "./normalize.ts";
import { findRuntimeProfile, runtimeKindKnown, toResolvedRuntime } from "./runtime/registry.ts";
import { toResolvedModel } from "./model/registry.ts";
import type {
  CheckDeploymentInput,
  CheckDeploymentResult,
  DeploymentDiagnostic,
  DeploymentEndpoint,
  DeploymentFix,
  FeatureSupport,
  ModelCapabilities,
  ResolvedDeployment,
  RuntimeCapabilities,
  RuntimeCoverage,
} from "./types.ts";

interface RequiredFeature {
  readonly key: keyof RuntimeCapabilities | keyof ModelCapabilities;
  readonly layer: "runtime" | "model";
  readonly path: readonly string[];
  readonly label: string;
}

export function checkDeployment(input: CheckDeploymentInput): CheckDeploymentResult {
  const deployment = normalizeDeployment(input.deployment);
  const request = normalizeRequest(input.request);
  const runtimeProfile = findRuntimeProfile({
    runtime: deployment.runtime,
    model: deployment.model,
  });
  const modelProfile = findModelProfile(deployment.model.id, deployment.model.family);
  const schemaTarget = runtimeProfile?.schemaTarget;
  const kindKnown = runtimeKindKnown({
    runtime: deployment.runtime,
    model: deployment.model,
  });

  const runtimeDiagnostics: DeploymentDiagnostic[] = [];
  const modelDiagnostics: DeploymentDiagnostic[] = [];
  const levels: Compatibility[] = [];

  if (!runtimeProfile) {
    runtimeDiagnostics.push({
      code: kindKnown ? "schema-engine-unresolved" : "runtime-unprofiled",
      severity: kindKnown ? "warning" : "info",
      path: ["runtime"],
      message: kindKnown
        ? "This runtime is known, but the schema engine could not be resolved from format and engine."
        : "No shipped runtime profile matches this deployment.",
      reason: kindKnown
        ? "LM Studio GGUF and MLX use different structured-output engines. Format is required."
        : "Unknown is not treated as supported.",
      action: kindKnown
        ? "Set model.format to gguf or mlx, or compile() with an explicit runtime target id."
        : "Pass a profiled runtime, or treat this result as unchecked.",
    });
  }

  if (!modelProfile) {
    modelDiagnostics.push({
      code: "model-unprofiled",
      severity: "info",
      path: ["model"],
      message: "No shipped model profile matches this model id.",
      reason: "Family was not inferred from a conservative id pattern.",
      action: "Treat model-specific tools, vision, and reasoning as unknown.",
    });
  }

  if (input.schema !== undefined && !schemaTarget) {
    runtimeDiagnostics.push({
      code: "schema-engine-unresolved",
      severity: "warning",
      path: ["schema"],
      message: "A schema was supplied, but no runtime schema target could be resolved.",
      reason: "Structured-output lowering needs a schema engine, not only a runtime kind.",
      action: "Provide model.format / engine, or compile() with an explicit target id.",
    });
  }

  const schemaResult =
    input.schema !== undefined && schemaTarget
      ? compile(input.schema, { target: schemaTarget, strict: false, typeName: input.typeName })
      : undefined;
  if (schemaResult) {
    levels.push(schemaResult.compatibility);
  }

  for (const feature of requiredRuntimeFeatures(request.endpoint, request)) {
    const support =
      runtimeProfile?.capabilities[feature.key as keyof RuntimeCapabilities] ?? "unknown";
    const note = runtimeProfile?.featureNotes?.[feature.key as keyof RuntimeCapabilities];
    const diagnostic = featureDiagnostic("runtime", feature, support, note?.reason, note?.action);
    if (diagnostic) {
      runtimeDiagnostics.push(diagnostic);
    }
    const level = supportToCompatibility(support);
    if (level) {
      levels.push(level);
    }
  }

  for (const feature of requiredModelFeatures(request)) {
    const support = modelProfile?.capabilities[feature.key as keyof ModelCapabilities] ?? "unknown";
    const diagnostic = featureDiagnostic("model", feature, support);
    if (diagnostic) {
      modelDiagnostics.push(diagnostic);
    }
    const level = supportToCompatibility(support);
    if (level) {
      levels.push(level);
    }
  }

  const diagnostics = [...runtimeDiagnostics, ...modelDiagnostics];
  const resolved: ResolvedDeployment = {
    runtime: deployment.runtime,
    engine: deployment.runtime.engine,
    model: deployment.model,
    schemaTarget,
  };

  return {
    compatibility: worstCompatibility(levels),
    coverage: coverageOf(runtimeProfile !== undefined, modelProfile !== undefined, diagnostics),
    deployment: resolved,
    schema: schemaResult
      ? {
          target: schemaResult.target,
          compatibility: schemaResult.compatibility,
          diagnostics: schemaResult.diagnostics,
        }
      : undefined,
    runtime: {
      profile: runtimeProfile ? toResolvedRuntime(runtimeProfile) : undefined,
      diagnostics: runtimeDiagnostics,
    },
    model: {
      profile: modelProfile ? toResolvedModel(modelProfile) : undefined,
      diagnostics: modelDiagnostics,
    },
    diagnostics,
    fixes: collectFixes(diagnostics),
  };
}

function requiredRuntimeFeatures(
  endpoint: DeploymentEndpoint,
  request: ReturnType<typeof normalizeRequest>,
): readonly RequiredFeature[] {
  const features: RequiredFeature[] = [
    {
      key:
        endpoint === "native-chat"
          ? "nativeChat"
          : endpoint === "responses"
            ? "responses"
            : "chatCompletions",
      layer: "runtime",
      path: ["request", "endpoint"],
      label: endpoint,
    },
  ];
  if (request.structuredOutput) {
    features.push({
      key: "structuredOutput",
      layer: "runtime",
      path: ["request", "structuredOutput"],
      label: "structured output",
    });
  }
  if (request.tools) {
    features.push({ key: "tools", layer: "runtime", path: ["request", "tools"], label: "tools" });
  }
  if (request.parallelTools) {
    features.push({
      key: "parallelTools",
      layer: "runtime",
      path: ["request", "parallelTools"],
      label: "parallel tools",
    });
  }
  if (request.stream) {
    features.push({
      key: "streaming",
      layer: "runtime",
      path: ["request", "stream"],
      label: "streaming",
    });
  }
  if (request.stateful) {
    features.push({
      key: "statefulResponses",
      layer: "runtime",
      path: ["request", "stateful"],
      label: "stateful responses",
    });
  }
  if (request.vision) {
    features.push({
      key: "vision",
      layer: "runtime",
      path: ["request", "vision"],
      label: "vision",
    });
  }
  if (request.reasoning) {
    features.push({
      key: "reasoningControl",
      layer: "runtime",
      path: ["request", "reasoning"],
      label: "reasoning control",
    });
  }
  return features;
}

function requiredModelFeatures(
  request: ReturnType<typeof normalizeRequest>,
): readonly RequiredFeature[] {
  const features: RequiredFeature[] = [];
  if (request.tools) {
    features.push({ key: "tools", layer: "model", path: ["request", "tools"], label: "tools" });
  }
  if (request.parallelTools) {
    features.push({
      key: "parallelTools",
      layer: "model",
      path: ["request", "parallelTools"],
      label: "parallel tools",
    });
  }
  if (request.vision) {
    features.push({ key: "vision", layer: "model", path: ["request", "vision"], label: "vision" });
  }
  if (request.reasoning) {
    features.push({
      key: "reasoning",
      layer: "model",
      path: ["request", "reasoning"],
      label: "reasoning",
    });
  }
  return features;
}

function featureDiagnostic(
  layer: "runtime" | "model",
  feature: RequiredFeature,
  support: FeatureSupport,
  reason?: string,
  action?: string,
): DeploymentDiagnostic | undefined {
  if (support === "supported") {
    return undefined;
  }
  if (support === "unknown") {
    return {
      code: layer === "runtime" ? "runtime-feature-unknown" : "model-feature-unknown",
      severity: "info",
      path: feature.path,
      message: `${feature.label} is unknown on this ${layer} profile.`,
      reason: reason ?? "The shipped profile does not document this feature.",
      action: action ?? "Do not treat unknown as supported.",
      keyword: String(feature.key),
    };
  }
  if (support === "conditional") {
    return {
      code: "runtime-feature-conditional",
      severity: "warning",
      path: feature.path,
      message: `${feature.label} is conditional on this runtime.`,
      reason: reason ?? "The runtime supports this feature only with extra configuration.",
      action: action ?? "Confirm the documented runtime flag before sending the request.",
      keyword: String(feature.key),
    };
  }
  const unsupportedCode =
    feature.key === "statefulResponses"
      ? "stateful-responses-unsupported"
      : feature.key === "responses" ||
          feature.key === "chatCompletions" ||
          feature.key === "nativeChat"
        ? "endpoint-unsupported"
        : layer === "runtime"
          ? "runtime-feature-unsupported"
          : "model-feature-unsupported";
  const fixes: DeploymentFix[] =
    feature.key === "statefulResponses"
      ? [
          {
            preferred: true,
            message: "Send the full conversation state explicitly instead of previous_response_id.",
          },
        ]
      : [];
  return {
    code: unsupportedCode,
    severity: "error",
    path: feature.path,
    message: `This deployment does not support ${feature.label}.`,
    reason: reason ?? `The ${layer} profile marks ${feature.label} as unsupported.`,
    action: action ?? "Change the request surface or pick a different deployment.",
    keyword: String(feature.key),
    fixes: fixes.length > 0 ? fixes : undefined,
  };
}

function supportToCompatibility(support: FeatureSupport): Compatibility | undefined {
  if (support === "unsupported") {
    return "unsupported";
  }
  if (support === "conditional") {
    return "runtime-safe";
  }
  return undefined;
}

function coverageOf(
  runtimeProfiled: boolean,
  modelProfiled: boolean,
  diagnostics: readonly DeploymentDiagnostic[],
): RuntimeCoverage {
  if (!runtimeProfiled) {
    return "unknown";
  }
  const unknownFeature = diagnostics.some(
    (item) => item.code === "runtime-feature-unknown" || item.code === "model-feature-unknown",
  );
  const unresolved = diagnostics.some((item) => item.code === "schema-engine-unresolved");
  if (!modelProfiled || unknownFeature || unresolved) {
    return "partial";
  }
  return "profiled";
}

function collectFixes(diagnostics: readonly DeploymentDiagnostic[]): DeploymentFix[] {
  const fixes: DeploymentFix[] = [];
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
