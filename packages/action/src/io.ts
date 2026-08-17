import { appendFileSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { ActionInputs, GithubEvent } from "./types.ts";
import { OperationalError } from "./types.ts";

const DEFAULT_PATTERNS = ["**/*.schema.json", "**/schema.json"];

export function readInputs(environment: NodeJS.ProcessEnv = process.env): ActionInputs {
  const rawPatterns = getInput("schema-files", environment);
  const patterns = (rawPatterns ? rawPatterns.split(/\r?\n/u) : DEFAULT_PATTERNS)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
  if (patterns.length === 0) {
    throw new OperationalError("schema-files must include at least one path or glob pattern");
  }
  const baseRef = getInput("base-ref", environment) || undefined;
  const githubToken = getInput("github-token", environment) || undefined;
  return {
    patterns,
    changedOnly: readBooleanInput("changed-only", true, environment),
    workingDirectory: getInput("working-directory", environment) || ".",
    baseRef,
    comment: readBooleanInput("comment", false, environment),
    githubToken,
  };
}

export function readEvent(environment: NodeJS.ProcessEnv = process.env): GithubEvent {
  const eventPath = environment.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(eventPath, "utf8")) as GithubEvent;
  } catch (error) {
    throw new OperationalError(
      `Unable to read GITHUB_EVENT_PATH: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function writeOutput(
  name: string,
  value: string | number,
  environment: NodeJS.ProcessEnv = process.env,
): void {
  const outputPath = environment.GITHUB_OUTPUT;
  if (!outputPath) {
    process.stdout.write(`${name}=${String(value)}\n`);
    return;
  }
  const delimiter = `llm_abi_${randomUUID()}`;
  appendFileSync(outputPath, `${name}<<${delimiter}\n${String(value)}\n${delimiter}\n`, "utf8");
}

export function writeSummary(markdown: string, environment: NodeJS.ProcessEnv = process.env): void {
  const summaryPath = environment.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }
  appendFileSync(summaryPath, `${markdown}\n`, "utf8");
}

export function warning(message: string): void {
  process.stdout.write(`::warning::${escapeWorkflowCommand(message)}\n`);
}

export function error(message: string): void {
  process.stdout.write(`::error::${escapeWorkflowCommand(message)}\n`);
}

function getInput(name: string, environment: NodeJS.ProcessEnv): string {
  return environment[`INPUT_${name.replaceAll(" ", "_").toUpperCase()}`]?.trim() ?? "";
}

function readBooleanInput(
  name: string,
  fallback: boolean,
  environment: NodeJS.ProcessEnv,
): boolean {
  const value = getInput(name, environment);
  if (!value) {
    return fallback;
  }
  if (/^(?:true|1|yes)$/iu.test(value)) {
    return true;
  }
  if (/^(?:false|0|no)$/iu.test(value)) {
    return false;
  }
  throw new OperationalError(`${name} must be true or false`);
}

function escapeWorkflowCommand(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}
