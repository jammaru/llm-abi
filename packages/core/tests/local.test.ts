import { describe, expect, it } from "vitest";
import { discoverLocalDeployments } from "../src/local/discover.ts";
import { probeDeployment } from "../src/local/probe.ts";
import type { RuntimeTransport } from "../src/local/transport.ts";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("local discovery", () => {
  it("detects LM Studio from native /api/v1/models and lists loaded models only", async () => {
    const transport: RuntimeTransport = {
      async fetch(input: string): Promise<Response> {
        if (input.includes("/api/v1/models")) {
          return jsonResponse(200, {
            models: [
              {
                key: "Qwen3.8-27B-Q4_K_M",
                architecture: "qwen3",
                format: "gguf",
                quantization: { name: "Q4_K_M" },
                loaded_instances: [{ config: { context_length: 65536, parallel: 4 } }],
              },
              {
                key: "unloaded-model",
                format: "gguf",
                loaded_instances: [],
              },
            ],
          });
        }
        return jsonResponse(404, {});
      },
    };
    const found = await discoverLocalDeployments({
      endpoints: [{ runtime: "lmstudio", baseURL: "http://127.0.0.1:1234" }],
      transport,
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.detection.runtime).toBe("lmstudio");
    expect(found[0]?.detection.confidence).toBe("exact");
    expect(found[0]?.models.map((model) => model.id)).toEqual(["Qwen3.8-27B-Q4_K_M"]);
    expect(found[0]?.deployment?.model.format).toBe("gguf");
  });

  it("does not claim llama.cpp from /v1/models alone on port 8080", async () => {
    const transport: RuntimeTransport = {
      async fetch(input: string): Promise<Response> {
        if (input.endsWith("/health")) {
          return jsonResponse(200, { status: "healthy" });
        }
        if (input.includes("/v1/models")) {
          return jsonResponse(200, { data: [{ id: "something", owned_by: "organization" }] });
        }
        return jsonResponse(404, {});
      },
    };
    const found = await discoverLocalDeployments({
      endpoints: [{ baseURL: "http://127.0.0.1:8080" }],
      transport,
    });
    expect(found).toEqual([]);
  });

  it("detects Ollama from /api/version plus /api/ps", async () => {
    const transport: RuntimeTransport = {
      async fetch(input: string): Promise<Response> {
        if (input.includes("/api/version")) {
          return jsonResponse(200, { version: "0.12.6" });
        }
        if (input.includes("/api/ps")) {
          return jsonResponse(200, {
            models: [
              {
                name: "qwen3.8:27b",
                digest: "sha256:abc",
                details: { format: "gguf", family: "qwen3", quantization_level: "Q4_K_M" },
                context_length: 4096,
              },
            ],
          });
        }
        return jsonResponse(404, {});
      },
    };
    const found = await discoverLocalDeployments({
      endpoints: [{ runtime: "ollama", baseURL: "http://127.0.0.1:11434" }],
      transport,
    });
    expect(found[0]?.detection.runtime).toBe("ollama");
    expect(found[0]?.detection.version).toBe("0.12.6");
    expect(found[0]?.models[0]?.id).toBe("qwen3.8:27b");
    expect(found[0]?.deployment?.model.family).toBe("qwen3.8");
    expect(found[0]?.deployment?.model.familySource).toBe("id-pattern");
  });
});

describe("local probe", () => {
  it("records observations without upgrading static compatibility", async () => {
    const transport: RuntimeTransport = {
      async fetch(): Promise<Response> {
        return jsonResponse(200, {
          choices: [{ message: { content: '{"status":"ABI_SENTINEL"}', tool_calls: [] } }],
        });
      },
    };
    const result = await probeDeployment({
      baseURL: "http://127.0.0.1:1234",
      model: "qwen3.8:27b",
      transport,
      input: {
        deployment: {
          runtime: { kind: "lmstudio", apiSurface: "openai", engine: { kind: "llamacpp" } },
          model: { id: "qwen3.8:27b", format: "gguf" },
        },
        request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
      },
    });
    expect(result.schemaVersion).toBe(1);
    expect(result.staticCompatibility).toBe("lossless");
    expect(
      result.observations.some((item) => item.id === "P01-chat" && item.status === "passed"),
    ).toBe(true);
    expect(
      result.observations.some((item) => item.id === "P02-structured" && item.status === "passed"),
    ).toBe(true);
    expect(result.staticCompatibility).not.toBe("unsupported");
  });

  it("treats connection failure as skipped, not unsupported", async () => {
    const transport: RuntimeTransport = {
      async fetch(): Promise<Response> {
        throw new Error("connect ECONNREFUSED");
      },
    };
    const result = await probeDeployment({
      baseURL: "http://127.0.0.1:1234",
      model: "qwen3.8:27b",
      transport,
      input: {
        deployment: {
          runtime: { kind: "ollama", apiSurface: "openai" },
          model: { id: "qwen3.8:27b" },
        },
        request: { endpoint: "chat-completions" },
      },
    });
    expect(result.skippedReason).toMatch(/ECONNREFUSED/);
    expect(result.staticCompatibility).toBe("lossless");
  });
});
