import { describe, expect, it } from "vitest";
import { SchemaLimitError } from "../src/errors.ts";
import { compile } from "../src/compile.ts";
import { parseJsonSchema } from "../src/ir/parse.ts";
import { isUnsafePattern } from "../src/json/pattern.ts";

describe("security limits", () => {
  it("rejects schemas that exceed max depth", () => {
    let schema: Record<string, unknown> = { type: "string" };
    for (let index = 0; index < 80; index += 1) {
      schema = { type: "object", properties: { nested: schema } };
    }
    expect(() => parseJsonSchema(schema)).toThrow(SchemaLimitError);
  });

  it("does not pollute Object.prototype from property names", () => {
    const schema = JSON.parse(
      '{"type":"object","properties":{"__proto__":{"type":"string"},"constructor":{"type":"number"}}}',
    ) as Record<string, unknown>;
    const result = compile(schema, "openai");
    expect(Object.prototype).not.toHaveProperty("type");
    const json = JSON.stringify(result.schema);
    expect(json.includes("constructor")).toBe(true);
  });

  it("rejects oversized enums", () => {
    expect(() =>
      parseJsonSchema({
        type: "string",
        enum: Array.from({ length: 1001 }, (_, index) => `v${index}`),
      }),
    ).toThrow(SchemaLimitError);
  });

  it("treats nested quantifiers as unsafe", () => {
    expect(isUnsafePattern("(a+)+")).toBe(true);
    expect(isUnsafePattern("((a+))+")).toBe(true);
    expect(isUnsafePattern("^@[a-zA-Z0-9_]+$")).toBe(false);
  });
});
