import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderLiveJson, renderLiveReport } from "./live/report.ts";
import { runLive } from "./live/run.ts";
import { LIVE_FIXTURES } from "./live/types.ts";
import type { LiveEnv, LiveHttpResult, LiveTransport } from "./live/types.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

export async function liveMain(env: LiveEnv, fetchImpl: typeof fetch = fetch): Promise<number> {
  const transport: LiveTransport = {
    env,
    eventName: env["GITHUB_EVENT_NAME"] ?? "",
    fixtureNames: LIVE_FIXTURES,
    readFixture(name) {
      return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
    },
    async fetch(input, init): Promise<LiveHttpResult> {
      const response = await fetchImpl(input, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        signal: AbortSignal.timeout(30_000),
      });
      return { status: response.status, body: await response.text() };
    },
  };
  const result = await runLive(transport);
  const report = `${renderLiveReport(result)}\n`;
  process.stdout.write(report);
  const summary = env["GITHUB_STEP_SUMMARY"];
  if (summary) {
    appendFileSync(summary, report);
  }
  const reportPath = env["LLM_ABI_LIVE_REPORT_PATH"];
  if (reportPath) {
    writeFileSync(reportPath, renderLiveJson(result, new Date().toISOString()));
  }
  return result.rejected > 0 ? 1 : 0;
}

const code = await liveMain(process.env);
process.exitCode = code;
