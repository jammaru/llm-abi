import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyze } from "../analyze.ts";
import { check } from "../check.ts";
import { checkDeployment } from "../deployment/check.ts";
import { checkRequest } from "../check-request.ts";
import { compile } from "../compile.ts";
import type { CheckDeploymentInput, DeploymentRequest, RuntimeKind } from "../deployment/types.ts";
import { isPlainObject } from "../json/safe-record.ts";
import { discoverLocalDeployments, selectProbeDeployment } from "../local/discover.ts";
import {
  createDeploymentLock,
  deploymentDiff,
  diffDeploymentLocks,
  parseDeploymentLock,
} from "../local/lock.ts";
import { matrixLocalDeployments } from "../local/matrix.ts";
import { probeDeployment } from "../local/probe.ts";
import { listModelProfiles } from "../deployment/model/registry.ts";
import { listRuntimeProfiles } from "../deployment/runtime/registry.ts";
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
  renderLocalDoctor,
  renderRequest,
} from "./render.ts";
import { VERSION } from "./version.ts";

export function run(argv: readonly string[]): number | Promise<number> {
  try {
    return runInner(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function runInner(argv: readonly string[]): number | Promise<number> {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (args.kind === "help") {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (args.kind === "version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (args.kind === "doctor") {
    return doctor(args.json);
  }
  if (args.kind === "local-doctor") {
    return runLocalDoctor(args.json, args.url);
  }
  if (args.kind === "local-probe") {
    return runLocalProbe(args);
  }
  if (args.kind === "local-check") {
    return runLocalCheck(args);
  }
  if (args.kind === "local-matrix") {
    return runLocalMatrix(args);
  }
  if (args.kind === "local-lock") {
    return runLocalLock(args);
  }
  if (args.kind === "local-diff") {
    return runLocalDiff(args);
  }

  if (!args.file) {
    process.stderr.write(
      args.kind === "request" ? "Missing request file.\n\n" : "Missing schema file.\n\n",
    );
    process.stdout.write(`${HELP}\n`);
    return 1;
  }

  if (args.kind === "request") {
    return runRequest(args.file, args.json, args.ci);
  }

  const schema = readSchema(args.file);
  if (args.kind === "analyze") {
    const result = analyze(schema, { typeName: args.typeName });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderAnalyze(result)}\n`);
    }
    return 0;
  }
  if (args.kind === "check") {
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
    strict: args.kind === "compile" ? args.strict : false,
    optimize: args.optimize,
    typeName: args.typeName,
  });
  if (args.kind === "compile") {
    if (args.json) {
      process.stdout.write(`${JSON.stringify(compiled, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderCompile(compiled)}\n`);
    }
    return compiled.compatibility === "unsupported" && args.ci ? 1 : 0;
  }
  if (args.json) {
    process.stdout.write(`${JSON.stringify(compiled, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderExplain(compiled)}\n`);
  }
  return 0;
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
    runtimeTargets: listTargets({ scope: "runtime" }),
    requestProfiles: listRequestProfiles(),
    runtimeProfiles: listRuntimeProfiles(),
    modelProfiles: listModelProfiles(),
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
        "Runtime schema targets",
        ...info.runtimeTargets.map((target) => `  ${target.id}  (${target.revision})`),
        "Request profiles",
        ...info.requestProfiles.map((profile) => `  ${profile.id}  (${profile.revision})`),
        "Runtime profiles",
        ...info.runtimeProfiles.map((profile) => `  ${profile.id}  (${profile.revision})`),
        "Model profiles",
        ...info.modelProfiles.map((profile) => `  ${profile.id}  (${profile.revision})`),
        "",
      ].join("\n"),
    );
  }
  return 0;
}

async function runLocalDoctor(json: boolean, url?: string): Promise<number> {
  try {
    const discovered = await discoverLocalDeployments(
      url ? { endpoints: [{ baseURL: url }] } : undefined,
    );
    const payload = {
      schemaVersion: 1 as const,
      command: "local-doctor",
      deployments: discovered,
    };
    if (json) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderLocalDoctor(discovered)}\n`);
    }
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function runLocalProbe(args: {
  readonly json: boolean;
  readonly url?: string;
  readonly runtime?: string;
  readonly model?: string;
  readonly schema?: string;
  readonly suite: "smoke" | "full";
}): Promise<number> {
  try {
    const discovered = await discoverLocalDeployments(
      args.url
        ? { endpoints: [{ baseURL: args.url, runtime: parseRuntimeHint(args.runtime) }] }
        : undefined,
    );
    const selected = selectProbeDeployment(discovered, {
      runtime: parseRuntimeHint(args.runtime),
      model: args.model,
    });
    if (!selected) {
      const payload = {
        schemaVersion: 1 as const,
        command: "local-probe",
        skippedReason: "runtime unreachable or no loaded model",
        observations: [],
      };
      process.stdout.write(
        args.json
          ? `${JSON.stringify(payload, null, 2)}\n`
          : "No loaded local deployment to probe.\n",
      );
      return 0;
    }
    const input: CheckDeploymentInput = {
      schema: args.schema ? readSchema(args.schema) : undefined,
      deployment: selected.descriptor,
      request: {
        endpoint: "chat-completions",
        structuredOutput: true,
        tools: true,
      },
    };
    const result = await probeDeployment({
      baseURL: selected.discovered.baseURL,
      model: selected.modelId,
      input,
      suite: args.suite,
    });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      const lines = [
        `Endpoint     ${selected.discovered.baseURL}`,
        `EndpointKind ${selected.discovered.endpointKind}`,
        `Model        ${selected.modelId}`,
        `Static       ${result.staticCompatibility ?? "n/a"}`,
        "",
        "Probe",
        ...result.observations.map((item) => `  ${item.id}  ${item.status}  ${item.detail}`),
        "",
        "Probe success does not upgrade static compatibility.",
        args.model
          ? "An explicit --model may cause the runtime to load that model."
          : "Only a currently loaded model was probed.",
        "",
      ];
      process.stdout.write(`${lines.join("\n")}\n`);
    }
    return result.observations.some((item) => item.status === "failed") ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

const LOCAL_REQUEST: DeploymentRequest = {
  endpoint: "chat-completions",
  structuredOutput: true,
  tools: true,
};

async function runLocalCheck(args: {
  readonly json: boolean;
  readonly url?: string;
  readonly runtime?: string;
  readonly model?: string;
  readonly file?: string;
}): Promise<number> {
  try {
    const discovered = await discoverForLocal(args.url, args.runtime);
    const selected = selectProbeDeployment(discovered, {
      runtime: parseRuntimeHint(args.runtime),
      model: args.model,
    });
    if (!selected) {
      process.stdout.write("No loaded local deployment to check.\n");
      return 0;
    }
    const result = checkDeployment({
      schema: args.file ? readSchema(args.file) : undefined,
      deployment: selected.descriptor,
      request: LOCAL_REQUEST,
    });
    if (args.json) {
      process.stdout.write(
        `${JSON.stringify({ schemaVersion: 1, command: "local-check", result }, null, 2)}\n`,
      );
    } else {
      process.stdout.write(
        [
          `Endpoint     ${selected.discovered.baseURL}`,
          `Model        ${selected.modelId}`,
          `Compatibility ${result.compatibility}`,
          `Coverage     ${result.coverage}`,
          `SchemaTarget ${result.deployment.schemaTarget ?? "unresolved"}`,
          "",
          "No generation was performed.",
          "",
        ].join("\n"),
      );
    }
    return result.compatibility === "unsupported" ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function runLocalMatrix(args: {
  readonly json: boolean;
  readonly url?: string;
  readonly runtime?: string;
  readonly file?: string;
  readonly probe: boolean;
}): Promise<number> {
  try {
    const discovered = await discoverForLocal(args.url, args.runtime);
    const result = await matrixLocalDeployments({
      discovered,
      schema: args.file ? readSchema(args.file) : undefined,
      request: LOCAL_REQUEST,
      probe: args.probe,
    });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (result.rows.length === 0) {
      process.stdout.write("No loaded local deployments.\n");
    } else {
      const lines = [
        "Contract compatibility for loaded deployments",
        "",
        ...result.rows.map((row) => {
          const probe = row.probe
            ? row.probe.observations.some((item) => item.status === "failed")
              ? "failed"
              : "passed"
            : "n/a";
          return `${row.model}  ${row.runtime}  ${row.staticCompatibility}  probe=${probe}  ${row.coverage}`;
        }),
        "",
        "No routing was performed.",
        args.probe
          ? "Probe success does not upgrade static compatibility."
          : "No generation was performed.",
        "",
      ];
      process.stdout.write(`${lines.join("\n")}\n`);
    }
    return result.rows.some((row) => row.staticCompatibility === "unsupported") ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function runLocalLock(args: {
  readonly json: boolean;
  readonly url?: string;
  readonly runtime?: string;
  readonly model?: string;
  readonly file?: string;
  readonly out?: string;
  readonly probe: boolean;
}): Promise<number> {
  try {
    const discovered = await discoverForLocal(args.url, args.runtime);
    const selected = selectProbeDeployment(discovered, {
      runtime: parseRuntimeHint(args.runtime),
      model: args.model,
    });
    if (!selected) {
      process.stdout.write("No loaded local deployment to lock.\n");
      return 0;
    }
    const schema = args.file ? readSchema(args.file) : undefined;
    const staticResult = checkDeployment({
      schema,
      deployment: selected.descriptor,
      request: LOCAL_REQUEST,
    });
    const probe = args.probe
      ? await probeDeployment({
          baseURL: selected.discovered.baseURL,
          model: selected.modelId,
          input: { schema, deployment: selected.descriptor, request: LOCAL_REQUEST },
        })
      : undefined;
    const lock = createDeploymentLock({
      schema,
      request: LOCAL_REQUEST,
      check: staticResult,
      probe,
      packageVersion: VERSION,
    });
    const payload = JSON.stringify(lock, null, 2);
    if (args.json) {
      process.stdout.write(`${payload}\n`);
    } else {
      const out = resolve(args.out ?? "llm-abi.local.lock.json");
      writeFileSync(out, `${payload}\n`);
      process.stdout.write(`Wrote ${out}\nNo secrets or absolute paths were stored.\n`);
    }
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function runLocalDiff(args: {
  readonly json: boolean;
  readonly url?: string;
  readonly runtime?: string;
  readonly model?: string;
  readonly file?: string;
  readonly file2?: string;
}): Promise<number> {
  try {
    if (!args.file) {
      process.stderr.write("Missing lock file.\n");
      return 1;
    }
    const left = parseDeploymentLock(JSON.parse(readFileSync(resolve(args.file), "utf8")));
    if (!left) {
      process.stderr.write("Invalid lock file.\n");
      return 1;
    }
    let schema: SchemaInput | undefined;
    let right: ReturnType<typeof parseDeploymentLock>;
    if (args.file2) {
      try {
        right = parseDeploymentLock(JSON.parse(readFileSync(resolve(args.file2), "utf8")));
      } catch {
        right = undefined;
      }
      if (!right) {
        schema = readSchema(args.file2);
      }
    }
    if (!right) {
      const discovered = await discoverForLocal(args.url, args.runtime);
      const selected = selectProbeDeployment(discovered, {
        runtime: parseRuntimeHint(args.runtime),
        model: args.model,
      });
      if (!selected) {
        process.stdout.write("No loaded local deployment to compare.\n");
        return 0;
      }
      const staticResult = checkDeployment({
        schema,
        deployment: selected.descriptor,
        request: left.contract.request,
      });
      right = createDeploymentLock({
        schema,
        request: left.contract.request,
        check: staticResult,
        packageVersion: VERSION,
      });
    }
    const diff =
      schema === undefined && !args.file2
        ? deploymentDiff(diffDeploymentLocks(left, right))
        : diffDeploymentLocks(left, right);
    if (args.json) {
      process.stdout.write(`${JSON.stringify(diff, null, 2)}\n`);
    } else if (diff.drifts.length === 0) {
      process.stdout.write("No ABI drift.\n");
    } else {
      process.stdout.write(`Drift: ${diff.drifts.join(", ")}\n`);
    }
    return diff.drifts.length > 0 ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function discoverForLocal(
  url: string | undefined,
  runtime: string | undefined,
): Promise<Awaited<ReturnType<typeof discoverLocalDeployments>>> {
  return await discoverLocalDeployments(
    url ? { endpoints: [{ baseURL: url, runtime: parseRuntimeHint(runtime) }] } : undefined,
  );
}

function parseRuntimeHint(value: string | undefined): RuntimeKind | undefined {
  if (value === undefined) {
    return undefined;
  }
  const known: readonly RuntimeKind[] = [
    "lmstudio",
    "ollama",
    "llamacpp",
    "mlx-lm",
    "vllm",
    "sglang",
    "transformers",
    "unknown",
  ];
  return known.includes(value as RuntimeKind) ? (value as RuntimeKind) : undefined;
}
