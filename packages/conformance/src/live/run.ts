import { compile } from "../../../core/src/compile.ts";
import type { JsonSchema } from "../../../core/src/types.ts";
import { firstSecret, LIVE_ADAPTERS } from "./adapters.ts";
import { classifyLiveHttp, redact } from "./classify.ts";
import { summarize } from "./report.ts";
import type { LiveRow, LiveRunResult, LiveTransport } from "./types.ts";

export async function runLive(transport: LiveTransport): Promise<LiveRunResult> {
  if (transport.eventName === "pull_request") {
    return summarize([
      {
        fixture: "*",
        target: "*",
        compile: "n/a",
        live: "skipped",
        reason: "live checks never run on pull requests",
      },
    ]);
  }

  const rows: LiveRow[] = [];
  for (const fixture of transport.fixtureNames) {
    const schema = transport.readFixture(fixture);
    for (const adapter of LIVE_ADAPTERS) {
      const compiled = compile(schema as JsonSchema, adapter.target);
      if (compiled.compatibility === "unsupported") {
        rows.push({
          fixture,
          target: compiled.target.id,
          compile: compiled.compatibility,
          live: "skipped",
          reason: "compile unsupported",
        });
        continue;
      }
      if (typeof compiled.schema !== "object" || compiled.schema === null) {
        rows.push({
          fixture,
          target: compiled.target.id,
          compile: compiled.compatibility,
          live: "skipped",
          reason: "boolean schema",
        });
        continue;
      }
      const key = firstSecret(transport.env, adapter.secretNames);
      if (!key) {
        rows.push({
          fixture,
          target: compiled.target.id,
          compile: compiled.compatibility,
          live: "skipped",
          reason: `missing secret (${adapter.secretNames.join(" / ")})`,
        });
        continue;
      }
      try {
        const payload = JSON.parse(JSON.stringify(compiled.schema)) as JsonSchema;
        // eslint-disable-next-line no-await-in-loop -- serial calls keep order stable and avoid rate limits
        const http = await adapter.post(payload, key, transport.env, transport.fetch);
        const classified = classifyLiveHttp({
          status: http.status,
          body: redact(http.body, [key]),
        });
        rows.push({
          fixture,
          target: compiled.target.id,
          compile: compiled.compatibility,
          live: classified.live,
          reason: classified.reason,
        });
      } catch (error) {
        rows.push({
          fixture,
          target: compiled.target.id,
          compile: compiled.compatibility,
          live: "skipped",
          reason: redact(
            `network-error: ${error instanceof Error ? error.message : String(error)}`,
            [key],
          ),
        });
      }
    }
  }
  return summarize(rows);
}
