import type { Diagnostic } from "./types.ts";
import type { SchemaDocument, SchemaNode } from "./ir/types.ts";
import { fingerprint } from "./fingerprint.ts";
import { parseInput } from "./input.ts";
import { measureSchema } from "./size.ts";
import type { Analysis, SchemaInput } from "./types.ts";

export function analyze(schema: SchemaInput): Analysis {
  const parsed = parseInput(schema);
  const stats = measure(parsed.document);
  const size = measureSchema(parsed.jsonSchema);
  const unusedDefs = parsed.document.notes.filter(
    (note) => note.code === "unused-def-removed",
  ).length;
  const notes: Diagnostic[] = parsed.document.notes.map((note) => ({
    code: note.code ?? "unsupported-keyword",
    severity: "info",
    path: note.path,
    keyword: note.keyword,
    message: note.message,
  }));
  return {
    fingerprint: fingerprint(schema),
    stats: {
      ...stats,
      unusedDefs,
      bytes: size.bytes,
      tokens: size.tokens,
    },
    notes,
  };
}

function measure(
  document: SchemaDocument,
): Pick<Analysis["stats"], "nodes" | "depth" | "properties" | "defs" | "constraints"> {
  let nodes = 0;
  let depth = 0;
  let properties = 0;
  let constraints = 0;

  const walk = (node: SchemaNode, current: number): void => {
    nodes += 1;
    depth = Math.max(depth, current);
    constraints += countConstraints(node);
    switch (node.kind) {
      case "object":
        properties += node.properties.size;
        for (const child of node.properties.values()) {
          walk(child, current + 1);
        }
        break;
      case "array":
        walk(node.items, current + 1);
        break;
      case "tuple":
        for (const item of node.prefixItems) {
          walk(item, current + 1);
        }
        break;
      case "union":
        for (const variant of node.variants) {
          walk(variant, current + 1);
        }
        break;
      case "intersection":
        for (const part of node.parts) {
          walk(part, current + 1);
        }
        break;
      default:
        break;
    }
  };

  walk(document.root, 1);
  return {
    nodes,
    depth,
    properties,
    defs: document.defs.size,
    constraints,
  };
}

function countConstraints(node: SchemaNode): number {
  const keys = [
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minItems",
    "maxItems",
    "uniqueItems",
    "minProperties",
    "maxProperties",
  ] as const;
  let count = 0;
  const record = node as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== false) {
      count += 1;
    }
  }
  return count;
}
