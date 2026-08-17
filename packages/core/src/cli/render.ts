import type { CheckResult, CompileResult, Diagnostic } from "../types.ts";

const MARK: Record<string, string> = {
  lossless: "PASS",
  "runtime-safe": "PASS*",
  lossy: "LOSSY",
  unsupported: "FAIL",
};

export function renderCheck(result: CheckResult): string {
  const lines = [
    "Schema compatibility",
    "",
    "Target                                 Result",
    "────────────────────────────────────────────────",
  ];
  for (const row of result.results) {
    const mark = MARK[row.compatibility] ?? row.compatibility;
    lines.push(`${pad(row.target.id, 38)} ${mark}`);
  }
  const warnings = result.results.flatMap((row) =>
    row.diagnostics.filter((item) => item.severity !== "info"),
  );
  if (warnings.length > 0) {
    lines.push("", "Diagnostics");
    for (const diagnostic of warnings) {
      lines.push(formatDiagnostic(diagnostic));
    }
  }
  lines.push("", `Fingerprint  ${result.fingerprint}`);
  return lines.join("\n");
}

export function renderCompile(result: CompileResult): string {
  return JSON.stringify(result.schema, null, 2);
}

export function renderExplain(result: CompileResult): string {
  const lines = [
    `Target          ${result.target.id}`,
    `Revision        ${result.target.revision}`,
    `Compatibility   ${result.compatibility}`,
    `Fingerprint     ${result.fingerprint}`,
    "",
  ];
  if (result.diagnostics.length === 0) {
    lines.push("No diagnostics. Schema compiled without constraint fallback.");
    return lines.join("\n");
  }
  for (const diagnostic of result.diagnostics) {
    lines.push(formatDiagnostic(diagnostic), "");
  }
  if (result.loss.removed.length > 0) {
    lines.push("Loss");
    for (const item of result.loss.removed) {
      const path = item.path.length === 0 ? "<root>" : item.path.join(".");
      lines.push(`  ${path}  ${item.keyword}  →  ${item.fallback}`);
    }
  }
  return lines.join("\n").trimEnd();
}

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const path = diagnostic.path.length === 0 ? "<root>" : diagnostic.path.join(".");
  const keyword = diagnostic.keyword ? ` \`${diagnostic.keyword}\`` : "";
  const action = diagnostic.action ? `\n  ${diagnostic.action}` : "";
  return `[${diagnostic.severity}] ${diagnostic.code}${keyword}\n  ${path}\n  ${diagnostic.message}${action}`;
}

export const HELP: string = `llm-abi — schema compatibility compiler for LLM providers

Usage:
  llm-abi check <schema.json> [--ci]
  llm-abi compile <schema.json> --target <id>
  llm-abi explain <schema.json> --target <id>
  llm-abi doctor

Targets:
  openai            openai/responses/structured
  anthropic         anthropic/messages/structured
  gemini            google/gemini/structured

Options:
  --target, -t      Target profile id or alias
  --strict          Fail when the schema is unsupported
  --json            Machine-readable output
  --ci              Exit 1 when any target is unsupported
  --help, -h
  --version, -v
`;

function pad(value: string, size: number): string {
  return value.length >= size ? value : value + " ".repeat(size - value.length);
}
