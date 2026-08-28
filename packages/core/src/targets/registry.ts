import { LlmAbiError } from "../errors.ts";
import type { ListTargetsOptions, ResolvedTarget, TargetId } from "../types.ts";
import { anthropicMessagesStructured } from "./anthropic.ts";
import { deepseekChatStrictTools } from "./deepseek.ts";
import { googleGeminiStructured } from "./gemini.ts";
import { mcp202606Tools } from "./mcp.ts";
import { mistralChatStructured } from "./mistral.ts";
import { openaiResponsesStructured } from "./openai.ts";
import { openrouterStructured } from "./openrouter.ts";
import { llamaCppServerStructured } from "./llamacpp.ts";
import { lmStudioGgufStructured, lmStudioMlxStructured } from "./lmstudio.ts";
import { ollamaChatStructured } from "./ollama.ts";
import { alibabaQwenTools } from "./qwen.ts";
import type { TargetProfile } from "./types.ts";
import { xaiGrokStructured } from "./xai.ts";

const PROFILES: readonly TargetProfile[] = [
  openaiResponsesStructured,
  anthropicMessagesStructured,
  googleGeminiStructured,
  deepseekChatStrictTools,
  xaiGrokStructured,
  alibabaQwenTools,
  mistralChatStructured,
  openrouterStructured,
  mcp202606Tools,
  llamaCppServerStructured,
  lmStudioGgufStructured,
  lmStudioMlxStructured,
  ollamaChatStructured,
];

const BY_ID = new Map<string, TargetProfile>();

for (const profile of PROFILES) {
  BY_ID.set(profile.id, profile);
  for (const alias of profile.aliases) {
    BY_ID.set(alias, profile);
  }
}

export function listTargets(options: ListTargetsOptions = {}): readonly ResolvedTarget[] {
  const scope = options.scope ?? "provider";
  const profiles =
    scope === "all"
      ? PROFILES
      : PROFILES.filter((profile) => (profile.scope ?? "provider") === scope);
  return profiles.map(toResolved);
}

export function getTargetProfile(id: TargetId): TargetProfile {
  const profile = BY_ID.get(id);
  if (!profile) {
    const known = PROFILES.map((item) => item.id).join(", ");
    throw new LlmAbiError(`Unknown target "${id}". Known targets: ${known}.`, "unknown-target");
  }
  return profile;
}

export function resolveTarget(id: TargetId): ResolvedTarget {
  return toResolved(getTargetProfile(id));
}

export function toResolved(profile: TargetProfile): ResolvedTarget {
  return {
    id: profile.id,
    vendor: profile.vendor,
    mode: profile.mode,
    revision: profile.revision,
    aliases: profile.aliases,
    maturity: profile.maturity,
    scope: profile.scope ?? "provider",
    evidence: {
      kind: profile.evidence,
      source: profile.evidenceSource,
      lastVerified: profile.lastVerified,
      live: profile.liveAdapter ? "nightly" : "not-configured",
    },
  };
}

export {
  openaiResponsesStructured,
  anthropicMessagesStructured,
  googleGeminiStructured,
  deepseekChatStrictTools,
  xaiGrokStructured,
  alibabaQwenTools,
  mistralChatStructured,
  openrouterStructured,
  mcp202606Tools,
  llamaCppServerStructured,
  lmStudioGgufStructured,
  lmStudioMlxStructured,
  ollamaChatStructured,
};
export type { TargetProfile, TargetCapabilities } from "./types.ts";
