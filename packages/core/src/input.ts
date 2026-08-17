import { LlmAbiError } from "./errors.ts";
import { parseJsonSchema } from "./ir/parse.ts";
import type { SchemaDocument } from "./ir/types.ts";
import { isStandardJSONSchema, isStandardSchema } from "./standard-schema.ts";
import {
  isTypeScriptSource,
  looksLikeJsonDocument,
  typeScriptToJsonSchema,
} from "./typescript/index.ts";
import type { SchemaInput } from "./types.ts";

export interface ParsedInput {
  readonly document: SchemaDocument;
  readonly jsonSchema: unknown;
  readonly validateStandard?: (value: unknown) => unknown;
}

export interface ParseInputOptions {
  readonly typeName?: string;
}

export function parseInput(schema: SchemaInput, options: ParseInputOptions = {}): ParsedInput {
  if (typeof schema === "string") {
    const jsonSchema = parseStringSchema(schema, options.typeName);
    return {
      document: parseJsonSchema(jsonSchema),
      jsonSchema,
    };
  }
  if (isStandardJSONSchema(schema)) {
    const jsonSchema = schema["~standard"].jsonSchema.output({
      target: "draft-2020-12",
    });
    return {
      document: parseJsonSchema(jsonSchema),
      jsonSchema,
      validateStandard: (value) => schema["~standard"].validate(value),
    };
  }
  if (isStandardSchema(schema)) {
    throw new LlmAbiError(
      "This schema implements Standard Schema validation but not Standard JSON Schema. Pass a JSON Schema object, a TypeScript type string, or use a library that implements StandardJSONSchemaV1 (for example Zod 4, Valibot, or ArkType).",
      "missing-json-schema",
    );
  }
  return {
    document: parseJsonSchema(schema),
    jsonSchema: schema,
  };
}

function parseStringSchema(text: string, typeName?: string): unknown {
  const trimmed = text.trim();
  if (isTypeScriptSource(trimmed) || !looksLikeJsonDocument(trimmed)) {
    return typeScriptToJsonSchema(wrapAnonymousObject(trimmed), { typeName });
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return typeScriptToJsonSchema(wrapAnonymousObject(trimmed), { typeName });
    }
    throw new LlmAbiError(
      "String input must be JSON Schema or TypeScript type syntax.",
      "invalid-schema",
    );
  }
}

function wrapAnonymousObject(source: string): string {
  const trimmed = source.trim();
  if (trimmed.startsWith("{") && !/^(?:export\s+)?(?:type|interface)\b/.test(trimmed)) {
    return `type Root = ${trimmed}`;
  }
  return source;
}
