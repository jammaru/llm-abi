import { describe, expect, it } from "vitest";
import { check } from "../src/check.ts";
import { listTargets } from "../src/targets/registry.ts";

describe("check", () => {
  it("returns a row for every built-in target", () => {
    const result = check({
      type: "object",
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
    });
    expect(result.results.map((row) => row.target.id).toSorted()).toEqual(
      listTargets()
        .map((target) => target.id)
        .toSorted(),
    );
    expect(result.results.every((row) => row.size.tokens > 0)).toBe(true);
  });
});
