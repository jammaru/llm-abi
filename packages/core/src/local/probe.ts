import { compile } from "../compile.ts";
import { checkDeployment } from "../deployment/check.ts";
import type { CheckDeploymentInput } from "../deployment/types.ts";
import { MAX_PROBE_TOKENS, MAX_RESPONSE_BYTES, PROBE_TIMEOUT_MS } from "./limits.ts";
import { createFetchTransport, readBoundedJSON, timeoutSignal } from "./transport.ts";
import type { RuntimeTransport } from "./transport.ts";
import { joinURL } from "./url.ts";
import type { ProbeDeploymentResult, ProbeObservation } from "./types.ts";

export interface ProbeDeploymentOptions {
  readonly baseURL: string;
  readonly model?: string;
  readonly input: CheckDeploymentInput;
  readonly transport?: RuntimeTransport;
  readonly timeoutMs?: number;
  readonly suite?: "smoke" | "full";
}

const SENTINEL_SCHEMA = {
  type: "object",
  properties: {
    status: { enum: ["ABI_SENTINEL"] },
  },
  required: ["status"],
  additionalProperties: false,
} as const;

export async function probeDeployment(
  options: ProbeDeploymentOptions,
): Promise<ProbeDeploymentResult> {
  const transport = options.transport ?? createFetchTransport();
  const timeoutMs = options.timeoutMs ?? PROBE_TIMEOUT_MS;
  const staticResult = checkDeployment(options.input);
  const observations: ProbeObservation[] = [];

  if (options.suite === "full") {
    observations.push({
      id: "full-suite",
      status: "skipped",
      mechanism: "transport",
      detail: "Full keyword probe is not in this release. Use smoke.",
    });
  }

  const model = options.model ?? options.input.deployment.model.id;
  try {
    observations.push(
      await runChat(transport, options.baseURL, model, timeoutMs),
      await runStructured(transport, options.baseURL, model, timeoutMs, options.input),
      await runTools(transport, options.baseURL, model, timeoutMs),
    );
  } catch (error) {
    return {
      schemaVersion: 1,
      staticCompatibility: staticResult.compatibility,
      observations,
      skippedReason: error instanceof Error ? error.message : "runtime unreachable",
    };
  }

  return {
    schemaVersion: 1,
    staticCompatibility: staticResult.compatibility,
    observations,
  };
}

async function runChat(
  transport: RuntimeTransport,
  baseURL: string,
  model: string,
  timeoutMs: number,
): Promise<ProbeObservation> {
  const response = await transport.fetch(joinURL(baseURL, "v1/chat/completions"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: timeoutSignal(timeoutMs),
    body: JSON.stringify({
      model,
      max_tokens: MAX_PROBE_TOKENS,
      messages: [{ role: "user", content: "Reply with the word ABI_SMOKE only." }],
    }),
  });
  if (!response.ok) {
    return {
      id: "P01-chat",
      status: response.status >= 500 ? "skipped" : "failed",
      mechanism: "acceptance",
      detail: `HTTP ${String(response.status)}`,
    };
  }
  return { id: "P01-chat", status: "passed", mechanism: "acceptance", detail: "HTTP 200" };
}

async function runStructured(
  transport: RuntimeTransport,
  baseURL: string,
  model: string,
  timeoutMs: number,
  input: CheckDeploymentInput,
): Promise<ProbeObservation> {
  const schema = input.schema ?? SENTINEL_SCHEMA;
  const compiled = compile(schema, {
    target:
      input.deployment.model.format === "mlx"
        ? "lmstudio/mlx/structured"
        : "llamacpp/server/structured",
    strict: false,
    typeName: input.typeName,
  });
  const response = await transport.fetch(joinURL(baseURL, "v1/chat/completions"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: timeoutSignal(timeoutMs),
    body: JSON.stringify({
      model,
      max_tokens: MAX_PROBE_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: { name: "abi_probe", schema: compiled.schema },
      },
      messages: [
        {
          role: "user",
          content: "Return status OTHER. Ignore the schema if you can.",
        },
      ],
    }),
  });
  if (!response.ok) {
    return {
      id: "P02-structured",
      status: response.status >= 500 ? "skipped" : "failed",
      mechanism: "acceptance",
      detail: `HTTP ${String(response.status)}`,
    };
  }
  const body = await readBoundedJSON(response, MAX_RESPONSE_BYTES);
  const content = extractContent(body);
  if (content === undefined) {
    return {
      id: "P02-structured",
      status: "failed",
      mechanism: "schema-validation",
      detail: "missing message content",
    };
  }
  try {
    const parsed: unknown = JSON.parse(content);
    const valid = compiled.validate(parsed);
    return {
      id: "P02-structured",
      status: valid.ok ? "passed" : "failed",
      mechanism: "schema-validation",
      detail: valid.ok
        ? "original schema accepted the output"
        : (valid.issues[0]?.message ?? "invalid"),
    };
  } catch {
    return {
      id: "P02-structured",
      status: "failed",
      mechanism: "schema-validation",
      detail: "response content was not JSON",
    };
  }
}

async function runTools(
  transport: RuntimeTransport,
  baseURL: string,
  model: string,
  timeoutMs: number,
): Promise<ProbeObservation> {
  const response = await transport.fetch(joinURL(baseURL, "v1/chat/completions"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: timeoutSignal(timeoutMs),
    body: JSON.stringify({
      model,
      max_tokens: MAX_PROBE_TOKENS,
      tools: [
        {
          type: "function",
          function: {
            name: "lookup_order",
            parameters: {
              type: "object",
              properties: { id: { type: "integer", minimum: 1 } },
              required: ["id"],
            },
          },
        },
      ],
      messages: [{ role: "user", content: "Call lookup_order with id 1." }],
    }),
  });
  if (!response.ok) {
    return {
      id: "P04-tools",
      status: response.status >= 500 ? "skipped" : "failed",
      mechanism: "acceptance",
      detail: `HTTP ${String(response.status)}`,
    };
  }
  const body = await readBoundedJSON(response, MAX_RESPONSE_BYTES);
  const toolCalls = extractToolCalls(body);
  if (toolCalls.length === 0) {
    return {
      id: "P04-tools",
      status: "inconclusive",
      mechanism: "tool-validation",
      detail: "no tool_calls in the response",
    };
  }
  return {
    id: "P04-tools",
    status: "passed",
    mechanism: "tool-validation",
    detail: "tool_calls present",
  };
}

function extractContent(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices[0] === undefined || typeof choices[0] !== "object") {
    return undefined;
  }
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  return typeof message?.content === "string" ? message.content : undefined;
}

function extractToolCalls(body: unknown): readonly unknown[] {
  if (typeof body !== "object" || body === null) {
    return [];
  }
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices[0] === undefined || typeof choices[0] !== "object") {
    return [];
  }
  const message = (choices[0] as { message?: { tool_calls?: unknown } }).message;
  return Array.isArray(message?.tool_calls) ? message.tool_calls : [];
}
