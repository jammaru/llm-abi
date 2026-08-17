import type { JsonSchema } from "../../../core/src/types.ts";
import type { LiveEnv, LiveHttpResult } from "./types.ts";

export interface LiveAdapter {
  readonly target: string;
  readonly secretNames: readonly string[];
  post(
    schema: JsonSchema,
    key: string,
    env: LiveEnv,
    transportFetch: (
      input: string,
      init: {
        readonly method: string;
        readonly headers: Record<string, string>;
        readonly body: string;
      },
    ) => Promise<LiveHttpResult>,
  ): Promise<LiveHttpResult>;
}

const PROMPT = "Return one JSON object that matches the schema. Use dummy values.";

export function firstSecret(env: LiveEnv, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export const openaiAdapter: LiveAdapter = {
  target: "openai",
  secretNames: ["OPENAI_API_KEY"],
  post(schema, key, env, transportFetch) {
    const model = env["LLM_ABI_LIVE_OPENAI_MODEL"] ?? "gpt-4o-mini";
    return transportFetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: jsonBody({
        model,
        input: PROMPT,
        max_output_tokens: 128,
        text: {
          format: {
            type: "json_schema",
            name: "live",
            strict: true,
            schema,
          },
        },
      }),
    });
  },
};

export const anthropicAdapter: LiveAdapter = {
  target: "anthropic",
  secretNames: ["ANTHROPIC_API_KEY"],
  post(schema, key, env, transportFetch) {
    const model = env["LLM_ABI_LIVE_ANTHROPIC_MODEL"] ?? "claude-haiku-4-5";
    return transportFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: jsonBody({
        model,
        max_tokens: 128,
        messages: [{ role: "user", content: PROMPT }],
        output_config: {
          format: {
            type: "json_schema",
            schema,
          },
        },
      }),
    });
  },
};

export const geminiAdapter: LiveAdapter = {
  target: "gemini",
  secretNames: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  post(schema, key, env, transportFetch) {
    const model = env["LLM_ABI_LIVE_GEMINI_MODEL"] ?? "gemini-2.5-flash";
    return transportFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: jsonBody({
          contents: [{ parts: [{ text: PROMPT }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      },
    );
  },
};

export const LIVE_ADAPTERS: readonly LiveAdapter[] = [
  openaiAdapter,
  anthropicAdapter,
  geminiAdapter,
];
