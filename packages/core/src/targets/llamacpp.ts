import { LLAMA_CPP_GRAMMAR_CAPABILITIES } from "./llama-cpp-grammar.ts";
import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";

/**
 * llama.cpp server structured output (`response_format` JSON Schema → GBNF).
 * Keyword table is from the grammar README, not an OpenAI-strict subset.
 */
export const llamaCppServerStructured: TargetProfile = defineTarget({
  id: "llamacpp/server/structured",
  aliases: ["llamacpp", "llama.cpp", "llamacpp/structured"],
  vendor: "llamacpp",
  mode: "structured",
  revision: "2026-08",
  maturity: "experimental",
  dialect: "2020-12",
  evidence: "documented",
  evidenceSource: "https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md",
  lastVerified: "2026-08-28",
  liveAdapter: false,
  scope: "runtime",
  capabilities: LLAMA_CPP_GRAMMAR_CAPABILITIES,
  formats: new Set(),
  limits: {},
  objectPolicy: {
    additionalProperties: false,
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: false,
  rootAnyOf: "unsupported",
});
