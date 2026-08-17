import { createRecord, setRecord } from "../json/safe-record.ts";
import type { Diagnostic, JsonSchema, JsonSchemaObject, JsonValue } from "../types.ts";
import type { SchemaDocument, SchemaNode } from "../ir/types.ts";
import type { TargetProfile } from "../targets/types.ts";

export interface EmitOptions {
  readonly optimize: boolean;
}

export interface EmitResult {
  readonly schema: JsonSchema;
  readonly diagnostics: Diagnostic[];
}

export function emitSchema(
  document: SchemaDocument,
  profile: TargetProfile,
  options: EmitOptions = { optimize: false },
): EmitResult {
  const diagnostics: Diagnostic[] = [];
  const usedDefs = new Set<string>();
  collectRefs(document.root, usedDefs, document.defs, new Set());
  const schema = emitNode(document.root, profile, options, diagnostics);
  if (
    usedDefs.size > 0 &&
    profile.capabilities.defs !== "unsupported" &&
    typeof schema === "object" &&
    schema !== null
  ) {
    const defs = createRecord();
    for (const pointer of usedDefs) {
      const node = document.defs.get(pointer);
      if (!node) {
        continue;
      }
      const name = defName(pointer);
      setRecord(defs, name, emitNode(node, profile, options, diagnostics));
    }
    setRecord(schema as Record<string, unknown>, defsKeywordOf(profile), defs);
  }
  return { schema, diagnostics };
}

function emitNode(
  node: SchemaNode,
  profile: TargetProfile,
  options: EmitOptions,
  diagnostics: Diagnostic[],
): JsonSchema {
  const object = createRecord();
  const propertyName = node.path[node.path.length - 1];
  if (node.title) {
    if (options.optimize && propertyName !== undefined && node.title === propertyName) {
      diagnostics.push({
        code: "redundant-annotation-removed",
        severity: "info",
        path: node.path,
        keyword: "title",
        message: `Title "${node.title}" duplicated the property name and was omitted.`,
        action: "Safe metadata-only optimization.",
      });
    } else {
      setRecord(object, "title", node.title);
    }
  }
  if (node.description) {
    if (options.optimize && node.description === node.title) {
      diagnostics.push({
        code: "redundant-annotation-removed",
        severity: "info",
        path: node.path,
        keyword: "description",
        message: "Description duplicated the title and was omitted.",
        action: "Safe metadata-only optimization.",
      });
    } else {
      setRecord(object, "description", node.description);
    }
  }
  if (node.deprecated) {
    setRecord(object, "deprecated", true);
  }
  if (node.default !== undefined) {
    setRecord(object, "default", node.default);
  }

  switch (node.kind) {
    case "any":
      return object as JsonSchemaObject;
    case "never":
      return false;
    case "null":
      setRecord(object, "type", "null");
      return object as JsonSchemaObject;
    case "boolean":
      setRecord(object, "type", "boolean");
      return object as JsonSchemaObject;
    case "string":
      setRecord(object, "type", "string");
      copyIf(object, "minLength", node.minLength);
      copyIf(object, "maxLength", node.maxLength);
      copyIf(object, "pattern", node.pattern);
      copyIf(object, "format", node.format);
      return object as JsonSchemaObject;
    case "number":
    case "integer":
      setRecord(object, "type", node.kind);
      copyIf(object, "minimum", node.minimum);
      copyIf(object, "maximum", node.maximum);
      copyIf(object, "exclusiveMinimum", node.exclusiveMinimum);
      copyIf(object, "exclusiveMaximum", node.exclusiveMaximum);
      copyIf(object, "multipleOf", node.multipleOf);
      return object as JsonSchemaObject;
    case "object":
      return emitObject(object, node, profile, options, diagnostics);
    case "array":
      setRecord(object, "type", "array");
      setRecord(object, "items", emitNode(node.items, profile, options, diagnostics));
      copyIf(object, "minItems", node.minItems);
      copyIf(object, "maxItems", node.maxItems);
      if (node.uniqueItems) {
        setRecord(object, "uniqueItems", true);
      }
      return object as JsonSchemaObject;
    case "tuple":
      setRecord(object, "type", "array");
      setRecord(
        object,
        "prefixItems",
        node.prefixItems.map((item) => emitNode(item, profile, options, diagnostics)),
      );
      if (node.rest === false) {
        setRecord(object, "items", false);
      } else if (node.rest) {
        setRecord(object, "items", emitNode(node.rest, profile, options, diagnostics));
      }
      copyIf(object, "minItems", node.minItems);
      copyIf(object, "maxItems", node.maxItems);
      return object as JsonSchemaObject;
    case "enum":
      setRecord(object, "enum", node.values);
      return object as JsonSchemaObject;
    case "literal":
      setRecord(object, "const", node.value);
      return object as JsonSchemaObject;
    case "union":
      return emitUnion(object, node, profile, options, diagnostics);
    case "intersection":
      setRecord(
        object,
        "allOf",
        node.parts.map((part) => emitNode(part, profile, options, diagnostics)),
      );
      return object as JsonSchemaObject;
    case "ref":
      setRecord(object, "$ref", toEmitRef(node.ref, profile));
      return object as JsonSchemaObject;
  }
}

function emitObject(
  object: Record<string, unknown>,
  node: Extract<SchemaNode, { kind: "object" }>,
  profile: TargetProfile,
  options: EmitOptions,
  diagnostics: Diagnostic[],
): JsonSchemaObject {
  setRecord(object, "type", "object");
  const properties = createRecord();
  for (const [key, value] of node.properties) {
    setRecord(properties, key, emitNode(value, profile, options, diagnostics));
  }
  setRecord(object, "properties", properties);
  setRecord(object, "required", [...node.required]);
  if (typeof node.additionalProperties === "boolean") {
    const omitFalse =
      node.additionalProperties === false &&
      profile.objectPolicy.additionalProperties === "omit-false";
    if (!omitFalse) {
      setRecord(object, "additionalProperties", node.additionalProperties);
    }
  } else {
    setRecord(
      object,
      "additionalProperties",
      emitNode(node.additionalProperties, profile, options, diagnostics),
    );
  }
  copyIf(object, "minProperties", node.minProperties);
  copyIf(object, "maxProperties", node.maxProperties);
  return object as JsonSchemaObject;
}

function emitUnion(
  object: Record<string, unknown>,
  node: Extract<SchemaNode, { kind: "union" }>,
  profile: TargetProfile,
  options: EmitOptions,
  diagnostics: Diagnostic[],
): JsonSchemaObject {
  if (
    node.discriminant === "type-array" &&
    node.variants.every((variant) => isBarePrimitive(variant))
  ) {
    const types = node.variants.map((variant) => variant.kind);
    const nonNull = node.variants.filter((variant) => variant.kind !== "null");
    if (nonNull.length === 1) {
      const emitted = emitNode(nonNull[0]!, profile, options, diagnostics);
      if (typeof emitted === "object" && emitted !== null) {
        const record = emitted as Record<string, unknown>;
        const currentType = record["type"];
        setRecord(
          record,
          "type",
          Array.isArray(currentType)
            ? [...currentType, "null"]
            : [currentType ?? nonNull[0]!.kind, "null"],
        );
        return emitted as JsonSchemaObject;
      }
    }
    setRecord(object, "type", types);
    return object as JsonSchemaObject;
  }
  const key = node.discriminant === "oneOf" ? "oneOf" : "anyOf";
  setRecord(
    object,
    key,
    node.variants.map((variant) => emitNode(variant, profile, options, diagnostics)),
  );
  return object as JsonSchemaObject;
}

function isBarePrimitive(node: SchemaNode): boolean {
  if (node.kind === "null" || node.kind === "boolean") {
    return true;
  }
  if (node.kind === "string") {
    return (
      node.minLength === undefined &&
      node.maxLength === undefined &&
      node.pattern === undefined &&
      node.format === undefined
    );
  }
  if (node.kind === "number" || node.kind === "integer") {
    return (
      node.minimum === undefined &&
      node.maximum === undefined &&
      node.exclusiveMinimum === undefined &&
      node.exclusiveMaximum === undefined &&
      node.multipleOf === undefined
    );
  }
  return false;
}

function collectRefs(
  node: SchemaNode,
  used: Set<string>,
  defs: ReadonlyMap<string, SchemaNode>,
  seen: Set<SchemaNode>,
): void {
  if (seen.has(node)) {
    return;
  }
  seen.add(node);
  switch (node.kind) {
    case "ref":
      used.add(node.ref);
      {
        const target = defs.get(node.ref);
        if (target) {
          collectRefs(target, used, defs, seen);
        }
      }
      break;
    case "object":
      for (const value of node.properties.values()) {
        collectRefs(value, used, defs, seen);
      }
      if (typeof node.additionalProperties !== "boolean") {
        collectRefs(node.additionalProperties, used, defs, seen);
      }
      break;
    case "array":
      collectRefs(node.items, used, defs, seen);
      break;
    case "tuple":
      for (const item of node.prefixItems) {
        collectRefs(item, used, defs, seen);
      }
      if (typeof node.rest === "object") {
        collectRefs(node.rest, used, defs, seen);
      }
      break;
    case "union":
      for (const variant of node.variants) {
        collectRefs(variant, used, defs, seen);
      }
      break;
    case "intersection":
      for (const part of node.parts) {
        collectRefs(part, used, defs, seen);
      }
      break;
    default:
      break;
  }
}

function toEmitRef(ref: string, profile: TargetProfile): string {
  const match = /^#\/(?:\$defs|\$def|definitions)\/(.+)$/.exec(ref);
  if (match?.[1]) {
    return `#/${defsKeywordOf(profile)}/${match[1]}`;
  }
  return ref;
}

function defsKeywordOf(profile: TargetProfile): "$defs" | "$def" {
  return profile.defsKeyword ?? "$defs";
}

function defName(pointer: string): string {
  const parts = pointer.split("/");
  return parts[parts.length - 1] ?? pointer;
}

function copyIf(object: Record<string, unknown>, key: string, value: JsonValue | undefined): void {
  if (value !== undefined) {
    setRecord(object, key, value);
  }
}
