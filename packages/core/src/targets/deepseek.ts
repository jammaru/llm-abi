import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";

const FORMATS = new Set(["email", "hostname", "ipv4", "ipv6", "uuid"]);

/**
 * DeepSeek Beta `strict: true` tool parameters.
 * Documented at https://api-docs.deepseek.com/guides/tool_calls (revision 2026-08).
 */
export const deepseekChatStrictTools: TargetProfile = defineTarget({
  id: "deepseek/chat/strict-tools",
  aliases: ["deepseek", "deepseek/strict", "deepseek/chat/tools"],
  vendor: "deepseek",
  mode: "strict-tools",
  revision: "2026-08",
  dialect: "2020-12",
  evidence: "documented",
  defsKeyword: "$def",
  capabilities: {
    anyOf: "supported",
    oneOf: "lossy",
    allOf: "unsupported",
    not: "unsupported",
    refs: "supported",
    recursiveRefs: "supported",
    defs: "supported",
    nullableTypeArray: "unsupported",
    optionalProperties: "lossy",
    additionalPropertiesTrue: "unsupported",
    additionalPropertiesSchema: "unsupported",
    pattern: "supported",
    format: "supported",
    minLength: "runtime-only",
    maxLength: "runtime-only",
    minimum: "supported",
    maximum: "supported",
    exclusiveMinimum: "supported",
    exclusiveMaximum: "supported",
    multipleOf: "supported",
    minItems: "runtime-only",
    maxItems: "runtime-only",
    uniqueItems: "runtime-only",
    prefixItems: "unsupported",
    minProperties: "runtime-only",
    maxProperties: "runtime-only",
    enum: "supported",
    const: "supported",
    integer: "supported",
    nullType: "unsupported",
  },
  formats: FORMATS,
  limits: {},
  objectPolicy: {
    additionalProperties: false,
    requireAllProperties: true,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "unsupported",
});
