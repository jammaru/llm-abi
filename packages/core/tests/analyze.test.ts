import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.ts";
import { listTargets, resolveTarget } from "../src/targets/registry.ts";

describe("analyze", () => {
  it("counts nodes and constraints", () => {
    const result = analyze({
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        age: { type: "number", minimum: 0 },
      },
      required: ["name", "age"],
    });
    expect(result.stats.nodes).toBeGreaterThan(1);
    expect(result.stats.constraints).toBeGreaterThan(0);
    expect(result.stats.bytes).toBeGreaterThan(0);
    expect(result.stats.tokens).toBeGreaterThan(0);
    expect(result.stats.unusedDefs).toBe(0);
    expect(result.fingerprint.startsWith("sha256:")).toBe(true);
  });

  it("counts nested array and union nodes", () => {
    const result = analyze({
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
        value: { anyOf: [{ type: "string" }, { type: "number" }] },
      },
    });
    expect(result.stats.nodes).toBeGreaterThan(3);
    expect(result.stats.depth).toBeGreaterThan(1);
  });
});

describe("targets", () => {
  it("resolves aliases to the same profile", () => {
    expect(resolveTarget("openai").id).toBe("openai/responses/structured");
    expect(resolveTarget("claude").id).toBe("anthropic/messages/structured");
    expect(resolveTarget("google").id).toBe("google/gemini/structured");
    expect(resolveTarget("deepseek").id).toBe("deepseek/chat/strict-tools");
  });

  it("lists registered targets", () => {
    const ids = listTargets().map((target) => target.id);
    expect(ids).toContain("openai/responses/structured");
    expect(ids).toContain("deepseek/chat/strict-tools");
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });

  it("throws on unknown targets", () => {
    expect(() => resolveTarget("nope")).toThrow(/Unknown target/);
  });
});
