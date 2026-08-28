import { LlmAbiError } from "../../errors.ts";
import { looksLikeQwen38Family, modelMatchKeys } from "./identity.ts";
import { qwen38Model } from "./qwen38.ts";
import type { ModelProfile, ResolvedModelProfile } from "../types.ts";

const PROFILES: readonly ModelProfile[] = [qwen38Model];

const BY_ID = new Map<string, ModelProfile>();

for (const profile of PROFILES) {
  BY_ID.set(profile.id, profile);
}

export function listModelProfiles(): readonly ResolvedModelProfile[] {
  return PROFILES.map(toResolvedModel);
}

export function resolveModelProfile(id: string): ResolvedModelProfile {
  const profile = BY_ID.get(id);
  if (!profile) {
    const known = PROFILES.map((item) => item.id).join(", ");
    throw new LlmAbiError(
      `Unknown model profile "${id}". Known model profiles: ${known}.`,
      "unknown-model-profile",
    );
  }
  return toResolvedModel(profile);
}

export function findModelProfile(modelId: string, family?: string): ModelProfile | undefined {
  for (const profile of PROFILES) {
    if (modelProfileMatches(profile, modelId, family)) {
      return profile;
    }
  }
  return undefined;
}

export function modelProfileMatches(
  profile: ModelProfile,
  modelId: string,
  family?: string,
): boolean {
  const keys = modelMatchKeys(modelId);
  for (const exact of profile.match.exact ?? []) {
    if (keys.includes(exact)) {
      return true;
    }
  }
  for (const prefix of profile.match.prefixes ?? []) {
    if (keys.some((key) => key.startsWith(prefix))) {
      return true;
    }
  }
  if (family) {
    const normalized = family.trim().toLowerCase();
    for (const allowed of profile.match.family ?? []) {
      if (normalized === allowed && looksLikeQwen38Family(normalized)) {
        return true;
      }
    }
  }
  return false;
}

export function toResolvedModel(profile: ModelProfile): ResolvedModelProfile {
  return {
    id: profile.id,
    family: profile.family,
    revision: profile.revision,
    evidence: profile.evidence,
  };
}
