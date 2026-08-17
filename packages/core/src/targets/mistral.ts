import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";

/**
 * Mistral custom structured outputs.
 * Object policy is sdk-observed from the official client's
 * `rec_strict_json_schema` helper, which forces additionalProperties: false
 * and does not rewrite optional fields to required/nullable.
 * https://docs.mistral.ai/capabilities/structured-output/custom_structured_output/
 */
export const mistralChatStructured: TargetProfile = defineTarget({
  id: "mistral/chat/structured",
  aliases: ["mistral", "mistral/structured", "mistral/chat"],
  vendor: "mistral",
  mode: "structured",
  revision: "2026-08",
  dialect: "2020-12",
  evidence: "sdk-observed",
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
    additionalPropertiesTrue: "unsupported",
    additionalPropertiesSchema: "unsupported",
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
    additionalProperties: false,
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "unsupported",
});
