import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.ts";
import { compile } from "../src/compile.ts";
import { budgetDiagnostic, measureSchema } from "../src/size.ts";
import type { TargetProfile } from "../src/targets/types.ts";

describe("schema size", () => {
  it("counts UTF-8 bytes of canonical JSON", () => {
    const ascii = measureSchema({ a: "e" });
    const multibyte = measureSchema({ a: "é" });
    expect(multibyte.bytes).toBeGreaterThan(ascii.bytes);
    expect(ascii.tokens).toBe(Math.ceil(ascii.bytes / 3));
  });

  it("uses a conservative bytes/3 token hint", () => {
    const size = measureSchema({ hello: "world" });
    expect(size.tokens).toBeGreaterThanOrEqual(size.bytes / 3);
    expect(size.tokens).toBe(Math.ceil(size.bytes / 3));
  });

  it("warns when emitted bytes exceed the documented string budget", () => {
    const diagnostic = budgetDiagnostic({ bytes: 50, tokens: 17 }, {
      id: "vendor/test",
      limits: { maxStringBudget: 10 },
    } as TargetProfile);
    expect(diagnostic?.code).toBe("string-budget-exceeded");
    expect(diagnostic?.severity).toBe("warning");
    expect(
      budgetDiagnostic({ bytes: 10, tokens: 4 }, {
        id: "vendor/test",
        limits: { maxStringBudget: 10 },
      } as TargetProfile),
    ).toBeUndefined();
  });
});

describe("compile size", () => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1 },
      age: { type: "number", minimum: 0, maximum: 150 },
    },
    required: ["name", "age"],
  };

  it("reports emitted size that matches the provider schema", () => {
    const result = compile(schema, "openai");
    expect(result.size.bytes).toBe(measureSchema(result.schema).bytes);
    expect(result.size.tokens).toBeGreaterThan(0);
  });

  it("grows Anthropic output when constraints move into descriptions", () => {
    const openai = compile(schema, "openai");
    const anthropic = compile(schema, "anthropic");
    expect(anthropic.size.bytes).toBeGreaterThan(openai.size.bytes);
  });

  it("does not change compatibility because of size reporting", () => {
    const result = compile(
      {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
      },
      "gemini",
    );
    expect(result.compatibility).toBe("lossless");
    expect(result.size.tokens).toBeGreaterThan(0);
  });
});

describe("unused defs", () => {
  const schema = {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    $defs: { Unused: { type: "number" } },
  };

  it("diagnoses unused root $defs without compiling their bodies", () => {
    const result = compile(schema, "openai");
    expect(result.diagnostics.some((item) => item.code === "unused-def-removed")).toBe(true);
    expect(JSON.stringify(result.schema)).not.toContain("Unused");
    expect(result.compatibility).toBe("lossless");
  });

  it("counts unused defs in analyze", () => {
    const result = analyze(schema);
    expect(result.stats.unusedDefs).toBe(1);
    expect(result.stats.bytes).toBeGreaterThan(0);
    expect(result.notes.some((note) => note.code === "unused-def-removed")).toBe(true);
  });
});

describe("optimize", () => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string", title: "name", description: "name" },
    },
    required: ["name"],
  };

  it("keeps redundant titles unless optimize is set", () => {
    const result = compile(schema, "anthropic");
    const properties = (result.schema as { properties: Record<string, { title?: string }> })
      .properties;
    expect(properties["name"]?.title).toBe("name");
  });

  it("strips redundant titles and duplicate descriptions when optimize is set", () => {
    const result = compile(schema, { target: "anthropic", optimize: true });
    const properties = (
      result.schema as { properties: Record<string, { title?: string; description?: string }> }
    ).properties;
    expect(properties["name"]?.title).toBeUndefined();
    expect(properties["name"]?.description).toBeUndefined();
    expect(
      result.diagnostics.filter((item) => item.code === "redundant-annotation-removed"),
    ).toHaveLength(2);
  });
});
