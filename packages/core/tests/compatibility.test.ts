import { describe, expect, it } from "vitest";
import { worseCompatibility, worstCompatibility } from "../src/compatibility/rank.ts";

describe("compatibility rank", () => {
  it("returns lossless when nothing is worse", () => {
    expect(worstCompatibility([])).toBe("lossless");
    expect(worstCompatibility(["lossless", "lossless"])).toBe("lossless");
  });

  it("picks the worst level", () => {
    expect(worstCompatibility(["lossless", "runtime-safe", "lossy"])).toBe("lossy");
    expect(worseCompatibility("runtime-safe", "unsupported")).toBe("unsupported");
    expect(worseCompatibility("unsupported", "lossy")).toBe("unsupported");
  });
});
