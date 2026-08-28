import { LLAMA_CPP_GRAMMAR_CAPABILITIES } from "./llama-cpp-grammar.ts";
import { defineTarget } from "./types.ts";
import type { TargetCapabilities, TargetProfile } from "./types.ts";

/**
 * LM Studio GGUF structured output uses llama.cpp grammar-based sampling.
 * The keyword table is inherited from the llama.cpp grammar README; LM Studio
 * documents the engine mapping, not the keyword subset.
 */
export const lmStudioGgufStructured: TargetProfile = defineTarget({
  id: "lmstudio/gguf/structured",
  aliases: ["lmstudio/gguf"],
  vendor: "lmstudio",
  mode: "structured",
  revision: "2026-08",
  maturity: "experimental",
  dialect: "2020-12",
  evidence: "documented",
  evidenceSource: "https://lmstudio.ai/docs/developer/openai-compat/structured-output",
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

/**
 * LM Studio MLX structured output uses Outlines. No keyword table is
 * documented, so only example-proven constructs are `supported`.
 */
const LM_STUDIO_MLX_CAPABILITIES: TargetCapabilities = {
  anyOf: "runtime-only",
  oneOf: "runtime-only",
  allOf: "runtime-only",
  not: "runtime-only",
  refs: "runtime-only",
  recursiveRefs: "runtime-only",
  defs: "runtime-only",
  nullableTypeArray: "runtime-only",
  optionalProperties: "supported",
  additionalPropertiesTrue: "runtime-only",
  additionalPropertiesSchema: "runtime-only",
  pattern: "runtime-only",
  format: "runtime-only",
  minLength: "runtime-only",
  maxLength: "runtime-only",
  minimum: "runtime-only",
  maximum: "runtime-only",
  exclusiveMinimum: "runtime-only",
  exclusiveMaximum: "runtime-only",
  multipleOf: "runtime-only",
  minItems: "supported",
  maxItems: "runtime-only",
  uniqueItems: "runtime-only",
  prefixItems: "runtime-only",
  minProperties: "runtime-only",
  maxProperties: "runtime-only",
  enum: "runtime-only",
  const: "runtime-only",
  integer: "supported",
  nullType: "runtime-only",
};

export const lmStudioMlxStructured: TargetProfile = defineTarget({
  id: "lmstudio/mlx/structured",
  aliases: ["lmstudio/mlx"],
  vendor: "lmstudio",
  mode: "structured",
  revision: "2026-08",
  maturity: "experimental",
  dialect: "2020-12",
  evidence: "documented",
  evidenceSource: "https://lmstudio.ai/docs/developer/openai-compat/structured-output",
  lastVerified: "2026-08-28",
  liveAdapter: false,
  scope: "runtime",
  capabilities: LM_STUDIO_MLX_CAPABILITIES,
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
