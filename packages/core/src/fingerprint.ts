import { sha256Hex } from "./hash/sha256.ts";
import { canonicalize } from "./json/canonicalize.ts";
import { parseInput } from "./input.ts";
import type { SchemaInput } from "./types.ts";

export function fingerprint(schema: SchemaInput): string {
  const parsed = parseInput(schema);
  return fingerprintJson(parsed.jsonSchema);
}

export function fingerprintJson(value: unknown): string {
  return `sha256:${sha256Hex(canonicalize(value))}`;
}
