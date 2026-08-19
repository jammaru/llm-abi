import { describe, expect, it } from "vitest";
import { diagnosticMatrix, diffSchemas } from "../src/compare.ts";
import { runPlayground } from "../src/compile.ts";
import { exampleById } from "../src/examples.ts";

describe("playground compare", () => {
  it("diffs object keys without treating missing as equal", () => {
    const diffs = diffSchemas({ a: 1, b: true }, { a: 1, c: true });
    expect(diffs.some((item) => item.path === "b")).toBe(true);
    expect(diffs.some((item) => item.path === "c")).toBe(true);
  });

  it("builds a diagnostic matrix keyed by code and path", () => {
    const example = exampleById("ts-user");
    expect(example).toBeDefined();
    if (!example) {
      return;
    }
    const result = runPlayground(example.source, {
      kind: example.kind,
      typeName: example.typeName,
      optimize: false,
      constraintFallback: "description",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const rows = diagnosticMatrix(result.targets);
    expect(rows.some((row) => row.code === "optional-to-nullable")).toBe(true);
    const optional = rows.find((row) => row.code === "optional-to-nullable");
    const openai = result.targets.find((target) => target.target.vendor === "openai");
    expect(optional?.byTarget.get(openai?.target.id ?? "")).toBe(true);
  });
});
