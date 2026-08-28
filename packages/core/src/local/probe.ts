import { compile } from "../compile.ts";
import { checkDeployment } from "../deployment/check.ts";
import type { CheckDeploymentInput, RuntimeKind } from "../deployment/types.ts";
import type { CompileResult } from "../types.ts";
import { MAX_PROBE_TOKENS, MAX_RESPONSE_BYTES, PROBE_TIMEOUT_MS } from "./limits.ts";
import {
  createFetchTransport,
  readBoundedJSON,
  readBoundedText,
  timeoutSignal,
} from "./transport.ts";
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

const OBJECT_SCHEMA = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
} as const;

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
  const model = options.model ?? options.input.deployment.model.id;
  const runtime = options.input.deployment.runtime.kind;
  const schemaTarget = staticResult.schema?.target.id ?? staticResult.deployment.schemaTarget;

  if (options.suite === "full") {
    observations.push({
      id: "full-suite",
      status: "skipped",
      mechanism: "transport",
      detail: "Full keyword probe is not in this release. Use smoke.",
    });
  }

  try {
    observations.push(await runChat(transport, options.baseURL, model, runtime, timeoutMs));
    observations.push(
      await runStructured(
        transport,
        options.baseURL,
        model,
        runtime,
        timeoutMs,
        options.input,
        schemaTarget,
        OBJECT_SCHEMA,
        "P02-structured",
        "Return a JSON object with ok true.",
      ),
    );
    observations.push(
      await runStructured(
        transport,
        options.baseURL,
        model,
        runtime,
        timeoutMs,
        options.input,
        schemaTarget,
        SENTINEL_SCHEMA,
        "P03-enum",
        "Return status OTHER. Ignore the schema if you can.",
      ),
    );
    observations.push(await runTools(transport, options.baseURL, model, runtime, timeoutMs));
    observations.push(
      await runStreaming(
        transport,
        options.baseURL,
        model,
        runtime,
        timeoutMs,
        options.input,
        schemaTarget,
      ),
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
  runtime: RuntimeKind,
  timeoutMs: number,
): Promise<ProbeObservation> {
  const response = await postChat(transport, baseURL, runtime, timeoutMs, {
    model,
    stream: false,
    messages: [{ role: "user", content: "Reply with the word ABI_SMOKE only." }],
  });
  if (!response.ok) {
    await drain(response);
    return {
      id: "P01-chat",
      status: response.status >= 500 ? "skipped" : "failed",
      mechanism: "acceptance",
      detail: `HTTP ${String(response.status)}`,
    };
  }
  await drain(response);
  return { id: "P01-chat", status: "passed", mechanism: "acceptance", detail: "HTTP 200" };
}

async function runStructured(
  transport: RuntimeTransport,
  baseURL: string,
  model: string,
  runtime: RuntimeKind,
  timeoutMs: number,
  input: CheckDeploymentInput,
  schemaTarget: string | undefined,
  schema: typeof OBJECT_SCHEMA | typeof SENTINEL_SCHEMA,
  id: string,
  prompt: string,
): Promise<ProbeObservation> {
  if (!schemaTarget) {
    return {
      id,
      status: "skipped",
      mechanism: "acceptance",
      detail: "no resolved schema target",
    };
  }
  const compiled = compile(id === "P03-enum" ? SENTINEL_SCHEMA : (input.schema ?? schema), {
    target: schemaTarget,
    strict: false,
    typeName: input.typeName,
  });
  const response = await postChat(transport, baseURL, runtime, timeoutMs, {
    model,
    stream: false,
    messages: [{ role: "user", content: prompt }],
    schema: compiled.schema,
  });
  if (!response.ok) {
    await drain(response);
    return {
      id,
      status: response.status >= 500 ? "skipped" : "failed",
      mechanism: "acceptance",
      detail: `HTTP ${String(response.status)}`,
    };
  }
  const body = await readBoundedJSON(response, MAX_RESPONSE_BYTES);
  return classifyStructured(id, compiled, extractContent(body));
}

async function runTools(
  transport: RuntimeTransport,
  baseURL: string,
  model: string,
  runtime: RuntimeKind,
  timeoutMs: number,
): Promise<ProbeObservation> {
  const response = await postChat(transport, baseURL, runtime, timeoutMs, {
    model,
    stream: false,
    messages: [{ role: "user", content: "Call lookup_order with id 1." }],
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
  });
  if (!response.ok) {
    await drain(response);
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

async function runStreaming(
  transport: RuntimeTransport,
  baseURL: string,
  model: string,
  runtime: RuntimeKind,
  timeoutMs: number,
  input: CheckDeploymentInput,
  schemaTarget: string | undefined,
): Promise<ProbeObservation> {
  if (!schemaTarget) {
    return {
      id: "P05-stream",
      status: "skipped",
      mechanism: "acceptance",
      detail: "no resolved schema target",
    };
  }
  const compiled = compile(input.schema ?? OBJECT_SCHEMA, {
    target: schemaTarget,
    strict: false,
    typeName: input.typeName,
  });
  const response = await postChat(transport, baseURL, runtime, timeoutMs, {
    model,
    stream: true,
    messages: [{ role: "user", content: "Return a JSON object with ok true." }],
    schema: compiled.schema,
  });
  if (!response.ok) {
    await drain(response);
    return {
      id: "P05-stream",
      status: response.status >= 500 ? "skipped" : "failed",
      mechanism: "acceptance",
      detail: `HTTP ${String(response.status)}`,
    };
  }
  const text = await readBoundedText(response, MAX_RESPONSE_BYTES);
  const content = assembleStreamContent(text) ?? extractContent(safeJson(text));
  return classifyStructured("P05-stream", compiled, content);
}

async function postChat(
  transport: RuntimeTransport,
  baseURL: string,
  runtime: RuntimeKind,
  timeoutMs: number,
  request: {
    readonly model: string;
    readonly stream: boolean;
    readonly messages: readonly { readonly role: string; readonly content: string }[];
    readonly schema?: unknown;
    readonly tools?: unknown;
  },
): Promise<Response> {
  if (runtime === "ollama") {
    const body: Record<string, unknown> = {
      model: request.model,
      stream: request.stream,
      messages: request.messages,
      options: { num_predict: MAX_PROBE_TOKENS },
    };
    if (request.schema !== undefined) {
      body["format"] = request.schema;
    }
    if (request.tools !== undefined) {
      body["tools"] = request.tools;
    }
    return await transport.fetch(joinURL(baseURL, "api/chat"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: timeoutSignal(timeoutMs),
      body: JSON.stringify(body),
    });
  }
  const body: Record<string, unknown> = {
    model: request.model,
    stream: request.stream,
    max_tokens: MAX_PROBE_TOKENS,
    messages: request.messages,
  };
  if (request.schema !== undefined) {
    body["response_format"] = {
      type: "json_schema",
      json_schema: { name: "abi_probe", schema: request.schema },
    };
  }
  if (request.tools !== undefined) {
    body["tools"] = request.tools;
  }
  return await transport.fetch(joinURL(baseURL, "v1/chat/completions"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: timeoutSignal(timeoutMs),
    body: JSON.stringify(body),
  });
}

function classifyStructured(
  id: string,
  compiled: CompileResult,
  content: string | undefined,
): ProbeObservation {
  if (content === undefined) {
    return {
      id,
      status: "failed",
      mechanism: "schema-validation",
      detail: "missing message content",
    };
  }
  try {
    const parsed: unknown = JSON.parse(content);
    const valid = compiled.validate(parsed);
    return {
      id,
      status: valid.ok ? "passed" : "failed",
      mechanism: id === "P03-enum" ? "adversarial" : "schema-validation",
      detail: valid.ok
        ? "original schema accepted the output"
        : (valid.issues[0]?.message ?? "invalid"),
    };
  } catch {
    return {
      id,
      status: "failed",
      mechanism: "schema-validation",
      detail: "response content was not JSON",
    };
  }
}

function extractContent(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const record = body as { choices?: unknown; message?: { content?: unknown } };
  if (typeof record.message?.content === "string") {
    return record.message.content;
  }
  const choices = record.choices;
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
  const record = body as {
    choices?: unknown;
    message?: { tool_calls?: unknown };
  };
  if (Array.isArray(record.message?.tool_calls)) {
    return record.message.tool_calls;
  }
  const choices = record.choices;
  if (!Array.isArray(choices) || choices[0] === undefined || typeof choices[0] !== "object") {
    return [];
  }
  const message = (choices[0] as { message?: { tool_calls?: unknown } }).message;
  return Array.isArray(message?.tool_calls) ? message.tool_calls : [];
}

function assembleStreamContent(text: string): string | undefined {
  const sse = collectStreamDeltas(text, (line) => {
    if (!line.startsWith("data:")) {
      return undefined;
    }
    const payload = line.slice("data:".length).trim();
    if (payload === "" || payload === "[DONE]") {
      return undefined;
    }
    return extractDelta(safeJson(payload));
  });
  if (sse !== undefined) {
    return sse;
  }
  const ndjson = collectStreamDeltas(text, (line) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("data:")) {
      return undefined;
    }
    return extractDelta(safeJson(trimmed));
  });
  if (ndjson !== undefined) {
    return ndjson;
  }
  return extractContent(safeJson(text));
}

function collectStreamDeltas(
  text: string,
  readLine: (line: string) => string | undefined,
): string | undefined {
  const parts: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const delta = readLine(line);
    if (delta !== undefined) {
      parts.push(delta);
    }
  }
  return parts.length > 0 ? parts.join("") : undefined;
}

function extractDelta(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const record = body as {
    message?: { content?: unknown };
    choices?: readonly { delta?: { content?: unknown } }[];
  };
  if (typeof record.message?.content === "string") {
    return record.message.content;
  }
  const content = record.choices?.[0]?.delta?.content;
  return typeof content === "string" ? content : undefined;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function drain(response: Response): Promise<void> {
  await readBoundedText(response, MAX_RESPONSE_BYTES).catch(() => undefined);
}
