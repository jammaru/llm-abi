import { describe, expect, it } from "vitest";
import { compile } from "../src/compile.ts";

describe("lowering", () => {
  it("keeps Anthropic minItems of 0 or 1", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" }, minItems: 1 },
        },
        required: ["tags"],
      },
      "anthropic",
    );
    const tags = (result.schema as { properties: { tags: { minItems?: number } } }).properties.tags;
    expect(tags.minItems).toBe(1);
  });

  it("strips Anthropic minItems above 1", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" }, minItems: 3 },
        },
        required: ["tags"],
      },
      "anthropic",
    );
    const tags = (result.schema as { properties: { tags: { minItems?: number } } }).properties.tags;
    expect(tags.minItems).toBeUndefined();
    expect(result.loss.removed.some((item) => item.keyword === "minItems")).toBe(true);
  });

  it("rewrites oneOf to anyOf on OpenAI", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          value: { oneOf: [{ type: "string" }, { type: "number" }] },
        },
        required: ["value"],
      },
      "openai",
    );
    expect(result.compatibility).toBe("lossy");
    expect(result.diagnostics.some((item) => item.code === "one-of-to-any-of")).toBe(true);
  });

  it("marks Gemini anyOf as unsupported", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          value: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
        required: ["value"],
      },
      "gemini",
    );
    expect(result.compatibility).toBe("unsupported");
  });

  it("moves unsafe patterns to runtime validation", () => {
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
    const code = (result.schema as { properties: { code: { pattern?: string } } }).properties.code;
    expect(code.pattern).toBeUndefined();
    expect(result.diagnostics.some((item) => item.code === "complex-pattern")).toBe(true);
  });

  it("marks record schemas as lossy on OpenAI instead of silently emptying them", () => {
    const result = compile({ type: "object", additionalProperties: { type: "string" } }, "openai");
    expect(result.compatibility).toBe("lossy");
    expect((result.schema as { additionalProperties?: unknown }).additionalProperties).toBe(false);
  });

  it("rejects a string root on OpenAI structured outputs", () => {
    const result = compile({ type: "string" }, "openai");
    expect(result.compatibility).toBe("unsupported");
    expect(result.diagnostics.some((item) => item.code === "root-must-be-object")).toBe(true);
  });

  it("emits $defs for recursive refs on Gemini", () => {
    const result = compile(
      {
        type: "object",
        properties: { node: { $ref: "#/$defs/Node" } },
        required: ["node"],
        $defs: {
          Node: {
            type: "object",
            properties: {
              name: { type: "string" },
              child: { $ref: "#/$defs/Node" },
            },
            required: ["name"],
          },
        },
      },
      "gemini",
    );
    expect((result.schema as { $defs?: unknown }).$defs).toBeTypeOf("object");
  });

  it("keeps object type when an unused items keyword is present", () => {
    const result = compile(
      {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        items: { type: "number" },
      },
      "openai",
    );
    expect((result.schema as { type?: string }).type).toBe("object");
  });

  it("emits $def for recursive refs on DeepSeek strict tools", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          nickname: { type: "string" },
          child: { $ref: "#/$defs/Node" },
        },
        required: ["name"],
        $defs: {
          Node: {
            type: "object",
            properties: {
              name: { type: "string" },
              child: { $ref: "#/$defs/Node" },
            },
            required: ["name"],
          },
        },
      },
      "deepseek",
    );
    const schema = result.schema as {
      required: string[];
      $def?: Record<string, unknown>;
      $defs?: unknown;
    };
    expect(result.compatibility).toBe("lossy");
    expect(schema.required).toContain("nickname");
    expect(schema.required).toContain("child");
    expect(schema.$def).toBeTypeOf("object");
    expect(schema.$defs).toBeUndefined();
    expect(JSON.stringify(result.schema)).toContain("#/$def/");
    expect(result.diagnostics.some((item) => item.code === "optional-to-required")).toBe(true);
    expect(result.diagnostics.some((item) => item.code === "runtime-only-constraint")).toBe(true);
  });

  it("keeps documented DeepSeek formats and drops date-time", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          when: { type: "string", format: "date-time" },
        },
        required: ["email", "when"],
      },
      "deepseek",
    );
    const properties = (result.schema as { properties: Record<string, { format?: string }> })
      .properties;
    expect(properties["email"]?.format).toBe("email");
    expect(properties["when"]?.format).toBeUndefined();
    expect(result.compatibility).toBe("runtime-safe");
  });

  it("keeps OpenAI documented date-time format after the allowlist check", () => {
    const result = compile(
      {
        type: "object",
        properties: { when: { type: "string", format: "date-time" } },
        required: ["when"],
      },
      "openai",
    );
    const when = (result.schema as { properties: { when: { format?: string } } }).properties.when;
    expect(when.format).toBe("date-time");
    expect(result.compatibility).toBe("lossless");
  });
});
