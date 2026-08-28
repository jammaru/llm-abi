import { defineRuntimeProfile } from "../types.ts";
import type { RuntimeProfile } from "../types.ts";

export const ollamaRuntime: RuntimeProfile = defineRuntimeProfile({
  id: "ollama/local",
  runtime: "ollama",
  revision: "2026-08",
  maturity: "experimental",
  evidence: "documented",
  evidenceSource: "https://docs.ollama.com/api/openai-compatibility",
  lastVerified: "2026-08-28",
  match: {},
  schemaTarget: "ollama/chat/structured",
  capabilities: {
    chatCompletions: "supported",
    nativeChat: "supported",
    responses: "supported",
    structuredOutput: "supported",
    tools: "supported",
    parallelTools: "unknown",
    streaming: "supported",
    statefulResponses: "unsupported",
    reasoningControl: "supported",
    vision: "supported",
    embeddings: "supported",
  },
  featureNotes: {
    statefulResponses: {
      reason:
        "Ollama Responses is non-stateful. previous_response_id and conversation are not supported.",
      action: "Send the full conversation state on each request.",
    },
    structuredOutput: {
      reason:
        "Documented structured output is native /api/chat format, not OpenAI-strict json_schema.",
      action:
        "Prefer native format for schema contracts. OpenAI response_format enforcement is unknown.",
    },
  },
});
