import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { check } from "../check.ts";
import { compile } from "../compile.ts";
import { listTargets } from "../targets/registry.ts";
import type { JsonSchema } from "../types.ts";
import { parseArgs } from "./args.ts";
import { HELP, renderCheck, renderCompile, renderExplain } from "./render.ts";

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
    process.stderr.write("Missing schema file.\n\n");
    process.stdout.write(`${HELP}\n`);
    return 1;
  }

  const schema = readSchema(args.file);
  if (args.command === "check") {
    const result = check(schema);
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
  const compiled = compile(schema, { target, strict: args.strict });
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

function readSchema(file: string): JsonSchema {
  const path = resolve(file);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as JsonSchema;
}

function doctor(json: boolean): number {
  const info = {
    name: "llm-abi",
    version: VERSION,
    runtime: `node ${process.version}`,
    targets: listTargets(),
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
        "",
      ].join("\n"),
    );
  }
  return 0;
}
