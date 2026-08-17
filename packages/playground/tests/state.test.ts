import { describe, expect, it } from "vitest";
import {
  applyExample,
  decodeState,
  defaultState,
  encodeState,
  shareTooLong,
} from "../src/state.ts";

describe("playground state", () => {
  it("round-trips through the URL hash encoding", () => {
    const original = defaultState();
    const encoded = encodeState(original);
    expect(shareTooLong(encoded)).toBe(false);
    const decoded = decodeState(`#${encoded}`);
    expect(decoded).toEqual(original);
  });

  it("rejects a tampered payload instead of throwing", () => {
    expect(decodeState("#not-base64")).toBeUndefined();
    expect(decodeState("#")).toBeUndefined();
  });

  it("loads an example without leaking the previous source", () => {
    const dirty = {
      ...defaultState(),
      source: "type Evil = { x: string }",
      kind: "typescript" as const,
    };
    const next = applyExample(dirty, "json-tuple");
    expect(next.kind).toBe("json");
    expect(next.source).toContain("prefixItems");
    expect(next.source).not.toContain("Evil");
  });
});
