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
  const relativeWorkingDirectory = workspaceRelativeDirectory(
    options.workspace,
    options.workingDirectory,
  );

  const pullRequest = options.event.pull_request;
  const baseRef = options.baseRef ?? pullRequest?.base.sha;
  if (options.changedOnly && pullRequest) {
    const resolvedBase = assertGitRef(baseRef, "base-ref");
    const resolvedHead = assertGitRef(pullRequest.head.sha, "pull request head SHA");
    const diff = runGit(
      ["diff", "--name-status", "-M", `${resolvedBase}...${resolvedHead}`, "--"],
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
      baseRef: resolvedBase,
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
  if (!options.changedOnly) {
    const relativePaths = files
      .map((file) => pathInsideWorkingDirectory(file.path, relativeWorkingDirectory))
      .filter((path): path is string => path !== undefined);
    const missing = unmatchedLiteralPatterns(options.patterns, relativePaths);
    if (missing[0]) {
      throw new OperationalError(`schema file not found: ${missing[0]}`);
    }
  }
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
    if (rawStatus.startsWith("R") || rawStatus.startsWith("C")) {
      if (!secondPath) {
        continue;
      }
      files.push({
        path: secondPath,
        basePath: firstPath,
        status: rawStatus.startsWith("R") ? "renamed" : "copied",
      });
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

export function isGlobPattern(pattern: string): boolean {
  return /[*?[{]/u.test(normalizePattern(pattern));
}

export function unmatchedLiteralPatterns(
  patterns: readonly string[],
  relativePaths: readonly string[],
): readonly string[] {
  const present = new Set(relativePaths);
  return patterns.filter(
    (pattern) =>
      !pattern.startsWith("!") &&
      !isGlobPattern(pattern) &&
      !present.has(normalizePattern(pattern)),
  );
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
  const resolvedBase = assertGitRef(baseRef, "base-ref");
  const basePath = file.basePath ?? file.path;
  assertGitPath(basePath);
  const result = spawnSync(
    "git",
    ["-c", "core.quotepath=false", "show", `${resolvedBase}:${basePath}`],
    {
      cwd: workspace,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
    },
  );
  if (result.error) {
    throw new OperationalError(result.error.message);
  }
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

export function isInsideWorkspace(workspace: string, candidate: string): boolean {
  const root = resolve(workspace);
  const resolved = resolve(candidate);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return resolved === root || resolved.startsWith(prefix);
}

export function workspaceRelativeDirectory(workspace: string, workingDirectory: string): string {
  const resolved = resolve(workspace, workingDirectory);
  if (!isInsideWorkspace(workspace, resolved)) {
    throw new OperationalError("working-directory must be inside GITHUB_WORKSPACE");
  }
  const relativeDirectory = normalizePath(relative(workspace, resolved));
  return relativeDirectory === "" ? "." : relativeDirectory;
}

export function assertGitRef(value: string | undefined, label: string): string {
  if (!value || value.startsWith("-") || /[\s:~^\\]/u.test(value) || value.includes("..")) {
    throw new OperationalError(`Invalid ${label}`);
  }
  if (!/^[A-Za-z0-9._/+-]+$/u.test(value)) {
    throw new OperationalError(`Invalid ${label}`);
  }
  return value;
}

function assertGitPath(value: string): void {
  if (
    value.startsWith("-") ||
    value.includes(":") ||
    value.includes("\0") ||
    value.split(/[/\\]/u).includes("..")
  ) {
    throw new OperationalError(`Invalid path ${value}`);
  }
}

function runGit(arguments_: readonly string[], cwd: string): string {
  const result = spawnSync("git", ["-c", "core.quotepath=false", ...arguments_], {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30_000,
    windowsHide: true,
  });
  if (result.error) {
    throw new OperationalError(result.error.message);
  }
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
