import { describe, expect, it } from "vitest";
import { compile } from "../src/compile.ts";
import { SabiError } from "../src/errors.ts";
import type { StandardJSONSchemaV1, StandardSchemaV1 } from "../src/standard-schema.ts";

describe("standard schema input", () => {
  it("compiles Standard JSON Schema converters", () => {
    const schema: StandardJSONSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => ({ value }),
        jsonSchema: {
          input: () => ({ type: "string" }),
          output: () => ({
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
          }),
        },
      },
    };
    const result = compile(schema, "openai");
    expect((result.schema as { type: string }).type).toBe("object");
    expect(result.validate({ ok: true }).ok).toBe(true);
  });

  it("rejects validation-only Standard Schema", () => {
    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => ({ value }),
      },
    };
    expect(() => compile(schema, "openai")).toThrow(SabiError);
  });
});
