import type { JsonValue } from "../types.ts";

export type SchemaNode =
  | AnyNode
  | NeverNode
  | NullNode
  | BooleanNode
  | StringNode
  | NumberNode
  | ObjectNode
  | ArrayNode
  | TupleNode
  | EnumNode
  | LiteralNode
  | UnionNode
  | IntersectionNode
  | RefNode;

interface NodeBase {
  path: readonly string[];
  title?: string;
  description?: string;
  deprecated?: boolean;
  default?: JsonValue;
}

export interface AnyNode extends NodeBase {
  kind: "any";
}

export interface NeverNode extends NodeBase {
  kind: "never";
}

export interface NullNode extends NodeBase {
  kind: "null";
}

export interface BooleanNode extends NodeBase {
  kind: "boolean";
}

export interface StringNode extends NodeBase {
  kind: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

export interface NumberNode extends NodeBase {
  kind: "number" | "integer";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}

export interface ObjectNode extends NodeBase {
  kind: "object";
  properties: Map<string, SchemaNode>;
  required: Set<string>;
  additionalProperties: boolean | SchemaNode;
  minProperties?: number;
  maxProperties?: number;
}

export interface ArrayNode extends NodeBase {
  kind: "array";
  items: SchemaNode;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export interface TupleNode extends NodeBase {
  kind: "tuple";
  prefixItems: SchemaNode[];
  rest?: SchemaNode | false;
  minItems?: number;
  maxItems?: number;
}

export interface EnumNode extends NodeBase {
  kind: "enum";
  values: JsonValue[];
}

export interface LiteralNode extends NodeBase {
  kind: "literal";
  value: JsonValue;
}

export interface UnionNode extends NodeBase {
  kind: "union";
  discriminant: "anyOf" | "oneOf" | "type-array";
  variants: SchemaNode[];
}

export interface IntersectionNode extends NodeBase {
  kind: "intersection";
  parts: SchemaNode[];
}

export interface RefNode extends NodeBase {
  kind: "ref";
  ref: string;
  cyclic: boolean;
}

export interface ParseNote {
  path: readonly string[];
  keyword: string;
  message: string;
}

export interface SchemaDocument {
  root: SchemaNode;
  defs: Map<string, SchemaNode>;
  dialect: "draft-07" | "2020-12" | "provider";
  notes: ParseNote[];
}

export function cloneNode(node: SchemaNode): SchemaNode {
  switch (node.kind) {
    case "object": {
      const properties = new Map<string, SchemaNode>();
      for (const [key, value] of node.properties) {
        properties.set(key, cloneNode(value));
      }
      return {
        ...node,
        path: [...node.path],
        properties,
        required: new Set(node.required),
        additionalProperties:
          typeof node.additionalProperties === "boolean"
            ? node.additionalProperties
            : cloneNode(node.additionalProperties),
      };
    }
    case "array":
      return { ...node, path: [...node.path], items: cloneNode(node.items) };
    case "tuple":
      return {
        ...node,
        path: [...node.path],
        prefixItems: node.prefixItems.map(cloneNode),
        rest: node.rest === undefined || node.rest === false ? node.rest : cloneNode(node.rest),
      };
    case "union":
      return {
        ...node,
        path: [...node.path],
        variants: node.variants.map(cloneNode),
      };
    case "intersection":
      return {
        ...node,
        path: [...node.path],
        parts: node.parts.map(cloneNode),
      };
    case "enum":
      return { ...node, path: [...node.path], values: [...node.values] };
    default:
      return { ...node, path: [...node.path] };
  }
}

export function cloneDocument(document: SchemaDocument): SchemaDocument {
  const defs = new Map<string, SchemaNode>();
  for (const [key, value] of document.defs) {
    defs.set(key, cloneNode(value));
  }
  return {
    root: cloneNode(document.root),
    defs,
    dialect: document.dialect,
    notes: document.notes.map((note) => ({
      path: [...note.path],
      keyword: note.keyword,
      message: note.message,
    })),
  };
}
