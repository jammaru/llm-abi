import { SabiError } from "../errors.ts";
import type { ResolvedTarget, TargetId } from "../types.ts";
import { anthropicMessagesStructured } from "./anthropic.ts";
import { googleGeminiStructured } from "./gemini.ts";
import { openaiResponsesStructured } from "./openai.ts";
import type { TargetProfile } from "./types.ts";

const PROFILES: readonly TargetProfile[] = [
  openaiResponsesStructured,
  anthropicMessagesStructured,
  googleGeminiStructured,
];

const BY_ID = new Map<string, TargetProfile>();

for (const profile of PROFILES) {
  BY_ID.set(profile.id, profile);
  for (const alias of profile.aliases) {
    BY_ID.set(alias, profile);
  }
}

export function listTargets(): readonly ResolvedTarget[] {
  return PROFILES.map(toResolved);
}

export function resolveTarget(id: TargetId): TargetProfile {
  const profile = BY_ID.get(id);
  if (!profile) {
    const known = PROFILES.map((item) => item.id).join(", ");
    throw new SabiError(`Unknown target "${id}". Known targets: ${known}.`, "unknown-target");
  }
  return profile;
}

export function toResolved(profile: TargetProfile): ResolvedTarget {
  return {
    id: profile.id,
    vendor: profile.vendor,
    mode: profile.mode,
    revision: profile.revision,
    aliases: profile.aliases,
  };
}

export { openaiResponsesStructured, anthropicMessagesStructured, googleGeminiStructured };
export type { TargetProfile, TargetCapabilities } from "./types.ts";
