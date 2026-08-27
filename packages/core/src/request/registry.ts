import { LlmAbiError } from "../errors.ts";
import { openaiGpt56Request } from "./openai.ts";
import type { RequestProfile, ResolvedRequestProfile } from "./types.ts";

const PROFILES: readonly RequestProfile[] = [openaiGpt56Request];

const BY_ID = new Map<string, RequestProfile>();
const BY_PROVIDER = new Map<string, RequestProfile[]>();

for (const profile of PROFILES) {
  BY_ID.set(profile.id, profile);
  for (const provider of profile.providers) {
    const list = BY_PROVIDER.get(provider) ?? [];
    list.push(profile);
    BY_PROVIDER.set(provider, list);
  }
}

export function listRequestProfiles(): readonly ResolvedRequestProfile[] {
  return PROFILES.map(toResolvedRequest);
}

export function resolveRequestProfile(id: string): RequestProfile {
  const profile = BY_ID.get(id);
  if (!profile) {
    const known = PROFILES.map((item) => item.id).join(", ");
    throw new LlmAbiError(
      `Unknown request profile "${id}". Known request profiles: ${known}.`,
      "unknown-request-profile",
    );
  }
  return profile;
}

export function findRequestProfile(provider: string, model: string): RequestProfile | undefined {
  const profiles = BY_PROVIDER.get(provider);
  if (!profiles) {
    return undefined;
  }
  for (const profile of profiles) {
    if (matchesModel(profile, model)) {
      return profile;
    }
  }
  return undefined;
}

export function toResolvedRequest(profile: RequestProfile): ResolvedRequestProfile {
  return {
    id: profile.id,
    vendor: profile.vendor,
    family: profile.family,
    revision: profile.revision,
    evidence: profile.evidence,
    providers: profile.providers,
  };
}

export function matchesModel(profile: RequestProfile, model: string): boolean {
  for (const id of profile.models.exact) {
    if (model === id) {
      return true;
    }
  }
  for (const prefix of profile.models.prefixes) {
    if (model.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

export { openaiGpt56Request };
export type { RequestProfile } from "./types.ts";
