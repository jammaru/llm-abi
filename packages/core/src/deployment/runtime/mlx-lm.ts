import { defineRuntimeProfile } from "../types.ts";
import type { RuntimeProfile } from "../types.ts";

/**
 * Explicit mlx-lm only. Do not auto-detect on port 8080.
 * Structured output and tools are not documented on the server page.
 */
export const mlxLmRuntime: RuntimeProfile = defineRuntimeProfile({
  id: "mlx-lm/server",
  runtime: "mlx-lm",
  revision: "2026-08",
  maturity: "experimental",
  evidence: "documented",
  evidenceSource: "https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/SERVER.md",
  lastVerified: "2026-08-28",
  match: {
    apiSurface: "openai",
  },
  capabilities: {
    chatCompletions: "supported",
    nativeChat: "unknown",
    responses: "unknown",
    structuredOutput: "unknown",
    tools: "unknown",
    parallelTools: "unknown",
    streaming: "unknown",
    statefulResponses: "unknown",
    reasoningControl: "unknown",
    vision: "unknown",
    embeddings: "unknown",
  },
  featureNotes: {
    structuredOutput: {
      reason:
        "mlx_lm.server documents Chat Completions sampling fields only. response_format is not listed.",
      action: "Treat structured output as unknown until a documented surface exists.",
    },
  },
});
