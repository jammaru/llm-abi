import { describe, expect, it } from "vitest";
import { checkRequest } from "../src/check-request.ts";
import { LlmAbiError } from "../src/errors.ts";
import { listRequestProfiles, resolveRequestProfile } from "../src/request/registry.ts";

const gpt56ChatTools = {
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
} as const;

describe("checkRequest GPT-5.6", () => {
  it("treats omitted reasoning_effort as medium on Chat Completions with tools", () => {
    const result = checkRequest(gpt56ChatTools);
    expect(result.coverage).toBe("profiled");
    expect(result.compatibility).toBe("unsupported");
    expect(result.profile?.id).toBe("openai/gpt-5.6");
    expect(result.effective.reasoningEffort).toBe("medium");
    expect(result.effective.reasoningEffortSource).toBe("model-default");
    expect(result.effective.family).toBe("gpt-5.6");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("chat-tools-reasoning");
    expect(result.diagnostics[0]?.reason).toBe(
      "reasoning_effort defaults to 'medium' when omitted.",
    );
    expect(result.fixes[0]).toEqual({
      preferred: true,
      endpoint: "responses",
      message: "Send function tools with reasoning on the Responses API.",
    });
    expect(result.fixes[1]?.reasoningEffort).toBe("none");
  });

  it("rejects explicit non-none reasoning with function tools on Chat Completions", () => {
    for (const reasoningEffort of ["low", "medium", "high", "xhigh", "max", "minimal"] as const) {
      const result = checkRequest({ ...gpt56ChatTools, reasoningEffort });
      expect(result.compatibility).toBe("unsupported");
      expect(result.effective.reasoningEffort).toBe(reasoningEffort);
      expect(result.effective.reasoningEffortSource).toBe("explicit");
      expect(result.diagnostics[0]?.reason).toBe("reasoning_effort is not 'none'.");
    }
  });

  it("accepts Chat Completions function tools when reasoning_effort is none", () => {
    const result = checkRequest({ ...gpt56ChatTools, reasoningEffort: "none" });
    expect(result.coverage).toBe("profiled");
    expect(result.compatibility).toBe("lossless");
    expect(result.diagnostics).toEqual([]);
    expect(result.fixes).toEqual([]);
    expect(result.effective.reasoningEffort).toBe("none");
    expect(result.effective.reasoningEffortSource).toBe("explicit");
  });

  it("accepts Responses function tools with default or explicit reasoning", () => {
    const omitted = checkRequest({
      provider: "openai",
      model: "gpt-5.6-terra",
      endpoint: "responses",
      tools: true,
    });
    expect(omitted.coverage).toBe("profiled");
    expect(omitted.compatibility).toBe("lossless");
    expect(omitted.effective.reasoningEffort).toBe("medium");
    expect(omitted.effective.reasoningEffortSource).toBe("model-default");
    expect(omitted.diagnostics).toEqual([]);

    const high = checkRequest({
      provider: "openai",
      model: "gpt-5.6-sol",
      endpoint: "responses",
      tools: true,
      reasoningEffort: "high",
    });
    expect(high.compatibility).toBe("lossless");
    expect(high.diagnostics).toEqual([]);
  });

  it("does not flag Chat Completions when function tools are absent", () => {
    const result = checkRequest({
      provider: "openai",
      model: "gpt-5.6-luna",
      endpoint: "chat-completions",
    });
    expect(result.compatibility).toBe("lossless");
    expect(result.effective.tools).toBe(false);
    expect(result.effective.reasoningEffort).toBe("medium");
    expect(result.diagnostics).toEqual([]);
  });

  it("matches the GPT-5.6 family and Azure provider aliases", () => {
    const models = ["gpt-5.6", "gpt-5.6-sol", "gpt-5.6-luna", "gpt-5.6-terra-2026-07-09"];
    for (const model of models) {
      const result = checkRequest({
        provider: "openai",
        model,
        endpoint: "chat-completions",
        tools: "function",
      });
      expect(result.profile?.id).toBe("openai/gpt-5.6");
      expect(result.compatibility).toBe("unsupported");
    }

    const azure = checkRequest({
      provider: "azure-openai",
      model: "GPT-5.6-TERRA",
      endpoint: "/v1/chat/completions",
      tools: true,
    });
    expect(azure.effective.provider).toBe("azure-openai");
    expect(azure.effective.model).toBe("gpt-5.6-terra");
    expect(azure.effective.endpoint).toBe("chat-completions");
    expect(azure.compatibility).toBe("unsupported");

    const azureShort = checkRequest({
      provider: "azure",
      model: "gpt-5.6-terra",
      endpoint: "chat",
      tools: true,
    });
    expect(azureShort.effective.provider).toBe("azure");
    expect(azureShort.effective.endpoint).toBe("chat-completions");
    expect(azureShort.compatibility).toBe("unsupported");
  });

  it("is deterministic", () => {
    const first = checkRequest(gpt56ChatTools);
    const second = checkRequest(gpt56ChatTools);
    expect(first).toEqual(second);
  });
});

describe("checkRequest unknown models", () => {
  it("does not invent a GPT-5.6 rule for other models", () => {
    for (const model of ["gpt-4o", "gpt-5.5", "gpt-5.4", "claude-sonnet-4-6"]) {
      const result = checkRequest({
        provider: "openai",
        model,
        endpoint: "chat-completions",
        tools: true,
      });
      expect(result.coverage).toBe("unknown");
      expect(result.compatibility).toBe("lossless");
      expect(result.profile).toBeUndefined();
      expect(result.effective.reasoningEffort).toBeUndefined();
      expect(result.effective.reasoningEffortSource).toBe("omitted");
      expect(result.diagnostics).toEqual([]);
    }
  });
});

describe("checkRequest validation", () => {
  it("throws on missing fields and unknown values", () => {
    expect(() =>
      checkRequest({ provider: "", model: "gpt-5.6-terra", endpoint: "chat-completions" }),
    ).toThrow(LlmAbiError);
    expect(() =>
      checkRequest({ provider: "openai", model: "", endpoint: "chat-completions" }),
    ).toThrow(LlmAbiError);
    expect(() =>
      checkRequest({ provider: "openai", model: "gpt-5.6-terra", endpoint: "batch" }),
    ).toThrow(/Unknown endpoint/);
    expect(() =>
      checkRequest({
        provider: "openai",
        model: "gpt-5.6-terra",
        endpoint: "chat-completions",
        reasoningEffort: "ultra" as never,
      }),
    ).toThrow(/Unknown reasoningEffort/);
    expect(() =>
      checkRequest({
        provider: "openai",
        model: "a".repeat(257),
        endpoint: "chat-completions",
      }),
    ).toThrow(/exceeds 256/);
  });
});

describe("request profiles", () => {
  it("lists and resolves the shipped GPT-5.6 profile", () => {
    expect(listRequestProfiles().map((profile) => profile.id)).toEqual(["openai/gpt-5.6"]);
    const profile = resolveRequestProfile("openai/gpt-5.6");
    expect(profile.evidence).toBe("documented");
    expect(profile.defaults.reasoningEffort).toBe("medium");
    expect(() => resolveRequestProfile("openai/gpt-5.7")).toThrow(/Unknown request profile/);
  });
});
