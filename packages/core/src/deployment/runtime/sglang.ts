import { defineRuntimeProfile } from "../types.ts";
import type { RuntimeProfile } from "../types.ts";

export const sglangRuntime: RuntimeProfile = defineRuntimeProfile({
  id: "sglang/openai",
  runtime: "sglang",
  revision: "2026-08",
  maturity: "experimental",
  evidence: "documented",
  evidenceSource: "https://docs.sglang.io/docs/advanced_features/structured_outputs.md",
  lastVerified: "2026-08-28",
  match: {
    apiSurface: "openai",
  },
  schemaTarget: "sglang/openai/structured",
  capabilities: {
    chatCompletions: "supported",
    nativeChat: "unknown",
    responses: "unknown",
    structuredOutput: "supported",
    tools: "unknown",
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
        "Documented JSON Schema is OpenAI response_format.json_schema. The grammar backend is a server flag.",
      action: "Compile with sglang/openai/structured. Do not assume OpenAI-strict required-all.",
    },
    tools: {
      reason:
        "Function-calling support is model- and template-dependent and not a schema-engine claim.",
      action: "Treat tools as unknown unless you have verified the served model.",
    },
    reasoningControl: {
      reason: "Reasoning models need --reasoning-parser for grammar to apply after think tokens.",
      action: "Start the server with the documented parser, or treat reasoning as unverified.",
    },
  },
});
