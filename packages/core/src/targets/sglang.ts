import { defineTarget } from "./types.ts";
import type { TargetCapabilities, TargetProfile } from "./types.ts";
import { GUIDED_JSON_SCHEMA_CAPABILITIES } from "./guided-json-schema.ts";

/**
 * SGLang OpenAI-compatible structured output.
 * Official examples include object, integer, required, and string pattern.
 * Grammar backend is a server flag. Do not copy OpenAI strict mode.
 */
const SGLANG_CAPABILITIES: TargetCapabilities = {
  ...GUIDED_JSON_SCHEMA_CAPABILITIES,
  pattern: "supported",
};

export const sglangOpenaiStructured: TargetProfile = defineTarget({
  id: "sglang/openai/structured",
  aliases: ["sglang", "sglang/structured"],
  vendor: "sglang",
  mode: "structured",
  revision: "2026-08",
  maturity: "experimental",
  dialect: "2020-12",
  evidence: "documented",
  evidenceSource: "https://docs.sglang.io/docs/advanced_features/structured_outputs.md",
  lastVerified: "2026-08-28",
  liveAdapter: false,
  scope: "runtime",
  capabilities: SGLANG_CAPABILITIES,
  formats: new Set(),
  limits: {},
  objectPolicy: {
    additionalProperties: "preserve",
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "runtime-only",
});
