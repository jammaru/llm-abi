import { defineRuntimeProfile } from "../types.ts";
import type { RuntimeProfile } from "../types.ts";

export const llamaCppRuntime: RuntimeProfile = defineRuntimeProfile({
  id: "llamacpp/server",
  runtime: "llamacpp",
  revision: "2026-08",
  maturity: "experimental",
  evidence: "documented",
  evidenceSource: "https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md",
  lastVerified: "2026-08-28",
  match: {},
  schemaTarget: "llamacpp/server/structured",
  capabilities: {
    chatCompletions: "supported",
    nativeChat: "unknown",
    responses: "supported",
    structuredOutput: "supported",
    tools: "conditional",
    parallelTools: "unknown",
    streaming: "supported",
    statefulResponses: "unknown",
    reasoningControl: "unknown",
    vision: "conditional",
    embeddings: "unknown",
  },
  featureNotes: {
    tools: {
      reason: "Function calling is documented only with --jinja, and may need a chat template.",
      action: "Start llama-server with --jinja, or treat tools as unverified on this process.",
    },
    vision: {
      reason: "Multimodal support depends on the loaded model, not the server surface alone.",
      action: "Check /v1/models or /props for modalities before sending images.",
    },
  },
});
