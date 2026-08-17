import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../src/cli/run.ts";

function withSchema(schema: unknown): string {
  const directory = mkdtempSync(join(tmpdir(), "llm-abi-"));
  const file = join(directory, "schema.json");
  writeFileSync(file, JSON.stringify(schema));
  return file;
}

describe("cli", () => {
  it("prints doctor output", () => {
    const chunks: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      expect(run(["node", "llm-abi", "doctor"])).toBe(0);
    } finally {
      process.stdout.write = original;
    }
    expect(chunks.join("")).toContain("llm-abi 0.1.0");
  });

  it("explains anthropic runtime-only constraints", () => {
    const file = withSchema({
      type: "object",
      properties: { age: { type: "number", minimum: 0 } },
      required: ["age"],
    });
    const chunks: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      expect(run(["node", "llm-abi", "explain", file, "--target", "anthropic"])).toBe(0);
    } finally {
      process.stdout.write = original;
    }
    expect(chunks.join("")).toContain("runtime-only-constraint");
  });

  it("fails --ci when a target is unsupported", () => {
    const file = withSchema({
      type: "object",
      properties: {
        value: { anyOf: [{ type: "string" }, { type: "number" }] },
      },
      required: ["value"],
    });
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      expect(run(["node", "llm-abi", "check", file, "--ci"])).toBe(1);
    } finally {
      process.stdout.write = original;
    }
  });
});
