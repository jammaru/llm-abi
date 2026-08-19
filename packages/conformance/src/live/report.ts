import type { LiveRow, LiveRunResult } from "./types.ts";

export function summarize(rows: readonly LiveRow[]): LiveRunResult {
  let rejected = 0;
  let skipped = 0;
  let accepted = 0;
  for (const row of rows) {
    if (row.live === "rejected") {
      rejected += 1;
    } else if (row.live === "accepted") {
      accepted += 1;
    } else {
      skipped += 1;
    }
  }
  return { rows, rejected, accepted, skipped };
}

export function renderLiveReport(result: LiveRunResult): string {
  const header = [
    "Live provider conformance",
    "",
    "Outcomes are accepted, rejected, or skipped. There is no compatibility percentage.",
    "",
    "| Fixture | Target | Compile | Live | Reason |",
    "| --- | --- | --- | --- | --- |",
  ];
  const body = result.rows.map(
    (row) =>
      `| ${row.fixture} | ${row.target} | ${row.compile} | ${row.live} | ${escapeCell(row.reason)} |`,
  );
  const footer = [
    "",
    `accepted ${String(result.accepted)} · rejected ${String(result.rejected)} · skipped ${String(result.skipped)}`,
    "",
    "A rejected row means the live API refused a compiled schema. Update the target profile evidence to empirical and add a fixture.",
  ];
  return [...header, ...body, ...footer].join("\n");
}

export function renderLiveJson(result: LiveRunResult, generatedAt: string): string {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt,
      outcomes: {
        accepted: result.accepted,
        rejected: result.rejected,
        skipped: result.skipped,
      },
      rows: result.rows,
    },
    null,
    2,
  )}\n`;
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|");
}
