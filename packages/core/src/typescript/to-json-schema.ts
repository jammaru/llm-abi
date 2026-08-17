import { LlmAbiError } from "../errors.ts";
import { createRecord, setRecord } from "../json/safe-record.ts";
import { MAX_STRING_BUDGET } from "../limits.ts";
import type { JsonSchema, JsonSchemaObject } from "../types.ts";
import { parseTypeScript } from "./parse.ts";
import type { PrimitiveName, TsDecl, TsType } from "./parse.ts";

export interface TypeScriptInputOptions {
  readonly typeName?: string;
}

export function typeScriptToJsonSchema(
  source: string,
  options: TypeScriptInputOptions = {},
): JsonSchema {
  if (source.length > MAX_STRING_BUDGET) {
    throw new LlmAbiError(
      `TypeScript input exceeded max length of ${String(MAX_STRING_BUDGET)} characters.`,
      "schema-too-large",
    );
  }
  const decls = mergeInterfaces(parseTypeScript(source));
  const selected = selectDecl(decls, options.typeName);
  const names = new Set(decls.map((decl) => decl.name));
  const defs = createRecord();
  for (const decl of decls) {
    setRecord(defs, decl.name, typeToSchema(decl.type, names));
  }
  const root = createRecord();
  setRecord(root, "$ref", `#/$defs/${selected.name}`);
  setRecord(root, "$defs", defs);
  return root as JsonSchema;
}

function mergeInterfaces(decls: readonly TsDecl[]): TsDecl[] {
  const order: string[] = [];
  const byName = new Map<string, TsDecl>();
  for (const decl of decls) {
    const existing = byName.get(decl.name);
    if (!existing) {
      order.push(decl.name);
      byName.set(decl.name, decl);
      continue;
    }
    if (decl.kind !== "interface" || existing.kind !== "interface") {
      throw new LlmAbiError(
        `Duplicate type name "${decl.name}" is only allowed for merged interfaces.`,
        "typescript-syntax",
      );
    }
    if (existing.type.kind !== "object" || decl.type.kind !== "object") {
      throw new LlmAbiError(`Cannot merge interface "${decl.name}".`, "typescript-syntax");
    }
    byName.set(decl.name, {
      ...existing,
      exported: existing.exported || decl.exported,
      type: {
        kind: "object",
        members: [...existing.type.members, ...decl.type.members],
        index: decl.type.index ?? existing.type.index,
      },
    });
  }
  return order.map((name) => byName.get(name)!);
}

function selectDecl(decls: readonly TsDecl[], typeName?: string): TsDecl {
  if (typeName !== undefined) {
    const match = decls.find((decl) => decl.name === typeName);
    if (!match) {
      throw new LlmAbiError(
        `TypeScript type "${typeName}" was not found. Declared: ${decls.map((decl) => decl.name).join(", ")}.`,
        "typescript-syntax",
      );
    }
    return match;
  }
  const exported = decls.filter((decl) => decl.exported);
  if (exported.length > 0) {
    return exported[exported.length - 1]!;
  }
  return decls[decls.length - 1]!;
}

function typeToSchema(type: TsType, names: ReadonlySet<string>): JsonSchema {
  switch (type.kind) {
    case "primitive":
      return primitiveSchema(type.name);
    case "literal":
      return { const: type.value } as JsonSchemaObject;
    case "ident":
      return identSchema(type.name, type.args, names);
    case "object":
      return objectSchema(type, names);
    case "array":
      return {
        type: "array",
        items: typeToSchema(type.items, names),
      } as JsonSchemaObject;
    case "tuple": {
      const schema = createRecord();
      setRecord(schema, "type", "array");
      setRecord(
        schema,
        "prefixItems",
        type.elements.map((element) => typeToSchema(element, names)),
      );
      if (type.rest) {
        setRecord(schema, "items", typeToSchema(type.rest, names));
      } else {
        setRecord(schema, "items", false);
      }
      setRecord(schema, "minItems", type.elements.length);
      return schema as JsonSchemaObject;
    }
    case "union":
      return unionSchema(type.variants, names);
    case "intersection":
      return {
        allOf: type.parts.map((part) => typeToSchema(part, names)),
      } as JsonSchemaObject;
    case "unsupported":
      throw new LlmAbiError(type.message, "unsupported-construct");
  }
}

function primitiveSchema(name: PrimitiveName): JsonSchema {
  switch (name) {
    case "string":
    case "number":
    case "boolean":
    case "null":
    case "object":
      return { type: name };
    case "bigint":
    case "symbol":
      throw new LlmAbiError(
        `${name} types cannot be represented in JSON Schema.`,
        "unsupported-construct",
      );
    case "undefined":
    case "any":
    case "unknown":
      return true;
    case "never":
      return false;
  }
}

function identSchema(
  name: string,
  args: readonly TsType[],
  names: ReadonlySet<string>,
): JsonSchema {
  if (name === "Array" || name === "ReadonlyArray") {
    if (args.length !== 1) {
      throw new LlmAbiError(`${name}<T> requires one type argument.`, "typescript-syntax");
    }
    return { type: "array", items: typeToSchema(args[0]!, names) } as JsonSchemaObject;
  }
  if (name === "Record") {
    if (args.length !== 2) {
      throw new LlmAbiError("Record<K, V> requires two type arguments.", "typescript-syntax");
    }
    const keys = args[0]!;
    const value = typeToSchema(args[1]!, names);
    if (keys.kind === "primitive" && keys.name === "string") {
      return {
        type: "object",
        additionalProperties: value,
      } as JsonSchemaObject;
    }
    const namesFromKeys = literalUnionKeys(keys);
    if (namesFromKeys) {
      const properties = createRecord();
      const required: string[] = [];
      for (const key of namesFromKeys) {
        setRecord(properties, key, value);
        required.push(key);
      }
      return {
        type: "object",
        properties,
        required,
        additionalProperties: false,
      } as JsonSchemaObject;
    }
    throw new LlmAbiError(
      "Record keys must be string or a string-literal union.",
      "unsupported-construct",
    );
  }
  if (args.length > 0) {
    throw new LlmAbiError(
      `Generic type "${name}" is not supported in this TypeScript subset.`,
      "unsupported-construct",
    );
  }
  if (names.has(name)) {
    return { $ref: `#/$defs/${name}` } as JsonSchemaObject;
  }
  throw new LlmAbiError(`Unknown type "${name}".`, "typescript-syntax");
}

function objectSchema(
  type: Extract<TsType, { kind: "object" }>,
  names: ReadonlySet<string>,
): JsonSchemaObject {
  const properties = createRecord();
  const required: string[] = [];
  for (const member of type.members) {
    const stripped = stripUndefined(member.type);
    setRecord(properties, member.name, typeToSchema(stripped.type, names));
    if (!member.optional && !stripped.optional) {
      required.push(member.name);
    }
  }
  const schema = createRecord();
  setRecord(schema, "type", "object");
  setRecord(schema, "properties", properties);
  setRecord(schema, "required", required);
  if (type.index) {
    setRecord(schema, "additionalProperties", typeToSchema(type.index.type, names));
  } else {
    setRecord(schema, "additionalProperties", true);
  }
  return schema as JsonSchemaObject;
}

function unionSchema(variants: readonly TsType[], names: ReadonlySet<string>): JsonSchema {
  const meaningful = variants.filter(
    (variant) => !(variant.kind === "primitive" && variant.name === "undefined"),
  );
  if (meaningful.length === 0) {
    return true;
  }
  if (meaningful.length === 1) {
    return typeToSchema(meaningful[0]!, names);
  }
  return {
    anyOf: meaningful.map((variant) => typeToSchema(variant, names)),
  } as JsonSchemaObject;
}

function stripUndefined(type: TsType): { type: TsType; optional: boolean } {
  if (type.kind !== "union") {
    return { type, optional: type.kind === "primitive" && type.name === "undefined" };
  }
  const rest = type.variants.filter(
    (variant) => !(variant.kind === "primitive" && variant.name === "undefined"),
  );
  if (rest.length === type.variants.length) {
    return { type, optional: false };
  }
  if (rest.length === 0) {
    return { type: { kind: "primitive", name: "any" }, optional: true };
  }
  if (rest.length === 1) {
    return { type: rest[0]!, optional: true };
  }
  return { type: { kind: "union", variants: rest }, optional: true };
}

function literalUnionKeys(type: TsType): string[] | undefined {
  if (type.kind === "literal" && typeof type.value === "string") {
    return [type.value];
  }
  if (type.kind !== "union") {
    return undefined;
  }
  const keys: string[] = [];
  for (const variant of type.variants) {
    if (variant.kind !== "literal" || typeof variant.value !== "string") {
      return undefined;
    }
    keys.push(variant.value);
  }
  return keys;
}
