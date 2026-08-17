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

  it("omits additionalProperties false on xAI and keeps explicit true", () => {
    const closed = compile(
      {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      "xai",
    );
    const closedSchema = closed.schema as { additionalProperties?: unknown };
    expect(closedSchema.additionalProperties).toBeUndefined();
    expect(closed.diagnostics.some((item) => item.code === "additional-properties-omitted")).toBe(
      true,
    );
    expect(closed.compatibility).toBe("lossless");

    const open = compile(
      {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: true,
      },
      "xai",
    );
    expect((open.schema as { additionalProperties?: unknown }).additionalProperties).toBe(true);
    expect(open.compatibility).toBe("lossless");
  });

  it("rejects recursive $ref on xAI structured outputs", () => {
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
      "xai",
    );
    expect(result.compatibility).toBe("unsupported");
    expect(result.diagnostics.some((item) => item.code === "recursive-ref")).toBe(true);
  });

  it("rewrites tuple items false to maxItems on xAI", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          point: {
            type: "array",
            prefixItems: [{ type: "number" }, { type: "number" }],
            items: false,
          },
        },
        required: ["point"],
      },
      "xai",
    );
    const point = (
      result.schema as {
        properties: { point: { items?: unknown; maxItems?: number; prefixItems?: unknown } };
      }
    ).properties.point;
    expect(point.items).toBeUndefined();
    expect(point.maxItems).toBe(2);
    expect(point.prefixItems).toHaveLength(2);
    expect(result.diagnostics.some((item) => item.code === "boolean-schema-rewritten")).toBe(true);
  });

  it("keeps xAI minLength under the documented ceiling and strips above it", () => {
    const ok = compile(
      {
        type: "object",
        properties: { name: { type: "string", minLength: 1 } },
        required: ["name"],
      },
      "xai",
    );
    const name = (ok.schema as { properties: { name: { minLength?: number } } }).properties.name;
    expect(name.minLength).toBe(1);
    expect(ok.compatibility).toBe("lossless");

    const over = compile(
      {
        type: "object",
        properties: { name: { type: "string", minLength: 2049 } },
        required: ["name"],
      },
      "xai",
    );
    const long = (over.schema as { properties: { name: { minLength?: number } } }).properties.name;
    expect(long.minLength).toBeUndefined();
    expect(over.compatibility).toBe("runtime-safe");
    expect(over.diagnostics.some((item) => item.code === "runtime-only-constraint")).toBe(true);
  });

  it("keeps optional properties optional on xAI", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          name: { type: "string" },
          nickname: { type: "string" },
        },
        required: ["name"],
      },
      "xai",
    );
    const schema = result.schema as { required: string[] };
    expect(schema.required).toEqual(["name"]);
    expect(schema.required).not.toContain("nickname");
  });

  it("drops hostname format on xAI and keeps email", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          host: { type: "string", format: "hostname" },
        },
        required: ["email", "host"],
      },
      "xai",
    );
    const properties = (result.schema as { properties: Record<string, { format?: string }> })
      .properties;
    expect(properties["email"]?.format).toBe("email");
    expect(properties["host"]?.format).toBeUndefined();
    expect(result.compatibility).toBe("runtime-safe");
  });
});
