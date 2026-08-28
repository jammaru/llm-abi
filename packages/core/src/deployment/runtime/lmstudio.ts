import { defineRuntimeProfile } from "../types.ts";
import type { RuntimeProfile } from "../types.ts";

const LM_STUDIO_API = {
  chatCompletions: "supported",
  nativeChat: "supported",
  responses: "supported",
  structuredOutput: "supported",
  tools: "supported",
  parallelTools: "unknown",
  streaming: "supported",
  statefulResponses: "supported",
  reasoningControl: "supported",
  vision: "unknown",
  embeddings: "supported",
} as const;

export const lmStudioGgufRuntime: RuntimeProfile = defineRuntimeProfile({
  id: "lmstudio/openai/gguf",
  runtime: "lmstudio",
  revision: "2026-08",
  maturity: "experimental",
  evidence: "documented",
  evidenceSource: "https://lmstudio.ai/docs/developer/openai-compat/structured-output",
  lastVerified: "2026-08-28",
  match: {
    apiSurface: "openai",
    modelFormats: ["gguf"],
    engines: ["llamacpp"],
  },
  schemaTarget: "lmstudio/gguf/structured",
  capabilities: LM_STUDIO_API,
});

export const lmStudioMlxRuntime: RuntimeProfile = defineRuntimeProfile({
  id: "lmstudio/openai/mlx",
  runtime: "lmstudio",
  revision: "2026-08",
  maturity: "experimental",
  evidence: "documented",
  evidenceSource: "https://lmstudio.ai/docs/developer/openai-compat/structured-output",
  lastVerified: "2026-08-28",
  match: {
    apiSurface: "openai",
    modelFormats: ["mlx"],
    engines: ["mlx", "outlines"],
  },
  schemaTarget: "lmstudio/mlx/structured",
  capabilities: LM_STUDIO_API,
});
