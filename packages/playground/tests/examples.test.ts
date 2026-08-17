import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../src/examples.ts";
import { runPlayground } from "../src/compile.ts";

describe("playground examples", () => {
  it("every example compiles without crashing", () => {
    for (const example of EXAMPLES) {
      const result = runPlayground(example.source, {
        kind: example.kind,
        typeName: example.typeName,
        optimize: false,
        constraintFallback: "description",
      });
      expect(result.ok, example.id).toBe(true);
    }
  });

  it("numeric constraints are runtime-safe on Anthropic", () => {
    const example = EXAMPLES.find((item) => item.id === "json-constraints")!;
    const result = runPlayground(example.source, {
      kind: "json",
      typeName: "",
      optimize: false,
      constraintFallback: "description",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const anthropic = result.targets.find((target) => target.target.vendor === "anthropic");
    expect(anthropic?.compatibility).toBe("runtime-safe");
    expect(anthropic?.loss.removed.some((item) => item.keyword === "minimum")).toBe(true);
  });

  it("root unions are unsupported on OpenAI and Gemini", () => {
    const example = EXAMPLES.find((item) => item.id === "json-union-root")!;
    const result = runPlayground(example.source, {
      kind: "json",
      typeName: "",
      optimize: false,
      constraintFallback: "description",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const openai = result.targets.find((target) => target.target.vendor === "openai");
    const gemini = result.targets.find((target) => target.target.vendor === "google");
    const anthropic = result.targets.find((target) => target.target.vendor === "anthropic");
    expect(openai?.compatibility).toBe("unsupported");
    expect(gemini?.compatibility).toBe("unsupported");
    expect(anthropic?.compatibility).not.toBe("unsupported");
  });

  it("oneOf is lossy on OpenAI", () => {
    const example = EXAMPLES.find((item) => item.id === "json-one-of")!;
    const result = runPlayground(example.source, {
      kind: "json",
      typeName: "",
      optimize: false,
      constraintFallback: "description",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const openai = result.targets.find((target) => target.target.vendor === "openai");
    expect(openai?.compatibility).toBe("lossy");
    expect(openai?.diagnostics.some((item) => item.code === "one-of-to-any-of")).toBe(true);
  });

  it("never prints a compatibility percentage", () => {
    for (const example of EXAMPLES) {
      const result = runPlayground(example.source, {
        kind: example.kind,
        typeName: example.typeName,
        optimize: false,
        constraintFallback: "description",
      });
      if (!result.ok) {
        continue;
      }
      for (const target of result.targets) {
        expect(["lossless", "runtime-safe", "lossy", "unsupported"]).toContain(
          target.compatibility,
        );
        expect(target.compatibility).not.toMatch(/\d/);
      }
    }
  });
});
