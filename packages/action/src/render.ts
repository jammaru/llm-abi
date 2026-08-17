import type { FileReport, ResultsOutput } from "./types.ts";

export const COMMENT_MARKER = "<!-- llm-abi-check -->";

export function buildResults(reports: readonly FileReport[]): ResultsOutput {
  return {
    files: reports,
    unsupportedCount: reports.reduce(
      (count, report) =>
        count +
        report.current.targets.filter((target) => target.compatibility === "unsupported").length,
      0,
    ),
  };
}

export function exitCodeFor(results: ResultsOutput): 0 | 1 {
  return results.unsupportedCount > 0 ? 1 : 0;
}

export function renderReport(results: ResultsOutput, includeMarker = false): string {
  const lines = includeMarker
    ? [COMMENT_MARKER, "## llm-abi compatibility", ""]
    : ["## llm-abi compatibility", ""];
  if (results.files.length === 0) {
    lines.push("No matching schema files were found.");
    return lines.join("\n");
  }

  const targetIds = [
    ...new Set(
      results.files.flatMap((report) => report.current.targets.map((target) => target.id)),
    ),
  ];
  lines.push(
    `| Schema | Fingerprint | ${columnLabels(targetIds).join(" | ")} |`,
    `| --- | --- | ${targetIds.map(() => "---").join(" | ")} |`,
  );
  for (const report of results.files) {
    const fingerprint = renderChange(report.base?.fingerprint, report.current.fingerprint, true);
    const targets = targetIds.map((targetId) => {
      const current = report.current.targets.find(
        (target) => target.id === targetId,
      )?.compatibility;
      const base = report.base?.targets.find((target) => target.id === targetId)?.compatibility;
      const tokens = report.current.targets.find((target) => target.id === targetId)?.tokens;
      const cell = current ? renderChange(base, current, false) : "—";
      return tokens === undefined ? cell : `${cell} · ${String(tokens)}`;
    });
    lines.push(`| \`${escapeMarkdown(report.path)}\` | ${fingerprint} | ${targets.join(" | ")} |`);
  }
  lines.push(
    "",
    results.unsupportedCount > 0
      ? `**${String(results.unsupportedCount)} unsupported target${results.unsupportedCount === 1 ? "" : "s"} found.**`
      : "No unsupported targets found.",
  );
  return lines.join("\n");
}

function renderChange(base: string | undefined, current: string, code: boolean): string {
  const format = (value: string): string => (code ? `\`${escapeMarkdown(value)}\`` : value);
  if (!base || base === current) {
    return format(current);
  }
  return `${format(base)} → ${format(current)}`;
}

function columnLabels(targetIds: readonly string[]): readonly string[] {
  const labels = targetIds.map(shortTarget);
  return labels.map((label, index) =>
    labels.filter((item) => item === label).length > 1 ? escapeMarkdown(targetIds[index]!) : label,
  );
}

function shortTarget(target: string): string {
  if (target.startsWith("openai/")) {
    return "OpenAI";
  }
  if (target.startsWith("anthropic/")) {
    return "Anthropic";
  }
  if (target.startsWith("google/")) {
    return "Gemini";
  }
  return escapeMarkdown(target);
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("`", "\\`");
}
