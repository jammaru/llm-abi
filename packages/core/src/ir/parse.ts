import { SchemaLimitError } from "../errors.ts";
import { createRecord, isPlainObject, setRecord } from "../json/safe-record.ts";
import { MAX_DEPTH, MAX_ENUM_VALUES, MAX_NODES, MAX_PROPERTIES, MAX_REFS } from "../limits.ts";
import type { DiagnosticCode, JsonValue } from "../types.ts";
import type { ParseNote, SchemaDocument, SchemaNode } from "./types.ts";

const IGNORED_KEYS = new Set([
  "$schema",
  "$id",
  "$comment",
  "id",
  "examples",
  "readOnly",
  "writeOnly",
  "contentMediaType",
  "contentEncoding",
]);

const KNOWN_KEYS = new Set([
  "$schema",
  "$id",
  "$comment",
  "$ref",
  "$defs",
  "$def",
  "definitions",
  "id",
  "title",
  "description",
  "deprecated",
  "default",
  "examples",
  "type",
  "enum",
  "const",
  "properties",
  "required",
  "additionalProperties",
  "minProperties",
  "maxProperties",
  "items",
  "prefixItems",
  "additionalItems",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "anyOf",
  "oneOf",
  "allOf",
  "not",
  "nullable",
  "if",
  "then",
  "else",
  "dependentRequired",
  "dependentSchemas",
  "patternProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "propertyNames",
]);

interface ParseContext {
  nodes: number;
  refs: number;
  notes: ParseNote[];
  defs: Map<string, SchemaNode>;
  rootRaw: unknown;
  visiting: Set<string>;
  parsed: Map<string, SchemaNode>;
}

export function parseJsonSchema(input: unknown): SchemaDocument {
  const ctx: ParseContext = {
    nodes: 0,
    refs: 0,
    notes: [],
    defs: new Map(),
    rootRaw: input,
    visiting: new Set(),
    parsed: new Map(),
  };

  if (typeof input === "boolean") {
    return {
      root: input ? { kind: "any", path: [] } : { kind: "never", path: [] },
      defs: ctx.defs,
      dialect: "2020-12",
      notes: ctx.notes,
    };
  }

  if (!isPlainObject(input)) {
    throw new SchemaLimitError("JSON Schema input must be an object or boolean.", "invalid-schema");
  }

  const root = parseNode(input, [], "#", ctx, 0);
  noteUnusedRootDefs(input, ctx);
  return {
    root,
    defs: ctx.defs,
    dialect: dialectOf(input),
    notes: ctx.notes,
  };
}

function noteUnusedRootDefs(input: Record<string, unknown>, ctx: ParseContext): void {
  for (const keyword of ["$defs", "$def", "definitions"] as const) {
    const bag = input[keyword];
    if (!isPlainObject(bag)) {
      continue;
    }
    for (const name of Object.keys(bag).toSorted()) {
      const pointer = `#/${keyword}/${escapePointer(name)}`;
      if (ctx.defs.has(pointer)) {
        continue;
      }
      ctx.notes.push({
        path: [keyword, name],
        keyword,
        code: "unused-def-removed" satisfies DiagnosticCode,
        message: `Unused ${keyword} "${name}" was not compiled.`,
      });
    }
  }
}

function dialectOf(schema: Record<string, unknown>): SchemaDocument["dialect"] {
  const id = schema["$schema"];
  if (typeof id === "string" && id.includes("draft-07")) {
    return "draft-07";
  }
  return "2020-12";
}

function parseNode(
  input: unknown,
  path: readonly string[],
  pointer: string,
  ctx: ParseContext,
  depth: number,
): SchemaNode {
  if (depth > MAX_DEPTH) {
    throw new SchemaLimitError(
      `Schema exceeded max depth of ${MAX_DEPTH} at ${formatPath(path)}.`,
      "schema-too-deep",
    );
  }
  ctx.nodes += 1;
  if (ctx.nodes > MAX_NODES) {
    throw new SchemaLimitError(
      `Schema exceeded max node count of ${MAX_NODES}.`,
      "schema-too-large",
    );
  }

  if (typeof input === "boolean") {
    return input ? { kind: "any", path } : { kind: "never", path };
  }
  if (!isPlainObject(input)) {
    ctx.notes.push({
      path,
      keyword: "type",
      message: "Ignored non-object schema fragment; treated as any.",
    });
    return { kind: "any", path };
  }

  const cached = ctx.parsed.get(pointer);
  if (cached) {
    return cached;
  }

  if (typeof input["$ref"] === "string") {
    ctx.refs += 1;
    if (ctx.refs > MAX_REFS) {
      throw new SchemaLimitError(
        `Schema exceeded max $ref count of ${MAX_REFS}.`,
        "schema-too-large",
      );
    }
    return parseRef(input, path, pointer, ctx, depth);
  }

  for (const key of Object.keys(input)) {
    if (!KNOWN_KEYS.has(key) && !IGNORED_KEYS.has(key)) {
      ctx.notes.push({
        path,
        keyword: key,
        message: `Unknown JSON Schema keyword "${key}" was ignored.`,
      });
    }
  }

  for (const keyword of [
    "if",
    "then",
    "else",
    "dependentRequired",
    "dependentSchemas",
    "patternProperties",
    "unevaluatedProperties",
    "unevaluatedItems",
    "propertyNames",
    "not",
  ]) {
    if (keyword in input) {
      ctx.notes.push({
        path,
        keyword,
        message: `JSON Schema keyword "${keyword}" is not represented in the llm-abi IR.`,
      });
    }
  }

  const base = annotations(input, path);
  const combinators = parseCombinators(input, path, pointer, ctx, depth);
  if (combinators) {
    ctx.parsed.set(pointer, combinators);
    return combinators;
  }

  if (Array.isArray(input["enum"])) {
    if (input["enum"].length > MAX_ENUM_VALUES) {
      throw new SchemaLimitError(
        `Schema exceeded max enum size of ${MAX_ENUM_VALUES} at ${formatPath(path)}.`,
        "schema-too-large",
      );
    }
    const node: SchemaNode = {
      ...base,
      kind: "enum",
      values: input["enum"].map((value) => asJsonValue(value)),
    };
    ctx.parsed.set(pointer, node);
    return node;
  }

  if ("const" in input) {
    const node: SchemaNode = {
      ...base,
      kind: "literal",
      value: asJsonValue(input["const"]),
    };
    ctx.parsed.set(pointer, node);
    return node;
  }

  const types = normalizeTypes(input["type"]);
  const nullable = input["nullable"] === true;
  let node = parseByTypes(types, input, path, pointer, ctx, depth, base);
  if (nullable && node.kind !== "null") {
    node = {
      kind: "union",
      path,
      discriminant: "type-array",
      variants: [node, { kind: "null", path }],
      title: base.title,
      description: base.description,
    };
  }
  ctx.parsed.set(pointer, node);
  return node;
}

function parseRef(
  input: Record<string, unknown>,
  path: readonly string[],
  pointer: string,
  ctx: ParseContext,
  depth: number,
): SchemaNode {
  const ref = input["$ref"];
  if (typeof ref !== "string") {
    return { kind: "any", path };
  }
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    ctx.notes.push({
      path,
      keyword: "$ref",
      message: `External $ref "${ref}" is not supported.`,
    });
    return { kind: "ref", path, ref, cyclic: false };
  }
  const resolved = resolvePointer(ref);
  if (ctx.visiting.has(resolved)) {
    return { kind: "ref", path, ref: resolved, cyclic: true };
  }
  const raw = getByPointer(ctx.rootRaw, resolved);
  if (raw === undefined) {
    ctx.notes.push({
      path,
      keyword: "$ref",
      message: `Unresolved $ref "${ref}".`,
    });
    return { kind: "ref", path, ref: resolved, cyclic: false };
  }
  ctx.visiting.add(resolved);
  const node = parseNode(raw, path, resolved, ctx, depth + 1);
  ctx.visiting.delete(resolved);
  ctx.defs.set(resolved, node);
  ctx.parsed.set(pointer, node);
  return node;
}

function parseCombinators(
  input: Record<string, unknown>,
  path: readonly string[],
  pointer: string,
  ctx: ParseContext,
  depth: number,
): SchemaNode | undefined {
  const base = annotations(input, path);
  if (Array.isArray(input["anyOf"])) {
    return {
      ...base,
      kind: "union",
      discriminant: "anyOf",
      variants: input["anyOf"].map((item, index) =>
        parseNode(item, path, `${pointer}/anyOf/${index}`, ctx, depth + 1),
      ),
    };
  }
  if (Array.isArray(input["oneOf"])) {
    return {
      ...base,
      kind: "union",
      discriminant: "oneOf",
      variants: input["oneOf"].map((item, index) =>
        parseNode(item, path, `${pointer}/oneOf/${index}`, ctx, depth + 1),
      ),
    };
  }
  if (Array.isArray(input["allOf"])) {
    const parts = input["allOf"].map((item, index) =>
      parseNode(item, path, `${pointer}/allOf/${index}`, ctx, depth + 1),
    );
    const merged = mergeObjects(parts, path);
    if (merged) {
      ctx.notes.push({
        path,
        keyword: "allOf",
        message: "allOf object schemas were merged.",
      });
      return { ...merged, ...base, path };
    }
    return {
      ...base,
      kind: "intersection",
      parts,
    };
  }
  const types = normalizeTypes(input["type"]);
  if (types.length > 1) {
    return {
      ...base,
      kind: "union",
      discriminant: "type-array",
      variants: types.map((type) =>
        parseByTypes([type], { ...input, type }, path, pointer, ctx, depth, base),
      ),
    };
  }
  return undefined;
}

function parseByTypes(
  types: string[],
  input: Record<string, unknown>,
  path: readonly string[],
  pointer: string,
  ctx: ParseContext,
  depth: number,
  base: ReturnType<typeof annotations>,
): SchemaNode {
  const type = types[0];
  if (type === "null") {
    return { ...base, kind: "null" };
  }
  if (type === "boolean") {
    return { ...base, kind: "boolean" };
  }
  if (type === "string") {
    return {
      ...base,
      kind: "string",
      minLength: numberField(input["minLength"]),
      maxLength: numberField(input["maxLength"]),
      pattern: stringField(input["pattern"]),
      format: stringField(input["format"]),
    };
  }
  if (type === "number" || type === "integer") {
    return {
      ...base,
      kind: type,
      minimum: numberField(input["minimum"]),
      maximum: numberField(input["maximum"]),
      exclusiveMinimum: numberField(input["exclusiveMinimum"]),
      exclusiveMaximum: numberField(input["exclusiveMaximum"]),
      multipleOf: numberField(input["multipleOf"]),
    };
  }
  if (type === "array" || (type !== "object" && Array.isArray(input["prefixItems"]))) {
    return parseArray(input, path, pointer, ctx, depth, base);
  }
  if (type === "object" || isPlainObject(input["properties"]) || "additionalProperties" in input) {
    return parseObject(input, path, pointer, ctx, depth, base);
  }
  if (type !== "object" && "items" in input) {
    return parseArray(input, path, pointer, ctx, depth, base);
  }
  if (type === undefined) {
    return { ...base, kind: "any" };
  }
  ctx.notes.push({
    path,
    keyword: "type",
    message: `Unknown type "${type}" treated as any.`,
  });
  return { ...base, kind: "any" };
}

function parseObject(
  input: Record<string, unknown>,
  path: readonly string[],
  pointer: string,
  ctx: ParseContext,
  depth: number,
  base: ReturnType<typeof annotations>,
): SchemaNode {
  const properties = new Map<string, SchemaNode>();
  const rawProperties = isPlainObject(input["properties"]) ? input["properties"] : {};
  const propertyKeys = Object.keys(rawProperties);
  if (propertyKeys.length > MAX_PROPERTIES) {
    throw new SchemaLimitError(
      `Schema exceeded max property count of ${MAX_PROPERTIES} at ${formatPath(path)}.`,
      "schema-too-large",
    );
  }
  for (const key of propertyKeys) {
    properties.set(
      key,
      parseNode(
        rawProperties[key],
        [...path, key],
        `${pointer}/properties/${escapePointer(key)}`,
        ctx,
        depth + 1,
      ),
    );
  }
  const required = new Set<string>();
  if (Array.isArray(input["required"])) {
    for (const item of input["required"]) {
      if (typeof item === "string") {
        required.add(item);
      }
    }
  }
  let additionalProperties: boolean | SchemaNode = true;
  if (input["additionalProperties"] === false) {
    additionalProperties = false;
  } else if (input["additionalProperties"] === true) {
    additionalProperties = true;
  } else if (input["additionalProperties"] !== undefined) {
    additionalProperties = parseNode(
      input["additionalProperties"],
      [...path, "*"],
      `${pointer}/additionalProperties`,
      ctx,
      depth + 1,
    );
  }
  return {
    ...base,
    kind: "object",
    properties,
    required,
    additionalProperties,
    minProperties: numberField(input["minProperties"]),
    maxProperties: numberField(input["maxProperties"]),
  };
}

function parseArray(
  input: Record<string, unknown>,
  path: readonly string[],
  pointer: string,
  ctx: ParseContext,
  depth: number,
  base: ReturnType<typeof annotations>,
): SchemaNode {
  if (Array.isArray(input["prefixItems"])) {
    return {
      ...base,
      kind: "tuple",
      prefixItems: input["prefixItems"].map((item, index) =>
        parseNode(item, [...path, `[${index}]`], `${pointer}/prefixItems/${index}`, ctx, depth + 1),
      ),
      rest:
        input["items"] === false
          ? false
          : input["items"] !== undefined
            ? parseNode(input["items"], [...path, "[]"], `${pointer}/items`, ctx, depth + 1)
            : undefined,
      minItems: numberField(input["minItems"]),
      maxItems: numberField(input["maxItems"]),
    };
  }
  return {
    ...base,
    kind: "array",
    items: parseNode(input["items"] ?? true, [...path, "[]"], `${pointer}/items`, ctx, depth + 1),
    minItems: numberField(input["minItems"]),
    maxItems: numberField(input["maxItems"]),
    uniqueItems: input["uniqueItems"] === true,
  };
}

function mergeObjects(
  parts: SchemaNode[],
  path: readonly string[],
): Extract<SchemaNode, { kind: "object" }> | undefined {
  if (parts.length === 0 || parts.some((part) => part.kind !== "object")) {
    return undefined;
  }
  const properties = new Map<string, SchemaNode>();
  const required = new Set<string>();
  let additionalProperties: boolean | SchemaNode = true;
  for (const part of parts) {
    if (part.kind !== "object") {
      return undefined;
    }
    for (const [key, value] of part.properties) {
      properties.set(key, value);
    }
    for (const key of part.required) {
      required.add(key);
    }
    if (part.additionalProperties === false) {
      additionalProperties = false;
    }
  }
  return {
    kind: "object",
    path,
    properties,
    required,
    additionalProperties,
  };
}

function annotations(
  input: Record<string, unknown>,
  path: readonly string[],
): {
  path: readonly string[];
  title?: string;
  description?: string;
  deprecated?: boolean;
  default?: JsonValue;
} {
  return {
    path,
    title: stringField(input["title"]),
    description: stringField(input["description"]),
    deprecated: input["deprecated"] === true ? true : undefined,
    default: "default" in input ? asJsonValue(input["default"]) : undefined,
  };
}

function normalizeTypes(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => asJsonValue(item));
  }
  if (isPlainObject(value)) {
    const result = createRecord() as Record<string, JsonValue>;
    for (const key of Object.keys(value)) {
      setRecord(result, key, asJsonValue(value[key]));
    }
    return result;
  }
  return null;
}

function resolvePointer(ref: string): string {
  if (ref === "#") {
    return "#";
  }
  if (ref.startsWith("#/")) {
    return ref;
  }
  if (ref.startsWith("#")) {
    return `#/${ref.slice(1)}`;
  }
  return ref;
}

function getByPointer(root: unknown, pointer: string): unknown {
  if (pointer === "#") {
    return root;
  }
  if (!pointer.startsWith("#/")) {
    return undefined;
  }
  const parts = pointer
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  let current: unknown = root;
  for (const part of parts) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function formatPath(path: readonly string[]): string {
  return path.length === 0 ? "<root>" : path.join(".");
}
