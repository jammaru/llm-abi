import type { TargetCapabilities } from "./types.ts";

/**
 * llama.cpp JSON Schema → GBNF limits from
 * https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md
 *
 * Integer-only numeric bounds are `runtime-only` so number bounds are not
 * claimed as provider-enforced. Nested `$ref` is documented broken, so refs
 * stay runtime-only rather than supported.
 */
export const LLAMA_CPP_GRAMMAR_CAPABILITIES: TargetCapabilities = {
  anyOf: "unsupported",
  oneOf: "unsupported",
  allOf: "unsupported",
  not: "unsupported",
  refs: "runtime-only",
  recursiveRefs: "unsupported",
  defs: "runtime-only",
  nullableTypeArray: "runtime-only",
  optionalProperties: "supported",
  additionalPropertiesTrue: "supported",
  additionalPropertiesSchema: "runtime-only",
  pattern: "runtime-only",
  format: "runtime-only",
  minLength: "supported",
  maxLength: "supported",
  minimum: "runtime-only",
  maximum: "runtime-only",
  exclusiveMinimum: "runtime-only",
  exclusiveMaximum: "runtime-only",
  multipleOf: "runtime-only",
  minItems: "supported",
  maxItems: "supported",
  uniqueItems: "unsupported",
  prefixItems: "unsupported",
  minProperties: "runtime-only",
  maxProperties: "runtime-only",
  enum: "supported",
  const: "supported",
  integer: "supported",
  nullType: "supported",
};
