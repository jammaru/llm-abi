import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyze } from "../analyze.ts";
import { check } from "../check.ts";
import { checkRequest } from "../check-request.ts";
import { compile } from "../compile.ts";
import { isPlainObject } from "../json/safe-record.ts";
import { listRequestProfiles } from "../request/registry.ts";
import type { CheckRequestInput, ReasoningEffort } from "../request/types.ts";
import { listTargets } from "../targets/registry.ts";
import type { JsonSchema, SchemaInput } from "../types.ts";
import { parseArgs } from "./args.ts";
import {
  HELP,
  renderAnalyze,
  renderCheck,
  renderCompile,
  renderExplain,
  renderRequest,
} from "./render.ts";

const VERSION = "0.1.0";

export function run(argv: readonly string[]): number {
  try {
    return runInner(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function runInner(argv: readonly string[]): number {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (args.command === "help") {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (args.command === "version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (args.command === "doctor") {
    return doctor(args.json);
  }

  if (!args.file) {
    process.stderr.write(
      args.command === "request" ? "Missing request file.\n\n" : "Missing schema file.\n\n",
    );
    process.stdout.write(`${HELP}\n`);
    return 1;
  }

  if (args.command === "request") {
    return runRequest(args.file, args.json, args.ci);
  }

  const schema = readSchema(args.file);
  if (args.command === "analyze") {
    const result = analyze(schema, { typeName: args.typeName });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderAnalyze(result)}\n`);
    }
    return 0;
  }
  if (args.command === "check") {
    const result = check(schema, { optimize: args.optimize, typeName: args.typeName });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderCheck(result)}\n`);
    }
    if (args.ci && result.results.some((row) => row.compatibility === "unsupported")) {
      return 1;
    }
    return 0;
  }

  const target = args.target ?? "openai";
  const compiled = compile(schema, {
    target,
    strict: args.strict,
    optimize: args.optimize,
    typeName: args.typeName,
  });
  if (args.command === "compile") {
    if (args.json) {
      process.stdout.write(`${JSON.stringify(compiled, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderCompile(compiled)}\n`);
    }
    return compiled.compatibility === "unsupported" && args.ci ? 1 : 0;
  }
  if (args.command === "explain") {
    if (args.json) {
      process.stdout.write(`${JSON.stringify(compiled, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderExplain(compiled)}\n`);
    }
    return 0;
  }

  return 1;
}

function readSchema(file: string): SchemaInput {
  const path = resolve(file);
  const raw = readFileSync(path, "utf8");
  if (/\.(?:d\.)?[cm]?ts$/i.test(path)) {
    return raw;
  }
  return JSON.parse(raw) as JsonSchema;
}

function runRequest(file: string, json: boolean, ci: boolean): number {
  const request = readRequest(file);
  const result = checkRequest(request);
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderRequest(result)}\n`);
  }
  return ci && result.compatibility === "unsupported" ? 1 : 0;
}

function readRequest(file: string): CheckRequestInput {
  const path = resolve(file);
  const raw = readFileSync(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isPlainObject(parsed)) {
    throw new Error("Request file must be a JSON object.");
  }
  const provider = parsed["provider"];
  const model = parsed["model"];
  const endpoint = parsed["endpoint"];
  if (typeof provider !== "string" || typeof model !== "string" || typeof endpoint !== "string") {
    throw new Error("Request file must include string provider, model, and endpoint.");
  }
  const input: {
    provider: string;
    model: string;
    endpoint: string;
    tools?: boolean | "function";
    reasoningEffort?: ReasoningEffort;
  } = { provider, model, endpoint };
  const tools = parsed["tools"];
  if (tools !== undefined) {
    if (tools !== true && tools !== false && tools !== "function") {
      throw new Error('Request tools must be true, false, or "function".');
    }
    input.tools = tools;
  }
  const reasoningEffort = parsed["reasoningEffort"];
  if (reasoningEffort !== undefined) {
    if (typeof reasoningEffort !== "string") {
      throw new Error("Request reasoningEffort must be a string.");
    }
    input.reasoningEffort = reasoningEffort as ReasoningEffort;
  }
  return input;
}

function doctor(json: boolean): number {
  const info = {
    name: "llm-abi",
    version: VERSION,
    runtime: `node ${process.version}`,
    targets: listTargets(),
    requestProfiles: listRequestProfiles(),
  };
  if (json) {
    process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        `llm-abi ${VERSION}`,
        `Runtime   ${info.runtime}`,
        "Targets",
        ...info.targets.map((target) => `  ${target.id}  (${target.revision})`),
        "Request profiles",
        ...info.requestProfiles.map((profile) => `  ${profile.id}  (${profile.revision})`),
        "",
      ].join("\n"),
    );
  }
  return 0;
}
