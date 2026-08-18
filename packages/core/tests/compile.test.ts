import { describe, expect, it } from "vitest";
import { compile } from "../src/compile.ts";
import { sha256Hex } from "../src/hash/sha256.ts";

const userSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", minimum: 0, maximum: 150 },
    nickname: { type: "string" },
  },
  required: ["name", "age"],
};

describe("sha256", () => {
  it("matches the public test vector for abc", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("compile openai", () => {
  it("forces additionalProperties false and nullable optionals", () => {
    const result = compile(userSchema, "openai");
    const schema = result.schema as Record<string, unknown>;
    expect(schema["additionalProperties"]).toBe(false);
    expect(schema["required"]).toEqual(["name", "age", "nickname"]);
    const properties = schema["properties"] as Record<string, Record<string, unknown>>;
    expect(properties["nickname"]?.["type"]).toEqual(["string", "null"]);
    expect(result.diagnostics.some((item) => item.code === "optional-to-nullable")).toBe(true);
    expect(result.diagnostics.some((item) => item.code === "runtime-only-constraint")).toBe(true);
  });

  it("keeps numeric constraints that OpenAI documents as supported", () => {
    const result = compile(userSchema, "openai");
    const properties = (result.schema as { properties: Record<string, { minimum?: number }> })
      .properties;
    expect(properties["age"]?.minimum).toBe(0);
  });

  it("deduplicates diagnostics and loss for named TypeScript definitions", () => {
    const result = compile(
      `export type User = {
        name: string;
        nickname?: string;
      };`,
      { target: "openai", typeName: "User" },
    );
    expect(result.diagnostics.filter((item) => item.code === "optional-to-nullable")).toHaveLength(
      1,
    );
    expect(result.loss.removed.filter((item) => item.keyword === "optional")).toHaveLength(1);
  });
});

describe("compile anthropic", () => {
  it("moves minimum and maximum to description and runtime validation", () => {
    const result = compile(userSchema, "anthropic");
    const properties = (
      result.schema as {
        properties: Record<string, { minimum?: number; description?: string }>;
      }
    ).properties;
    expect(properties["age"]?.minimum).toBeUndefined();
    expect(properties["age"]?.description).toContain("Must be >= 0");
    expect(result.compatibility).toBe("runtime-safe");
    expect(result.loss.removed.some((item) => item.keyword === "minimum")).toBe(true);
  });

  it("does not require optional properties", () => {
    const result = compile(userSchema, "anthropic");
    const schema = result.schema as { required: string[] };
    expect(schema.required).toEqual(["name", "age"]);
  });
});

describe("compile gemini", () => {
  it("keeps numeric constraints and optional properties", () => {
    const result = compile(userSchema, "gemini");
    const schema = result.schema as {
      required: string[];
      properties: Record<string, { minimum?: number }>;
    };
    expect(schema.required).toEqual(["name", "age"]);
    expect(schema.properties["age"]?.minimum).toBe(0);
  });

  it("rejects anyOf as unsupported", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          value: {
            anyOf: [{ type: "string" }, { type: "number" }],
          },
        },
        required: ["value"],
      },
      "gemini",
    );
    expect(result.compatibility).toBe("unsupported");
    expect(result.diagnostics.some((item) => item.code === "unsupported-construct")).toBe(true);
  });

  it("throws in strict mode when the schema is unsupported", () => {
    expect(() =>
      compile(
        {
          type: "object",
          properties: { value: { anyOf: [{ type: "string" }, { type: "number" }] } },
          required: ["value"],
        },
        { target: "gemini", strict: true },
      ),
    ).toThrow(/does not support/);
  });
});

describe("compile mcp", () => {
  it("emits a host-safe object schema and still validates stripped constraints", () => {
    const result = compile(userSchema, "mcp");
    const schema = result.schema as {
      required: string[];
      properties: Record<string, { minimum?: number; type?: unknown }>;
    };
    expect(result.target.id).toBe("mcp/2026-06/tools");
    expect(schema.required).toEqual(["name", "age"]);
    expect(schema.properties["nickname"]?.["type"]).toBe("string");
    expect(schema.properties["age"]?.minimum).toBeUndefined();
    expect(result.compatibility).toBe("runtime-safe");
    expect(result.validate({ name: "Ada", age: 36 }).ok).toBe(true);
    expect(result.validate({ name: "Ada", age: -1 }).ok).toBe(false);
  });
});
