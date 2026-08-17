import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCheck } from "./cli.ts";
import { readBaseSchema, selectFiles } from "./git.ts";
import { upsertComment } from "./github.ts";
import { error, readEvent, readInputs, warning, writeOutput, writeSummary } from "./io.ts";
import { buildResults, exitCodeFor, renderReport } from "./render.ts";
import type { FileReport, NormalizedCheck } from "./types.ts";

export async function main(): Promise<void> {
  const reports: FileReport[] = [];
  let commentUrl = "";
  try {
    const inputs = readInputs();
    const event = readEvent();
    const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
    const workingDirectory = resolve(workspace, inputs.workingDirectory);
    const selection = selectFiles({
      workspace,
      workingDirectory: inputs.workingDirectory,
      patterns: inputs.patterns,
      changedOnly: inputs.changedOnly,
      baseRef: inputs.baseRef,
      event,
    });
    const cliPath = join(dirname(fileURLToPath(import.meta.url)), "../../core/src/cli.ts");
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "llm-abi-action-"));
    try {
      for (const file of selection.files) {
        const current = runCheck(cliPath, resolve(workspace, file.path), workingDirectory);
        const baseSource = readBaseSchema(file, selection.baseRef, workspace);
        let base: NormalizedCheck | undefined;
        if (baseSource !== undefined) {
          const baseFile = join(temporaryDirectory, `${String(reports.length)}.schema.json`);
          writeFileSync(baseFile, baseSource, "utf8");
          base = runCheck(cliPath, baseFile, workingDirectory);
        }
        reports.push({ path: file.path, current, base });
      }
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }

    const results = buildResults(reports);
    const report = renderReport(results);
    writeSummary(report);

    if (inputs.comment) {
      const pullRequest = event.pull_request;
      const repository = process.env.GITHUB_REPOSITORY;
      if (!pullRequest || !repository || !inputs.githubToken) {
        warning("PR comment skipped because pull request context or github-token is unavailable");
      } else {
        try {
          commentUrl = await upsertComment({
            token: inputs.githubToken,
            repository,
            issueNumber: pullRequest.number,
            body: renderReport(results, true),
            apiUrl: process.env.GITHUB_API_URL,
          });
        } catch (commentError) {
          warning(
            `PR comment skipped: ${commentError instanceof Error ? commentError.message : String(commentError)}`,
          );
        }
      }
    }

    const conclusion =
      reports.length === 0 ? "skipped" : results.unsupportedCount > 0 ? "unsupported" : "passed";
    writeOutputs(conclusion, results, commentUrl);
    const exitCode = exitCodeFor(results);
    if (exitCode === 1) {
      error(`${String(results.unsupportedCount)} unsupported target(s) found`);
    }
    process.exitCode = exitCode;
  } catch (actionError) {
    const message = actionError instanceof Error ? actionError.message : String(actionError);
    error(message);
    const results = buildResults(reports);
    writeSummary(`## llm-abi compatibility\n\nAction error: ${message}`);
    writeOutputs("error", results, commentUrl);
    process.exitCode = 2;
  }
}

function writeOutputs(
  conclusion: "error" | "passed" | "skipped" | "unsupported",
  results: ReturnType<typeof buildResults>,
  commentUrl: string,
): void {
  writeOutput("conclusion", conclusion);
  writeOutput("checked-files", results.files.length);
  writeOutput("unsupported-count", results.unsupportedCount);
  writeOutput("results-json", JSON.stringify(results));
  writeOutput("comment-url", commentUrl);
}
