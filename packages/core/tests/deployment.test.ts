import { describe, expect, it } from "vitest";
import { checkDeployment } from "../src/deployment/check.ts";
import {
  inferQwen38Family,
  matchesQwen38,
  publicModelId,
} from "../src/deployment/model/identity.ts";
import { listModelProfiles, resolveModelProfile } from "../src/deployment/model/registry.ts";
import { listRuntimeProfiles, resolveRuntimeProfile } from "../src/deployment/runtime/registry.ts";
import { LlmAbiError } from "../src/errors.ts";
import { listTargets, resolveTarget } from "../src/targets/registry.ts";

const objectSchema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
} as const;

describe("target scope", () => {
  it("keeps default listTargets and check on provider profiles", () => {
    const ids = listTargets().map((target) => target.id);
    expect(ids).toHaveLength(9);
    expect(ids).not.toContain("llamacpp/server/structured");
    expect(listTargets({ scope: "runtime" }).map((target) => target.id)).toEqual([
      "llamacpp/server/structured",
      "lmstudio/gguf/structured",
      "lmstudio/mlx/structured",
      "ollama/chat/structured",
    ]);
    expect(resolveTarget("qwen").id).toBe("alibaba/qwen/tools");
    expect(resolveTarget("llamacpp").id).toBe("llamacpp/server/structured");
    expect(resolveTarget("llamacpp").scope).toBe("runtime");
  });
});

describe("model identity", () => {
  it("matches conservative Qwen3.8 ids only", () => {
    expect(matchesQwen38("Qwen3.8-27B-Q4_K_M")).toBe(true);
    expect(matchesQwen38("qwen3.8:27b")).toBe(true);
    expect(matchesQwen38("Qwen/Qwen3.8-Flash-Next")).toBe(true);
    expect(matchesQwen38("ggml-org/Qwen3.8-27B-GGUF")).toBe(true);
    expect(matchesQwen38("qwen3")).toBe(false);
    expect(matchesQwen38("qwen3:8b")).toBe(false);
    expect(matchesQwen38("qwen3.5-7b")).toBe(false);
    expect(matchesQwen38("qwen38-27b")).toBe(false);
    expect(matchesQwen38("qwen-plus")).toBe(false);
    expect(inferQwen38Family("qwen3.8:latest")).toEqual({
      family: "qwen3.8",
      source: "id-pattern",
    });
  });

  it("redacts absolute model paths to a basename", () => {
    expect(publicModelId("C:/Users/models/Qwen3.8-27B.gguf")).toBe("Qwen3.8-27B.gguf");
    expect(publicModelId("/opt/models/Qwen3.8-27B.gguf")).toBe("Qwen3.8-27B.gguf");
  });
});

describe("checkDeployment", () => {
  it("marks Ollama stateful Responses as unsupported", () => {
    const result = checkDeployment({
      deployment: {
        runtime: { kind: "ollama", apiSurface: "openai" },
        model: { id: "qwen3.8:27b", format: "gguf" },
      },
      request: { endpoint: "responses", stateful: true },
    });
    expect(result.coverage).toBe("profiled");
    expect(result.compatibility).toBe("unsupported");
    expect(result.runtime.profile?.id).toBe("ollama/local");
    expect(result.model.profile?.id).toBe("qwen/qwen3.8");
    expect(result.diagnostics.some((item) => item.code === "stateful-responses-unsupported")).toBe(
      true,
    );
    expect(result.fixes[0]?.message).toMatch(/full conversation state/);
  });

  it("does not guess LM Studio GGUF vs MLX without format", () => {
    const result = checkDeployment({
      schema: objectSchema,
      deployment: {
        runtime: { kind: "lmstudio", apiSurface: "openai" },
        model: { id: "Qwen3.8-27B" },
      },
      request: { endpoint: "chat-completions", structuredOutput: true },
    });
    expect(result.runtime.profile).toBeUndefined();
    expect(result.schema).toBeUndefined();
    expect(result.coverage).toBe("unknown");
    expect(result.diagnostics.some((item) => item.code === "schema-engine-unresolved")).toBe(true);
  });

  it("compiles through the GGUF schema target when format is known", () => {
    const result = checkDeployment({
      schema: objectSchema,
      deployment: {
        runtime: { kind: "lmstudio", apiSurface: "openai", engine: { kind: "llamacpp" } },
        model: { id: "Qwen3.8-27B-Q4_K_M", format: "gguf" },
      },
      request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
    });
    expect(result.runtime.profile?.id).toBe("lmstudio/openai/gguf");
    expect(result.schema?.target.id).toBe("lmstudio/gguf/structured");
    expect(result.compatibility).toBe("lossless");
    expect(result.coverage).toBe("profiled");
  });

  it("keeps unknown features from becoming unsupported", () => {
    const result = checkDeployment({
      deployment: {
        runtime: { kind: "mlx-lm", apiSurface: "openai" },
        model: { id: "Qwen/Qwen3.8-27B" },
      },
      request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
    });
    expect(result.runtime.profile?.id).toBe("mlx-lm/server");
    expect(result.compatibility).toBe("lossless");
    expect(result.coverage).toBe("partial");
    expect(result.diagnostics.some((item) => item.code === "runtime-feature-unknown")).toBe(true);
  });

  it("treats an unknown runtime as coverage unknown", () => {
    const result = checkDeployment({
      deployment: {
        runtime: { kind: "unknown", apiSurface: "openai" },
        model: { id: "local-model" },
      },
      request: { endpoint: "chat-completions" },
    });
    expect(result.coverage).toBe("unknown");
    expect(result.compatibility).toBe("lossless");
    expect(result.runtime.profile).toBeUndefined();
  });

  it("is deterministic", () => {
    const input = {
      deployment: {
        runtime: { kind: "llamacpp" as const, apiSurface: "openai" as const },
        model: { id: "Qwen3.8-27B", format: "gguf" as const },
      },
      request: { endpoint: "chat-completions", tools: true },
    };
    expect(checkDeployment(input)).toEqual(checkDeployment(input));
  });

  it("lists and resolves shipped profiles without leaking matchers", () => {
    expect(listRuntimeProfiles().map((item) => item.id)).toContain("ollama/local");
    expect(listModelProfiles().map((item) => item.id)).toEqual(["qwen/qwen3.8"]);
    expect(resolveRuntimeProfile("llamacpp/server").schemaTarget).toBe(
      "llamacpp/server/structured",
    );
    expect(resolveModelProfile("qwen/qwen3.8").family).toBe("qwen3.8");
    expect("capabilities" in resolveRuntimeProfile("ollama/local")).toBe(false);
    expect(() => resolveRuntimeProfile("nope")).toThrow(LlmAbiError);
  });
});
