import { LlmAbiError } from "./errors.ts";
import { parseJsonSchema } from "./ir/parse.ts";
import type { SchemaDocument } from "./ir/types.ts";
import { isStandardJSONSchema, isStandardSchema } from "./standard-schema.ts";
import type { SchemaInput } from "./types.ts";

export interface ParsedInput {
  readonly document: SchemaDocument;
  readonly jsonSchema: unknown;
  readonly validateStandard?: (value: unknown) => unknown;
}

export function parseInput(schema: SchemaInput): ParsedInput {
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
      "This schema implements Standard Schema validation but not Standard JSON Schema. Pass a JSON Schema object, or use a library that implements StandardJSONSchemaV1 (for example Zod 4, Valibot, or ArkType).",
      "missing-json-schema",
    );
  }
  return {
    document: parseJsonSchema(schema),
    jsonSchema: schema,
  };
}
