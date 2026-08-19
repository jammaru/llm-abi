import { describe, expect, it } from "vitest";
import { runPlayground, toSchemaInput, validateInstance } from "../src/compile.ts";
import { exampleById } from "../src/examples.ts";

describe("playground compile", () => {
  it("compares every built-in target for TypeScript input", () => {
    const example = exampleById("ts-user");
    expect(example).toBeDefined();
    if (!example) {
      return;
    }
    const result = runPlayground(example.source, {
      kind: "typescript",
      typeName: example.typeName,
      optimize: false,
      constraintFallback: "description",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.targets.length).toBeGreaterThanOrEqual(3);
    expect(result.inputFingerprint.startsWith("sha256:")).toBe(true);
    expect(
      result.targets.every((target) => target.target.evidence.source.startsWith("https://")),
    ).toBe(true);
    const levels = new Set(result.targets.map((target) => target.compatibility));
    expect([...levels].join(" ")).not.toMatch(/%|percent|score/i);
    const openai = result.targets.find((target) => target.target.vendor === "openai");
    expect(openai?.diagnostics.some((item) => item.code === "optional-to-nullable")).toBe(true);
  });

  it("does not treat invalid JSON as TypeScript when kind is json", () => {
    const result = runPlayground("{ name: string }", {
      kind: "json",
      typeName: "",
      optimize: false,
      constraintFallback: "description",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe("invalid-json");
  });

  it("rejects empty input", () => {
    const result = runPlayground("   ", {
      kind: "typescript",
      typeName: "",
      optimize: false,
      constraintFallback: "description",
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe("empty-input");
  });

  it("validates an instance against the original schema", () => {
    const source = `{
      "type": "object",
      "properties": { "name": { "type": "string", "minLength": 1 } },
      "required": ["name"]
    }`;
    const ok = validateInstance(
      source,
      { kind: "json", typeName: "", optimize: false, constraintFallback: "description" },
      `{ "name": "Ada" }`,
    );
    expect(ok.status).toBe("validated");
    if (ok.status === "validated") {
      expect(ok.result.ok).toBe(true);
    }
    const bad = validateInstance(
      source,
      { kind: "json", typeName: "", optimize: false, constraintFallback: "description" },
      `{ "name": "" }`,
    );
    expect(bad.status).toBe("validated");
    if (bad.status === "validated") {
      expect(bad.result.ok).toBe(false);
    }
  });

  it("keeps JSON objects as SchemaInput objects", () => {
    const schema = toSchemaInput(`{ "type": "boolean" }`, {
      kind: "json",
      typeName: "",
      optimize: false,
      constraintFallback: "strip",
    });
    expect(schema).toEqual({ type: "boolean" });
  });
});
