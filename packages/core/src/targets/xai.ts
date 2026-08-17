import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";

const FORMATS = new Set(["date", "time", "date-time", "email", "uuid", "ipv4", "ipv6", "uri"]);

/**
 * xAI Grok structured outputs and tool arguments.
 * Documented at https://docs.x.ai/developers/model-capabilities/text/structured-outputs
 * (revision 2026-08).
 */
export const xaiGrokStructured: TargetProfile = defineTarget({
  id: "xai/grok/structured",
  aliases: ["xai", "grok", "xai/grok", "xai/structured", "grok/structured"],
  vendor: "xai",
  mode: "structured",
  revision: "2026-08",
  dialect: "2020-12",
  evidence: "documented",
  capabilities: {
    anyOf: "supported",
    oneOf: "lossy",
    allOf: "runtime-only",
    not: "unsupported",
    refs: "supported",
    recursiveRefs: "unsupported",
    defs: "supported",
    nullableTypeArray: "supported",
    optionalProperties: "supported",
    additionalPropertiesTrue: "supported",
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
    uniqueItems: "runtime-only",
    prefixItems: "supported",
    minProperties: "supported",
    maxProperties: "supported",
    enum: "supported",
    const: "supported",
    integer: "supported",
    nullType: "supported",
  },
  formats: FORMATS,
  limits: {
    enforced: {
      minLength: 2048,
      maxLength: 2048,
      minItems: 256,
      maxItems: 256,
      minProperties: 64,
      maxProperties: 64,
    },
  },
  objectPolicy: {
    additionalProperties: "omit-false",
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "unsupported",
});
