import { describe, expect, it } from "vitest";
import { compatibilityHint, vendorLabel } from "../src/format.ts";

describe("playground labels", () => {
  it("uses product names instead of raw vendor ids", () => {
    expect(vendorLabel("openai")).toBe("OpenAI");
    expect(vendorLabel("google")).toBe("Gemini");
    expect(vendorLabel("alibaba")).toBe("Qwen");
    expect(vendorLabel("xai")).toBe("xAI");
    expect(vendorLabel("unknown-vendor")).toBe("unknown-vendor");
  });

  it("explains each compatibility level without a percentage", () => {
    expect(compatibilityHint("lossless")).toMatch(/keeps the input meaning/i);
    expect(compatibilityHint("runtime-safe")).toMatch(/validate/i);
    expect(compatibilityHint("lossy")).toMatch(/changed/i);
    expect(compatibilityHint("unsupported")).toMatch(/cannot represent/i);
    expect(compatibilityHint("lossless")).not.toMatch(/%|percent|score/i);
  });
});
