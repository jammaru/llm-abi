import type { ValidationIssue, ValidationResult } from "../types.ts";
import type { SchemaDocument, SchemaNode } from "../ir/types.ts";
import { tryMatchPattern } from "../json/pattern.ts";

export function validateDocument(
  document: SchemaDocument,
  value: unknown,
  options?: { readonly coerceOptionalNull?: boolean },
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const coerced =
    options?.coerceOptionalNull === false ? value : coerceOptionalNull(document.root, value);
  visit(document.root, coerced, [], document, issues, new Set());
  return { ok: issues.length === 0, issues };
}

function visit(
  node: SchemaNode,
  value: unknown,
  path: readonly string[],
  document: SchemaDocument,
  issues: ValidationIssue[],
  stack: Set<SchemaNode>,
): void {
  if (stack.has(node)) {
    return;
  }
  switch (node.kind) {
    case "any":
      return;
    case "never":
      issues.push({ path, message: "Value is not allowed." });
      return;
    case "null":
      if (value !== null) {
        issues.push({ path, message: "Expected null." });
      }
      return;
    case "boolean":
      if (typeof value !== "boolean") {
        issues.push({ path, message: "Expected boolean." });
      }
      return;
    case "string":
      visitString(node, value, path, issues);
      return;
    case "number":
    case "integer":
      visitNumber(node, value, path, issues);
      return;
    case "object":
      visitObject(node, value, path, document, issues, stack);
      return;
    case "array":
      visitArray(node, value, path, document, issues, stack);
      return;
    case "tuple":
      visitTuple(node, value, path, document, issues, stack);
      return;
    case "enum":
      if (!node.values.some((item) => sameValue(item, value))) {
        issues.push({ path, message: "Value is not in the enum." });
      }
      return;
    case "literal":
      if (!sameValue(node.value, value)) {
        issues.push({ path, message: "Value does not match const." });
      }
      return;
    case "union":
      visitUnion(node, value, path, document, issues, stack);
      return;
    case "intersection":
      stack.add(node);
      for (const part of node.parts) {
        visit(part, value, path, document, issues, stack);
      }
      stack.delete(node);
      return;
    case "ref": {
      const target = document.defs.get(node.ref);
      if (!target) {
        issues.push({ path, message: `Unresolved $ref ${node.ref}.` });
        return;
      }
      stack.add(node);
      visit(target, value, path, document, issues, stack);
      stack.delete(node);
    }
  }
}

function visitString(
  node: Extract<SchemaNode, { kind: "string" }>,
  value: unknown,
  path: readonly string[],
  issues: ValidationIssue[],
): void {
  if (typeof value !== "string") {
    issues.push({ path, message: "Expected string." });
    return;
  }
  if (node.minLength !== undefined && value.length < node.minLength) {
    issues.push({ path, message: `String shorter than ${node.minLength}.` });
  }
  if (node.maxLength !== undefined && value.length > node.maxLength) {
    issues.push({ path, message: `String longer than ${node.maxLength}.` });
  }
  if (node.pattern) {
    const match = tryMatchPattern(node.pattern, value);
    if (!match.skipped && !match.ok) {
      issues.push({ path, message: `String does not match ${node.pattern}.` });
    }
  }
}

function visitNumber(
  node: Extract<SchemaNode, { kind: "number" | "integer" }>,
  value: unknown,
  path: readonly string[],
  issues: ValidationIssue[],
): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ path, message: "Expected number." });
    return;
  }
  if (node.kind === "integer" && !Number.isInteger(value)) {
    issues.push({ path, message: "Expected integer." });
  }
  if (node.minimum !== undefined && value < node.minimum) {
    issues.push({ path, message: `Must be >= ${node.minimum}.` });
  }
  if (node.maximum !== undefined && value > node.maximum) {
    issues.push({ path, message: `Must be <= ${node.maximum}.` });
  }
  if (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum) {
    issues.push({ path, message: `Must be > ${node.exclusiveMinimum}.` });
  }
  if (node.exclusiveMaximum !== undefined && value >= node.exclusiveMaximum) {
    issues.push({ path, message: `Must be < ${node.exclusiveMaximum}.` });
  }
  if (node.multipleOf !== undefined && node.multipleOf !== 0) {
    const quotient = value / node.multipleOf;
    if (Math.abs(quotient - Math.round(quotient)) > 1e-10) {
      issues.push({ path, message: `Must be a multiple of ${node.multipleOf}.` });
    }
  }
}

function visitObject(
  node: Extract<SchemaNode, { kind: "object" }>,
  value: unknown,
  path: readonly string[],
  document: SchemaDocument,
  issues: ValidationIssue[],
  stack: Set<SchemaNode>,
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    issues.push({ path, message: "Expected object." });
    return;
  }
  const record = value as Record<string, unknown>;
  for (const key of node.required) {
    if (!(key in record)) {
      issues.push({ path: [...path, key], message: "Required property is missing." });
    }
  }
  for (const [key, schema] of node.properties) {
    if (key in record) {
      visit(schema, record[key], [...path, key], document, issues, stack);
    }
  }
  if (node.additionalProperties === false) {
    for (const key of Object.keys(record)) {
      if (!node.properties.has(key)) {
        issues.push({ path: [...path, key], message: "Additional property is not allowed." });
      }
    }
  } else if (typeof node.additionalProperties !== "boolean") {
    for (const key of Object.keys(record)) {
      if (!node.properties.has(key)) {
        visit(node.additionalProperties, record[key], [...path, key], document, issues, stack);
      }
    }
  }
  const count = Object.keys(record).length;
  if (node.minProperties !== undefined && count < node.minProperties) {
    issues.push({ path, message: `Must have at least ${node.minProperties} properties.` });
  }
  if (node.maxProperties !== undefined && count > node.maxProperties) {
    issues.push({ path, message: `Must have at most ${node.maxProperties} properties.` });
  }
}

function visitArray(
  node: Extract<SchemaNode, { kind: "array" }>,
  value: unknown,
  path: readonly string[],
  document: SchemaDocument,
  issues: ValidationIssue[],
  stack: Set<SchemaNode>,
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected array." });
    return;
  }
  if (node.minItems !== undefined && value.length < node.minItems) {
    issues.push({ path, message: `Must have at least ${node.minItems} items.` });
  }
  if (node.maxItems !== undefined && value.length > node.maxItems) {
    issues.push({ path, message: `Must have at most ${node.maxItems} items.` });
  }
  for (let index = 0; index < value.length; index += 1) {
    visit(node.items, value[index], [...path, String(index)], document, issues, stack);
  }
  if (node.uniqueItems) {
    const seen = new Set<string>();
    for (const item of value) {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        issues.push({ path, message: "Items must be unique." });
        break;
      }
      seen.add(key);
    }
  }
}

function visitTuple(
  node: Extract<SchemaNode, { kind: "tuple" }>,
  value: unknown,
  path: readonly string[],
  document: SchemaDocument,
  issues: ValidationIssue[],
  stack: Set<SchemaNode>,
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected tuple array." });
    return;
  }
  for (let index = 0; index < node.prefixItems.length; index += 1) {
    visit(
      node.prefixItems[index]!,
      value[index],
      [...path, String(index)],
      document,
      issues,
      stack,
    );
  }
  if (typeof node.rest === "object") {
    for (let index = node.prefixItems.length; index < value.length; index += 1) {
      visit(node.rest, value[index], [...path, String(index)], document, issues, stack);
    }
  } else if (node.rest === false && value.length > node.prefixItems.length) {
    issues.push({ path, message: "Tuple has extra items." });
  }
}

function visitUnion(
  node: Extract<SchemaNode, { kind: "union" }>,
  value: unknown,
  path: readonly string[],
  document: SchemaDocument,
  issues: ValidationIssue[],
  stack: Set<SchemaNode>,
): void {
  const matches: number[] = [];
  for (let index = 0; index < node.variants.length; index += 1) {
    const nested: ValidationIssue[] = [];
    visit(node.variants[index]!, value, path, document, nested, stack);
    if (nested.length === 0) {
      matches.push(index);
    }
  }
  if (node.discriminant === "oneOf") {
    if (matches.length !== 1) {
      issues.push({
        path,
        message: `Value matched ${matches.length} oneOf variants.`,
      });
    }
    return;
  }
  if (matches.length === 0) {
    issues.push({ path, message: "Value did not match any union variant." });
  }
}

function coerceOptionalNull(node: SchemaNode, value: unknown): unknown {
  if (node.kind === "array") {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((item) => coerceOptionalNull(node.items, item));
  }
  if (node.kind === "tuple") {
    if (!Array.isArray(value)) {
      return value;
    }
    return value.map((item, index) => {
      if (index < node.prefixItems.length) {
        return coerceOptionalNull(node.prefixItems[index]!, item);
      }
      if (typeof node.rest === "object") {
        return coerceOptionalNull(node.rest, item);
      }
      return item;
    });
  }
  if (node.kind === "union") {
    return value;
  }
  if (
    node.kind !== "object" ||
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return value;
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = { ...record };
  for (const [key, schema] of node.properties) {
    if (result[key] === null && !node.required.has(key)) {
      delete result[key];
      continue;
    }
    if (key in result) {
      result[key] = coerceOptionalNull(schema, result[key]);
    }
  }
  if (typeof node.additionalProperties === "object") {
    for (const key of Object.keys(result)) {
      if (!node.properties.has(key)) {
        result[key] = coerceOptionalNull(node.additionalProperties, result[key]);
      }
    }
  }
  return result;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
