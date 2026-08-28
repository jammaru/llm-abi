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

  it("preserves optional fields and additionalProperties true on Qwen", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name"],
        additionalProperties: true,
      },
      "qwen",
    );
    const schema = result.schema as { required: string[]; additionalProperties?: unknown };
    expect(schema.required).toEqual(["name"]);
    expect(schema.additionalProperties).toBe(true);
    expect(result.compatibility).toBe("lossless");
  });

  it("keeps additionalProperties false on Qwen instead of omitting it", () => {
    const result = compile(
      {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
      "qwen",
    );
    expect((result.schema as { additionalProperties?: unknown }).additionalProperties).toBe(false);
    expect(result.compatibility).toBe("lossless");
  });

  it("marks Qwen anyOf as unsupported", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          value: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
        required: ["value"],
      },
      "qwen",
    );
    expect(result.compatibility).toBe("unsupported");
  });

  it("strips undocumented Qwen formats", () => {
    const result = compile(
      {
        type: "object",
        properties: { email: { type: "string", format: "email" } },
        required: ["email"],
      },
      "qwen",
    );
    const email = (result.schema as { properties: { email: { format?: string } } }).properties
      .email;
    expect(email.format).toBeUndefined();
    expect(result.compatibility).toBe("runtime-safe");
  });

  it("keeps Qwen nullable type arrays", () => {
    const result = compile(
      {
        type: "object",
        properties: { email: { type: ["string", "null"] } },
        required: ["email"],
      },
      "qwen",
    );
    const email = (result.schema as { properties: { email: { type?: unknown } } }).properties.email;
    expect(email.type).toEqual(["string", "null"]);
    expect(result.compatibility).toBe("lossless");
  });

  it("closes objects on Mistral without requiring optional fields", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          nickname: { type: "string" },
        },
        required: ["name"],
        additionalProperties: true,
      },
      "mistral",
    );
    const schema = result.schema as {
      required: string[];
      additionalProperties?: unknown;
      properties: { name: { minLength?: number } };
    };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["name"]);
    expect(schema.properties.name.minLength).toBe(1);
    expect(result.diagnostics.some((item) => item.code === "additional-properties-forced")).toBe(
      true,
    );
    expect(result.diagnostics.some((item) => item.code === "optional-to-nullable")).toBe(false);
    expect(result.diagnostics.some((item) => item.code === "optional-to-required")).toBe(false);
    expect(result.compatibility).toBe("lossless");
  });

  it("never claims lossless OpenRouter enforcement for a simple object schema", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          name: { type: "string" },
          nickname: { type: "string" },
        },
        required: ["name"],
        additionalProperties: true,
      },
      "openrouter",
    );
    const schema = result.schema as { required: string[]; additionalProperties?: unknown };
    expect(schema.required).toEqual(["name"]);
    expect(schema.additionalProperties).toBe(true);
    expect(result.compatibility).toBe("runtime-safe");
    expect(result.diagnostics.some((item) => item.code === "gateway-enforcement-varies")).toBe(
      true,
    );
    expect(result.diagnostics.some((item) => item.code === "optional-to-required")).toBe(false);
  });

  it("requires an object root and rejects oneOf on MCP tool inputSchema", () => {
    const root = compile({ type: "string" }, "mcp");
    expect(root.compatibility).toBe("unsupported");
    expect(root.diagnostics.some((item) => item.code === "root-must-be-object")).toBe(true);

    const oneOf = compile(
      {
        type: "object",
        properties: {
          value: { oneOf: [{ type: "string" }, { type: "number" }] },
        },
        required: ["value"],
      },
      "mcp",
    );
    expect(oneOf.compatibility).toBe("unsupported");
    expect(oneOf.diagnostics.some((item) => item.code === "unsupported-construct")).toBe(true);
  });

  it("inlines non-recursive $defs so MCP hosts receive a plain object schema", () => {
    const result = compile(
      {
        type: "object",
        properties: { author: { $ref: "#/$defs/Person" } },
        required: ["author"],
        $defs: {
          Person: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      },
      "mcp",
    );
    const schema = result.schema as {
      $defs?: unknown;
      properties: { author: { $ref?: string; properties?: { name: { type?: string } } } };
    };
    expect(schema.$defs).toBeUndefined();
    expect(schema.properties.author.$ref).toBeUndefined();
    expect(schema.properties.author.properties?.name.type).toBe("string");
    expect(JSON.stringify(result.schema)).not.toContain("$ref");
    expect(result.compatibility).toBe("lossless");
  });

  it("rejects recursive $ref on MCP instead of emitting $defs", () => {
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
      "mcp",
    );
    expect(result.compatibility).toBe("unsupported");
    expect(result.diagnostics.some((item) => item.code === "recursive-ref")).toBe(true);
    expect((result.schema as { $defs?: unknown }).$defs).toBeUndefined();
  });

  it("moves MCP numeric and format constraints to runtime validation", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          n: { type: "integer", minimum: 0 },
          email: { type: "string", format: "email" },
        },
        required: ["n", "email"],
      },
      "mcp",
    );
    const properties = (
      result.schema as {
        properties: {
          n: { minimum?: number; description?: string };
          email: { format?: string };
        };
      }
    ).properties;
    expect(properties.n.minimum).toBeUndefined();
    expect(properties.n.description).toContain("Must be >= 0");
    expect(properties.email.format).toBeUndefined();
    expect(result.compatibility).toBe("runtime-safe");
    expect(result.validate({ n: 1, email: "ada@example.com" }).ok).toBe(true);
    expect(result.validate({ n: -1, email: "ada@example.com" }).ok).toBe(false);
  });

  it("keeps MCP optional fields and enum values instead of OpenAI strict mode", () => {
    const result = compile(
      {
        type: "object",
        properties: {
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
          location: { type: "string" },
        },
        required: ["location"],
      },
      "mcp",
    );
    const schema = result.schema as {
      required: string[];
      properties: { unit: { enum?: string[]; type?: unknown } };
    };
    expect(schema.required).toEqual(["location"]);
    expect(schema.properties.unit.enum).toEqual(["celsius", "fahrenheit"]);
    expect(schema.properties.unit.type).not.toEqual(["string", "null"]);
    expect(result.diagnostics.some((item) => item.code === "optional-to-required")).toBe(false);
    expect(result.diagnostics.some((item) => item.code === "optional-to-nullable")).toBe(false);
    expect(result.compatibility).toBe("lossless");
  });

  it("does not emit additionalProperties schemas on MCP", () => {
    const result = compile(
      {
        type: "object",
        additionalProperties: { type: "string" },
      },
      "mcp",
    );
    expect((result.schema as { additionalProperties?: unknown }).additionalProperties).toBe(false);
    expect(result.compatibility).toBe("lossy");
  });

  it("marks llama.cpp oneOf as unsupported and keeps array roots", () => {
    const union = compile(
      {
        type: "object",
        properties: { value: { oneOf: [{ type: "string" }, { type: "number" }] } },
        required: ["value"],
      },
      "llamacpp/server/structured",
    );
    expect(union.compatibility).toBe("unsupported");
    const arrayRoot = compile({ type: "array", items: { type: "string" } }, "llamacpp");
    expect(arrayRoot.diagnostics.some((item) => item.code === "root-must-be-object")).toBe(false);
  });

  it("does not copy llama.cpp grammar limits onto Ollama or LM Studio MLX", () => {
    const schema = {
      type: "object",
      properties: { status: { enum: ["ABI_SENTINEL"] } },
      required: ["status"],
    };
    expect(compile(schema, "ollama/chat/structured").compatibility).toBe("lossless");
    const mlx = compile(
      {
        type: "object",
        properties: { tags: { type: "array", items: { type: "string" }, minItems: 1 } },
        required: ["tags"],
      },
      "lmstudio/mlx/structured",
    );
    expect(mlx.compatibility).toBe("lossless");
    const gguf = compile(
      {
        type: "object",
        properties: { value: { oneOf: [{ type: "string" }, { type: "number" }] } },
        required: ["value"],
      },
      "lmstudio/gguf/structured",
    );
    expect(gguf.compatibility).toBe("unsupported");
  });
});
