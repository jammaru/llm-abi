import { defineModelProfile } from "../types.ts";
import type { ModelProfile } from "../types.ts";

/**
 * Local Qwen3.8 weights. Not Alibaba Model Studio (`alibaba/qwen/tools`)
 * and not a structured-output schema profile.
 */
export const qwen38Model: ModelProfile = defineModelProfile({
  id: "qwen/qwen3.8",
  family: "qwen3.8",
  revision: "2026-08",
  evidence: "documented",
  evidenceSource: "https://huggingface.co/Qwen/Qwen3.8-27B",
  lastVerified: "2026-08-28",
  match: {
    exact: [
      "qwen3.8",
      "qwen3.8:latest",
      "qwen3.8:27b",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.8-flash-next",
    ],
    prefixes: ["qwen3.8:", "qwen3.8-flash-next", "qwen/qwen3.8-", "qwen3.8-", "ggml-org/qwen3.8-"],
    family: ["qwen3.8"],
  },
  capabilities: {
    tools: "supported",
    parallelTools: "unknown",
    vision: "supported",
    reasoning: "supported",
  },
});
