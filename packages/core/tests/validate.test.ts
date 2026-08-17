import { describe, expect, it } from "vitest";
import { compile } from "../src/compile.ts";

describe("validate", () => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1 },
      age: { type: "number", minimum: 0, maximum: 150 },
    },
    required: ["name", "age"],
    additionalProperties: false,
  };

  it("accepts values that satisfy the original schema", () => {
    const result = compile(schema, "anthropic");
    expect(result.validate({ name: "Ada", age: 36 }).ok).toBe(true);
  });

  it("enforces constraints that Anthropic cannot represent", () => {
    const result = compile(schema, "anthropic");
    const invalid = result.validate({ name: "Ada", age: -1 });
    expect(invalid.ok).toBe(false);
    expect(invalid.issues[0]?.message).toContain(">=");
  });

  it("enforces uniqueItems on the original schema", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" }, uniqueItems: true },
        },
        required: ["tags"],
      },
      "openai",
    );
    expect(result.validate({ tags: ["a", "b"] }).ok).toBe(true);
    expect(result.validate({ tags: ["a", "a"] }).ok).toBe(false);
  });

  it("validates tuples, unions, and extra properties", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          point: {
            type: "array",
            prefixItems: [{ type: "number" }, { type: "number" }],
            items: false,
          },
          value: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
        required: ["point", "value"],
        additionalProperties: false,
      },
      "openai",
    );
    expect(result.validate({ point: [1, 2], value: "ok" }).ok).toBe(true);
    expect(result.validate({ point: [1, 2], value: true }).ok).toBe(false);
    expect(result.validate({ point: [1, 2], value: "ok", extra: 1 }).ok).toBe(false);
  });

  it("treats JSON Schema false as never", () => {
    const result = compile(
      {
        type: "object",
        properties: { nope: false },
        required: ["nope"],
      },
      "openai",
    );
    expect(result.validate({ nope: null }).ok).toBe(false);
  });

  it("coerces optional null inside array items for OpenAI", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          people: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, nick: { type: "string" } },
              required: ["name"],
            },
          },
        },
        required: ["people"],
      },
      "openai",
    );
    expect(result.validate({ people: [{ name: "Ada", nick: null }] }).ok).toBe(true);
  });

  it("does not evaluate nested-quantifier patterns", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          code: { type: "string", pattern: "(a+)+" },
        },
        required: ["code"],
      },
      "openai",
    );
    expect(result.validate({ code: "aaa" }).ok).toBe(true);
    expect(result.validate({ code: 1 }).ok).toBe(false);
  });
});
