import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";

/**
 * Alibaba Qwen tool parameters and JSON Schema structured output.
 * Documented at https://help.aliyun.com/en/model-studio/qwen-structured-output
 * and https://help.aliyun.com/en/model-studio/qwen-function-calling (revision 2026-08).
 */
export const alibabaQwenTools: TargetProfile = defineTarget({
  id: "alibaba/qwen/tools",
  aliases: ["qwen", "alibaba", "alibaba/qwen", "qwen/tools"],
  vendor: "alibaba",
  mode: "tools",
  revision: "2026-08",
  dialect: "2020-12",
  evidence: "documented",
  capabilities: {
    anyOf: "unsupported",
    oneOf: "unsupported",
    allOf: "unsupported",
    not: "unsupported",
    refs: "unsupported",
    recursiveRefs: "unsupported",
    defs: "unsupported",
    nullableTypeArray: "supported",
    optionalProperties: "supported",
    additionalPropertiesTrue: "supported",
    additionalPropertiesSchema: "unsupported",
    pattern: "runtime-only",
    format: "supported",
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
    prefixItems: "unsupported",
    minProperties: "runtime-only",
    maxProperties: "runtime-only",
    enum: "supported",
    const: "unsupported",
    integer: "supported",
    nullType: "supported",
  },
  formats: new Set(),
  limits: {},
  objectPolicy: {
    additionalProperties: "preserve",
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "unsupported",
});
