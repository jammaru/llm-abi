import { canonicalize } from "./json/canonicalize.ts";
import type { Diagnostic, SchemaSize } from "./types.ts";
import type { TargetProfile } from "./targets/types.ts";

const encoder = new TextEncoder();

/**
 * Conservative token hint for schema/tool overhead.
 * Uses UTF-8 bytes of canonical JSON divided by 3, rounded up.
 * JSON is denser than English, so a 4-chars-per-token guess would under-count.
 * This is not a billing API and not a compatibility percentage.
 */
export function measureSchema(value: unknown): SchemaSize {
  const canonical = canonicalize(value);
  const bytes = encoder.encode(canonical).byteLength;
  return {
    bytes,
    tokens: bytes === 0 ? 0 : Math.ceil(bytes / 3),
  };
}

export function budgetDiagnostic(size: SchemaSize, profile: TargetProfile): Diagnostic | undefined {
  const budget = profile.limits.maxStringBudget;
  if (budget === undefined || size.bytes <= budget) {
    return undefined;
  }
  return {
    code: "string-budget-exceeded",
    severity: "warning",
    path: [],
    keyword: "size",
    message: `Emitted schema is ${String(size.bytes)} UTF-8 bytes; ${profile.id} documents a ${String(budget)} character budget.`,
    action: "Split the schema or drop unused descriptions. Compatibility is unchanged.",
  };
}
