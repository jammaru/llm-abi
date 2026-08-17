import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli/args.ts";
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

  it("prints conservative token counts for check and analyze", () => {
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
      expect(run(["node", "llm-abi", "check", file])).toBe(0);
      expect(run(["node", "llm-abi", "analyze", file])).toBe(0);
      expect(run(["node", "llm-abi", "explain", file, "--target", "openai"])).toBe(0);
    } finally {
      process.stdout.write = original;
    }
    const output = chunks.join("");
    expect(output).toContain("Tokens");
    expect(output).toContain("UTF-8 bytes / 3");
    expect(output).toContain("bytes  (~");
    expect(output).not.toContain("%");
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

  it("passes --ci when constraints require runtime validation", () => {
    const file = withSchema({
      type: "object",
      properties: { age: { type: "number", minimum: 0 } },
      required: ["age"],
    });
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      expect(run(["node", "llm-abi", "check", file, "--ci"])).toBe(0);
    } finally {
      process.stdout.write = original;
    }
  });

  it("passes --ci when a target is lossy but supported", () => {
    const file = withSchema({
      type: "object",
      minProperties: 1,
      additionalProperties: {
        type: "string",
      },
    });
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      expect(run(["node", "llm-abi", "check", file, "--ci"])).toBe(0);
    } finally {
      process.stdout.write = original;
    }
  });

  it("reads a .ts file as TypeScript type syntax", () => {
    const directory = mkdtempSync(join(tmpdir(), "llm-abi-"));
    const file = join(directory, "user.ts");
    writeFileSync(file, "export type User = { name: string; age: number };\n", "utf8");
    const chunks: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      expect(run(["node", "llm-abi", "check", file, "--type", "User"])).toBe(0);
    } finally {
      process.stdout.write = original;
    }
    expect(chunks.join("")).toContain("PASS");
  });

  it("accepts a schema path after --", () => {
    expect(parseArgs(["node", "llm-abi", "check", "--ci", "--json", "--", "-weird.json"])).toEqual({
      command: "check",
      file: "-weird.json",
      target: undefined,
      json: true,
      ci: true,
      strict: false,
      optimize: false,
      typeName: undefined,
      help: false,
      version: false,
    });
  });
});
