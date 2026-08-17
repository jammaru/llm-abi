import { posix, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import type { GithubEvent, SelectedFile, SelectionResult } from "./types.ts";
import { OperationalError } from "./types.ts";

interface SelectOptions {
  readonly workspace: string;
  readonly workingDirectory: string;
  readonly patterns: readonly string[];
  readonly changedOnly: boolean;
  readonly baseRef?: string;
  readonly event: GithubEvent;
}

export function selectFiles(options: SelectOptions): SelectionResult {
  const workingDirectory = resolve(options.workspace, options.workingDirectory);
  const relativeWorkingDirectory = normalizePath(relative(options.workspace, workingDirectory));
  if (relativeWorkingDirectory === ".." || relativeWorkingDirectory.startsWith("../")) {
    throw new OperationalError("working-directory must be inside GITHUB_WORKSPACE");
  }

  const pullRequest = options.event.pull_request;
  const baseRef = options.baseRef ?? pullRequest?.base.sha;
  if (options.changedOnly && pullRequest) {
    const headRef = pullRequest.head.sha;
    const diff = runGit(
      ["diff", "--name-status", "-M", `${baseRef}...${headRef}`, "--"],
      options.workspace,
    );
    return {
      files: parseDiffOutput(diff)
        .filter((file) =>
          matchesPatterns(
            pathInsideWorkingDirectory(file.path, relativeWorkingDirectory),
            options.patterns,
          ),
        )
        .toSorted((left, right) => left.path.localeCompare(right.path)),
      baseRef,
    };
  }

  const listed = runGit(
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    options.workspace,
  );
  const files = listed
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((path) =>
      matchesPatterns(pathInsideWorkingDirectory(path, relativeWorkingDirectory), options.patterns),
    )
    .map((path): SelectedFile => ({ path, basePath: path, status: "existing" }))
    .toSorted((left, right) => left.path.localeCompare(right.path));
  return { files, baseRef };
}

export function parseDiffOutput(output: string): readonly SelectedFile[] {
  const files: SelectedFile[] = [];
  for (const line of output.split(/\r?\n/u)) {
    if (!line) {
      continue;
    }
    const [rawStatus, firstPath, secondPath] = line.split("\t");
    if (!rawStatus || !firstPath || rawStatus.startsWith("D")) {
      continue;
    }
    if (rawStatus.startsWith("R") && secondPath) {
      files.push({ path: secondPath, basePath: firstPath, status: "renamed" });
      continue;
    }
    if (rawStatus.startsWith("C") && secondPath) {
      files.push({ path: secondPath, basePath: firstPath, status: "copied" });
      continue;
    }
    if (rawStatus.startsWith("A")) {
      files.push({ path: firstPath, status: "added" });
      continue;
    }
    files.push({ path: firstPath, basePath: firstPath, status: "modified" });
  }
  return files;
}

export function matchesPatterns(
  candidate: string | undefined,
  patterns: readonly string[],
): boolean {
  if (!candidate) {
    return false;
  }
  const included = patterns.filter((pattern) => !pattern.startsWith("!"));
  const excluded = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => pattern.slice(1));
  return (
    included.some((pattern) => posix.matchesGlob(candidate, normalizePattern(pattern))) &&
    !excluded.some((pattern) => posix.matchesGlob(candidate, normalizePattern(pattern)))
  );
}

export function readBaseSchema(
  file: SelectedFile,
  baseRef: string | undefined,
  workspace: string,
): string | undefined {
  if (!baseRef || file.status === "added") {
    return undefined;
  }
  const basePath = file.basePath ?? file.path;
  const result = spawnSync("git", ["show", `${baseRef}:${basePath}`], {
    cwd: workspace,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status === 0) {
    return result.stdout;
  }
  if (file.status === "existing") {
    return undefined;
  }
  throw new OperationalError(
    `Unable to read ${basePath} from ${baseRef}: ${result.stderr.trim() || "git show failed"}`,
  );
}

function runGit(arguments_: readonly string[], cwd: string): string {
  const result = spawnSync("git", arguments_, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new OperationalError(result.stderr.trim() || `git ${arguments_.join(" ")} failed`);
  }
  return result.stdout;
}

function pathInsideWorkingDirectory(
  repositoryPath: string,
  relativeWorkingDirectory: string,
): string | undefined {
  const normalized = normalizePath(repositoryPath);
  if (!relativeWorkingDirectory || relativeWorkingDirectory === ".") {
    return normalized;
  }
  const prefix = `${relativeWorkingDirectory}/`;
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : undefined;
}

function normalizePath(value: string): string {
  return value.split(sep).join("/");
}

function normalizePattern(value: string): string {
  return value.replace(/^\.\//u, "").replaceAll("\\", "/");
}
