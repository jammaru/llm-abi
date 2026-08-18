import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";

/**
 * OpenRouter structured outputs gateway.
 * Documented at https://openrouter.ai/docs/guides/features/structured-outputs
 * (revision 2026-08).
 *
 * Enforcement varies by routed provider. This profile does not copy OpenAI
 * strict-mode required-all objects.
 */
export const openrouterStructured: TargetProfile = defineTarget({
  id: "openrouter/structured",
  aliases: ["openrouter", "openrouter/json-schema"],
  vendor: "openrouter",
  mode: "structured",
  revision: "2026-08",
  maturity: "partial",
  dialect: "2020-12",
  evidence: "documented",
  evidenceSource: "https://openrouter.ai/docs/guides/features/structured-outputs",
  lastVerified: "2026-08-18",
  liveAdapter: false,
  compatibilityCeiling: "runtime-safe",
  capabilities: {
    anyOf: "supported",
    oneOf: "supported",
    allOf: "unsupported",
    not: "unsupported",
    refs: "supported",
    recursiveRefs: "supported",
    defs: "supported",
    nullableTypeArray: "supported",
    optionalProperties: "supported",
    additionalPropertiesTrue: "supported",
    additionalPropertiesSchema: "supported",
    pattern: "supported",
    format: "supported",
    minLength: "supported",
    maxLength: "supported",
    minimum: "supported",
    maximum: "supported",
    exclusiveMinimum: "supported",
    exclusiveMaximum: "supported",
    multipleOf: "supported",
    minItems: "supported",
    maxItems: "supported",
    uniqueItems: "supported",
    prefixItems: "supported",
    minProperties: "supported",
    maxProperties: "supported",
    enum: "supported",
    const: "supported",
    integer: "supported",
    nullType: "supported",
  },
  formats: "any",
  limits: {},
  objectPolicy: {
    additionalProperties: "preserve",
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "unsupported",
});
