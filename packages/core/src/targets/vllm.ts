import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";
import { GUIDED_JSON_SCHEMA_CAPABILITIES } from "./guided-json-schema.ts";

/**
 * vLLM OpenAI-compatible structured output.
 * Docs show `response_format.json_schema` and extra_body structured_outputs.
 * Backend (xgrammar / guidance / outlines) is a server flag, not a keyword table.
 */
export const vllmOpenaiStructured: TargetProfile = defineTarget({
  id: "vllm/openai/structured",
  aliases: ["vllm", "vllm/structured"],
  vendor: "vllm",
  mode: "structured",
  revision: "2026-08",
  maturity: "experimental",
  dialect: "2020-12",
  evidence: "documented",
  evidenceSource: "https://docs.vllm.ai/en/stable/features/structured_outputs/",
  lastVerified: "2026-08-28",
  liveAdapter: false,
  scope: "runtime",
  capabilities: GUIDED_JSON_SCHEMA_CAPABILITIES,
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
