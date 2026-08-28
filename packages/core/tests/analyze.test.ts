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
    expect(resolveTarget("grok").id).toBe("xai/grok/structured");
    expect(resolveTarget("qwen").id).toBe("alibaba/qwen/tools");
    expect(resolveTarget("mistral").id).toBe("mistral/chat/structured");
    expect(resolveTarget("openrouter").id).toBe("openrouter/structured");
    expect(resolveTarget("mcp").id).toBe("mcp/2026-06/tools");
    expect(resolveTarget("mcp/tools").id).toBe("mcp/2026-06/tools");
    expect(resolveTarget("mcp/2025-11/tools").id).toBe("mcp/2026-06/tools");
    expect(resolveTarget("openai").evidence.source).toMatch(/^https:\/\//);
    expect(resolveTarget("openai").evidence.live).toBe("nightly");
    expect(resolveTarget("deepseek").evidence.live).toBe("not-configured");
    expect("capabilities" in resolveTarget("openai")).toBe(false);
    expect("liveAdapter" in resolveTarget("openai")).toBe(false);
  });

  it("lists registered targets", () => {
    const ids = listTargets().map((target) => target.id);
    expect(ids).toContain("openai/responses/structured");
    expect(ids).toContain("deepseek/chat/strict-tools");
    expect(ids).toContain("xai/grok/structured");
    expect(ids).toContain("alibaba/qwen/tools");
    expect(ids).toContain("mistral/chat/structured");
    expect(ids).toContain("openrouter/structured");
    expect(ids).toContain("mcp/2026-06/tools");
    expect(ids).toHaveLength(9);
    expect(ids).not.toContain("llamacpp/server/structured");
  });

  it("exposes auditable evidence for every target", () => {
    for (const target of listTargets({ scope: "all" })) {
      expect(["supported", "partial", "experimental"]).toContain(target.maturity);
      expect(["documented", "sdk-observed", "empirical"]).toContain(target.evidence.kind);
      expect(target.evidence.source).toMatch(/^https:\/\//);
      expect(target.evidence.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["nightly", "not-configured"]).toContain(target.evidence.live);
    }
  });

  it("throws on unknown targets", () => {
    expect(() => resolveTarget("nope")).toThrow(/Unknown target/);
  });
});
