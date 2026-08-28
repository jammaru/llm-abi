import type { TargetCapabilities } from "./types.ts";

/**
 * Shared conservative table for documented JSON-schema guided decoding
 * (vLLM xgrammar/guidance, SGLang XGrammar/Outlines/Llguidance).
 *
 * Official pages show `response_format.json_schema` with object / enum /
 * integer examples. They do not publish a keyword subset. Example-proven
 * constructs stay `supported`; everything else is `runtime-only` so we do
 * not copy OpenAI strict mode or invent unsupported rows.
 */
export const GUIDED_JSON_SCHEMA_CAPABILITIES: TargetCapabilities = {
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
  minItems: "runtime-only",
  maxItems: "runtime-only",
  uniqueItems: "runtime-only",
  prefixItems: "runtime-only",
  minProperties: "runtime-only",
  maxProperties: "runtime-only",
  enum: "supported",
  const: "runtime-only",
  integer: "supported",
  nullType: "runtime-only",
};
