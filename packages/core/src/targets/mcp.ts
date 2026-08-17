import { defineTarget } from "./types.ts";
import type { TargetProfile } from "./types.ts";

/**
 * MCP tool `inputSchema` host subset — not an MCP SDK and not OpenAI strict mode.
 *
 * Published 2025-11-25 `Tool.inputSchema` is `type: "object"` plus `properties`
 * and `required`. SEP-2106 later widens the protocol to JSON Schema 2020-12
 * inside that object root, but Claude Desktop / Claude Code still commonly
 * reject `$ref`, `oneOf`, and non-object roots. This profile compiles to the
 * host-safe subset and diagnoses the rest.
 *
 * Documented at https://modelcontextprotocol.io (revision 2026-08).
 */
export const mcp202606Tools: TargetProfile = defineTarget({
  id: "mcp/2026-06/tools",
  aliases: ["mcp", "mcp/tools", "mcp/2025-11/tools"],
  vendor: "mcp",
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
