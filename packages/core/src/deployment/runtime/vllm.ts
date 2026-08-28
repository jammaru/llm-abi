import { defineRuntimeProfile } from "../types.ts";
import type { RuntimeProfile } from "../types.ts";

export const vllmRuntime: RuntimeProfile = defineRuntimeProfile({
  id: "vllm/openai",
  runtime: "vllm",
  revision: "2026-08",
  maturity: "experimental",
  evidence: "documented",
  evidenceSource: "https://docs.vllm.ai/en/stable/features/structured_outputs/",
  lastVerified: "2026-08-28",
  match: {
    apiSurface: "openai",
  },
  schemaTarget: "vllm/openai/structured",
  capabilities: {
    chatCompletions: "supported",
    nativeChat: "unknown",
    responses: "unknown",
    structuredOutput: "supported",
    tools: "supported",
    parallelTools: "unknown",
    streaming: "supported",
    statefulResponses: "unknown",
    reasoningControl: "conditional",
    vision: "unknown",
    embeddings: "unknown",
  },
  featureNotes: {
    structuredOutput: {
      reason:
        "Documented JSON Schema is response_format or extra_body structured_outputs. The backend (xgrammar, guidance, outlines) is a server flag, not a published keyword subset.",
      action: "Compile with vllm/openai/structured. Treat unlisted keywords as runtime-only.",
    },
    reasoningControl: {
      reason: "Reasoning plus structured output needs a parser and may need enable_in_reasoning.",
      action: "Set the documented server flags, or treat reasoning as unverified on this process.",
    },
    tools: {
      reason: "OpenAI-compatible tool calling is documented; the chat template still has to match.",
      action: "Confirm the served model's tool template before sending tools.",
    },
  },
});
