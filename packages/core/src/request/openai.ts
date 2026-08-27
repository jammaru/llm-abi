import { defineRequestProfile } from "./types.ts";
import type { RequestProfile } from "./types.ts";

/**
 * GPT-5.6 Chat Completions rejects function tools unless effective
 * reasoning is `none`. Omitting `reasoning_effort` defaults to `medium`.
 *
 * Evidence (documented, 2026-08):
 * - OpenAI: https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol
 * - OpenAI: https://developers.openai.com/api/docs/guides/latest-model
 * - Azure OpenAI: https://learn.microsoft.com/azure/foundry/openai/how-to/reasoning
 */
export const openaiGpt56Request: RequestProfile = defineRequestProfile({
  id: "openai/gpt-5.6",
  vendor: "openai",
  family: "gpt-5.6",
  providers: ["openai", "azure-openai", "azure"],
  revision: "2026-08",
  evidence: "documented",
  models: {
    exact: ["gpt-5.6"],
    prefixes: ["gpt-5.6-"],
  },
  defaults: {
    reasoningEffort: "medium",
  },
  rules: [
    {
      id: "chat-tools-reasoning",
      when: {
        endpoints: ["chat-completions"],
        functionTools: true,
        reasoningNot: ["none"],
      },
      compatibility: "unsupported",
      code: "chat-tools-reasoning",
      severity: "error",
      message: "GPT-5.6 cannot combine function tools with reasoning on Chat Completions.",
      reason: "reasoning_effort is not 'none'.",
      defaultReason: "reasoning_effort defaults to 'medium' when omitted.",
      action: "Use the Responses API, or set reasoning_effort to none to stay on Chat Completions.",
      keyword: "reasoning_effort",
      path: ["reasoningEffort"],
      fixes: [
        {
          preferred: true,
          endpoint: "responses",
          message: "Send function tools with reasoning on the Responses API.",
        },
        {
          preferred: false,
          reasoningEffort: "none",
          message:
            "Stay on Chat Completions by setting reasoning_effort to none. Tool calls will not use reasoning.",
        },
      ],
    },
  ],
});
