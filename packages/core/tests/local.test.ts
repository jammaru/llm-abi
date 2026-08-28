import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_ENDPOINTS,
  discoverLocalDeployments,
  pickLoadedDeployment,
  selectProbeDeployment,
} from "../src/local/discover.ts";
import { probeDeployment } from "../src/local/probe.ts";
import { readBoundedJSON } from "../src/local/transport.ts";
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

  it("picks the first loaded deployment and can filter by runtime", () => {
    expect(DEFAULT_LOCAL_ENDPOINTS.map((item) => item.baseURL)).toEqual([
      "http://127.0.0.1:1234",
      "http://127.0.0.1:11434",
      "http://127.0.0.1:8080",
    ]);
    const lmstudio = {
      baseURL: "http://127.0.0.1:1234",
      endpointKind: "loopback" as const,
      detection: { runtime: "lmstudio" as const, confidence: "exact" as const, evidence: [] },
      models: [],
    };
    const ollama = {
      baseURL: "http://127.0.0.1:11434",
      endpointKind: "loopback" as const,
      detection: { runtime: "ollama" as const, confidence: "exact" as const, evidence: [] },
      models: [{ id: "qwen3.8:27b", loaded: true }],
      deployment: {
        runtime: { kind: "ollama" as const, apiSurface: "mixed" as const },
        model: { id: "qwen3.8:27b" },
      },
    };
    expect(pickLoadedDeployment([lmstudio, ollama])?.baseURL).toBe("http://127.0.0.1:11434");
    expect(pickLoadedDeployment([lmstudio, ollama], "ollama")?.detection.runtime).toBe("ollama");
    expect(pickLoadedDeployment([lmstudio, ollama], "lmstudio")).toBeUndefined();
  });

  it("selects an explicit --model even when nothing is loaded", () => {
    const emptyLmStudio = {
      baseURL: "http://127.0.0.1:1234",
      endpointKind: "loopback" as const,
      detection: { runtime: "lmstudio" as const, confidence: "exact" as const, evidence: [] },
      models: [],
    };
    const selected = selectProbeDeployment([emptyLmStudio], { model: "Qwen3.8-27B" });
    expect(selected?.modelId).toBe("Qwen3.8-27B");
    expect(selected?.descriptor.runtime.kind).toBe("lmstudio");
    expect(selected?.descriptor.model.id).toBe("Qwen3.8-27B");
    expect(selectProbeDeployment([emptyLmStudio])).toBeUndefined();
  });
});

describe("local probe", () => {
  it("records observations without upgrading static compatibility", async () => {
    const transport: RuntimeTransport = {
      async fetch(_input: string, init?: RequestInit): Promise<Response> {
        const body =
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as { stream?: boolean; messages?: { content?: string }[] })
            : {};
        const prompt = body.messages?.[0]?.content ?? "";
        if (body.stream) {
          return new Response('data: {"choices":[{"delta":{"content":"{\\"ok\\":true}"}}]}\n\n', {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        }
        if (prompt.includes("OTHER")) {
          return jsonResponse(200, {
            choices: [{ message: { content: '{"status":"ABI_SENTINEL"}', tool_calls: [] } }],
          });
        }
        if (prompt.includes("lookup_order")) {
          return jsonResponse(200, {
            choices: [
              { message: { content: "", tool_calls: [{ function: { name: "lookup_order" } }] } },
            ],
          });
        }
        return jsonResponse(200, {
          choices: [{ message: { content: '{"ok":true}', tool_calls: [] } }],
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
    expect(
      result.observations.some((item) => item.id === "P03-enum" && item.status === "passed"),
    ).toBe(true);
    expect(
      result.observations.some((item) => item.id === "P05-stream" && item.status === "passed"),
    ).toBe(true);
  });

  it("sends Ollama structured probes to native /api/chat using the Ollama schema target", async () => {
    const urls: string[] = [];
    const bodies: unknown[] = [];
    const transport: RuntimeTransport = {
      async fetch(input: string, init?: RequestInit): Promise<Response> {
        urls.push(input);
        if (typeof init?.body === "string") {
          bodies.push(JSON.parse(init.body));
        }
        return jsonResponse(200, {
          message: { content: '{"ok":true,"status":"ABI_SENTINEL"}', tool_calls: [] },
        });
      },
    };
    await probeDeployment({
      baseURL: "http://127.0.0.1:11434",
      model: "qwen3.8:27b",
      transport,
      input: {
        deployment: {
          runtime: { kind: "ollama", apiSurface: "openai" },
          model: { id: "qwen3.8:27b", format: "gguf" },
        },
        request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
      },
    });
    expect(urls.every((url) => url.includes("/api/chat"))).toBe(true);
    expect(
      bodies.some((body) => typeof body === "object" && body !== null && "format" in body),
    ).toBe(true);
  });

  it("skips structured probes when no schema target can be resolved", async () => {
    const transport: RuntimeTransport = {
      async fetch(): Promise<Response> {
        return jsonResponse(200, { choices: [{ message: { content: "ABI_SMOKE" } }] });
      },
    };
    const result = await probeDeployment({
      baseURL: "http://127.0.0.1:1234",
      model: "Qwen3.8-27B",
      transport,
      input: {
        deployment: {
          runtime: { kind: "lmstudio", apiSurface: "openai" },
          model: { id: "Qwen3.8-27B" },
        },
        request: { endpoint: "chat-completions", structuredOutput: true },
      },
    });
    expect(result.observations.find((item) => item.id === "P02-structured")?.status).toBe(
      "skipped",
    );
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

  it("stops reading oversized probe responses", async () => {
    const body = "x".repeat(1_048_577);
    const response = new Response(body, { status: 200 });
    await expect(readBoundedJSON(response, 1024)).rejects.toThrow(/exceeded/);
  });
});
