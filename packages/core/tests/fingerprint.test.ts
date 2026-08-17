import { describe, expect, it } from "vitest";
import { compile } from "../src/compile.ts";
import { fingerprint } from "../src/fingerprint.ts";

describe("fingerprint", () => {
  it("is stable across property order", () => {
    const a = {
      type: "object",
      properties: { a: { type: "string" }, b: { type: "number" } },
    };
    const b = {
      type: "object",
      properties: { b: { type: "number" }, a: { type: "string" } },
    };
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint(a).startsWith("sha256:")).toBe(true);
  });

  it("compile output is deterministic", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string", minLength: 1 } },
      required: ["name"],
    };
    const first = compile(schema, "anthropic");
    const second = compile(schema, "anthropic");
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.schema).toEqual(second.schema);
  });
});
