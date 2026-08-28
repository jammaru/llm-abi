import { describe, expect, it } from "vitest";
import { importLocalDoctor } from "../src/local-import.ts";

const SCHEMA = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
} as const;

describe("playground local doctor import", () => {
  it("evaluates pasted doctor JSON without treating empty paste as an error", () => {
    expect(importLocalDoctor("", SCHEMA)).toEqual({ ok: true, rows: [] });
  });

  it("rejects localhost-looking payloads that are not doctor JSON", () => {
    const result = importLocalDoctor(JSON.stringify({ url: "http://127.0.0.1:1234" }), SCHEMA);
    expect(result.ok).toBe(false);
  });

  it("checks a pasted LM Studio GGUF deployment statically", () => {
    const result = importLocalDoctor(
      JSON.stringify({
        schemaVersion: 1,
        command: "local-doctor",
        deployments: [
          {
            deployment: {
              runtime: { kind: "lmstudio", apiSurface: "openai", engine: { kind: "llamacpp" } },
              model: { id: "Qwen3.8-27B-Q4_K_M", format: "gguf" },
            },
          },
        ],
      }),
      SCHEMA,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.rows[0]?.schemaTarget).toBe("lmstudio/gguf/structured");
    expect(result.rows[0]?.compatibility).not.toBe("unsupported");
  });

  it("expands every loaded model from doctor JSON, not only the first deployment", () => {
    const result = importLocalDoctor(
      JSON.stringify({
        schemaVersion: 1,
        command: "local-doctor",
        deployments: [
          {
            detection: { runtime: "lmstudio" },
            models: [
              { id: "Qwen3.8-27B-Q4_K_M", format: "gguf", engine: "llamacpp" },
              { id: "Qwen3.8-27B-MLX", format: "mlx", engine: "mlx" },
            ],
            deployment: {
              runtime: { kind: "lmstudio", apiSurface: "openai", engine: { kind: "llamacpp" } },
              model: { id: "Qwen3.8-27B-Q4_K_M", format: "gguf" },
            },
          },
        ],
      }),
      SCHEMA,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.rows.map((row) => row.schemaTarget)).toEqual([
      "lmstudio/gguf/structured",
      "lmstudio/mlx/structured",
    ]);
  });

  it("skips a malformed doctor row instead of failing the whole paste", () => {
    const result = importLocalDoctor(
      JSON.stringify({
        schemaVersion: 1,
        command: "local-doctor",
        deployments: [
          {
            models: [{ id: "broken" }],
            detection: { runtime: "not-a-runtime" },
          },
          {
            detection: { runtime: "lmstudio" },
            models: [{ id: "Qwen3.8-27B-Q4_K_M", format: "gguf", engine: "llamacpp" }],
          },
        ],
      }),
      SCHEMA,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.rows.map((row) => row.model)).toEqual(["Qwen3.8-27B-Q4_K_M"]);
  });
});
