import { LlmAbiError } from "../../errors.ts";
import { llamaCppRuntime } from "./llamacpp.ts";
import { lmStudioGgufRuntime, lmStudioMlxRuntime } from "./lmstudio.ts";
import { mlxLmRuntime } from "./mlx-lm.ts";
import { ollamaRuntime } from "./ollama.ts";
import type { DeploymentDescriptor, ResolvedRuntimeProfile, RuntimeProfile } from "../types.ts";

const PROFILES: readonly RuntimeProfile[] = [
  lmStudioGgufRuntime,
  lmStudioMlxRuntime,
  ollamaRuntime,
  llamaCppRuntime,
  mlxLmRuntime,
];

const BY_ID = new Map<string, RuntimeProfile>();

for (const profile of PROFILES) {
  BY_ID.set(profile.id, profile);
}

export function listRuntimeProfiles(): readonly ResolvedRuntimeProfile[] {
  return PROFILES.map(toResolvedRuntime);
}

export function resolveRuntimeProfile(id: string): ResolvedRuntimeProfile {
  const profile = BY_ID.get(id);
  if (!profile) {
    const known = PROFILES.map((item) => item.id).join(", ");
    throw new LlmAbiError(
      `Unknown runtime profile "${id}". Known runtime profiles: ${known}.`,
      "unknown-runtime-profile",
    );
  }
  return toResolvedRuntime(profile);
}

export function getRuntimeProfile(id: string): RuntimeProfile {
  const profile = BY_ID.get(id);
  if (!profile) {
    throw new LlmAbiError(`Unknown runtime profile "${id}".`, "unknown-runtime-profile");
  }
  return profile;
}

export function findRuntimeProfile(deployment: DeploymentDescriptor): RuntimeProfile | undefined {
  for (const profile of PROFILES) {
    if (runtimeProfileMatches(profile, deployment)) {
      return profile;
    }
  }
  return undefined;
}

export function runtimeKindKnown(deployment: DeploymentDescriptor): boolean {
  return PROFILES.some((profile) => profile.runtime === deployment.runtime.kind);
}

export function runtimeProfileMatches(
  profile: RuntimeProfile,
  deployment: DeploymentDescriptor,
): boolean {
  if (profile.runtime !== deployment.runtime.kind) {
    return false;
  }
  const match = profile.match;
  if (match.apiSurface && deployment.runtime.apiSurface !== "mixed") {
    if (deployment.runtime.apiSurface !== match.apiSurface) {
      return false;
    }
  }
  if (match.modelFormats && match.modelFormats.length > 0) {
    const format = deployment.model.format ?? "unknown";
    if (format === "unknown" || !match.modelFormats.includes(format)) {
      return false;
    }
  }
  const engine = deployment.runtime.engine?.kind;
  if (engine && match.engines && match.engines.length > 0 && !match.engines.includes(engine)) {
    return false;
  }
  return true;
}

export function toResolvedRuntime(profile: RuntimeProfile): ResolvedRuntimeProfile {
  return {
    id: profile.id,
    runtime: profile.runtime,
    revision: profile.revision,
    evidence: profile.evidence,
    evidenceSource: profile.evidenceSource,
    lastVerified: profile.lastVerified,
    schemaTarget: profile.schemaTarget,
  };
}
