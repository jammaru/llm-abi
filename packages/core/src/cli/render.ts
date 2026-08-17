import type { Analysis, CheckResult, CompileResult, Diagnostic } from "../types.ts";

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
    "Target                                 Result   Tokens",
    "────────────────────────────────────────────────────────",
  ];
  for (const row of result.results) {
    const mark = MARK[row.compatibility] ?? row.compatibility;
    lines.push(`${pad(row.target.id, 38)} ${pad(mark, 8)}${String(row.size.tokens)}`);
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
    `Size            ${String(result.size.bytes)} bytes  (~${String(result.size.tokens)} tokens)`,
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

export function renderAnalyze(result: Analysis): string {
  const lines = [
    "Schema analysis",
    "",
    `Nodes          ${String(result.stats.nodes)}`,
    `Depth          ${String(result.stats.depth)}`,
    `Properties     ${String(result.stats.properties)}`,
    `Defs           ${String(result.stats.defs)}`,
    `Unused defs    ${String(result.stats.unusedDefs)}`,
    `Constraints    ${String(result.stats.constraints)}`,
    `Size           ${String(result.stats.bytes)} bytes`,
    `Tokens         ${String(result.stats.tokens)}  (conservative, UTF-8 bytes / 3)`,
    `Fingerprint    ${result.fingerprint}`,
  ];
  if (result.notes.length > 0) {
    lines.push("", "Notes");
    for (const note of result.notes) {
      lines.push(formatDiagnostic(note));
    }
  }
  return lines.join("\n");
}

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const path = diagnostic.path.length === 0 ? "<root>" : diagnostic.path.join(".");
  const keyword = diagnostic.keyword ? ` \`${diagnostic.keyword}\`` : "";
  const action = diagnostic.action ? `\n  ${diagnostic.action}` : "";
  return `[${diagnostic.severity}] ${diagnostic.code}${keyword}\n  ${path}\n  ${diagnostic.message}${action}`;
}

export const HELP: string = `llm-abi — schema compatibility compiler for LLM providers

Usage:
  llm-abi check <schema.json|.ts> [--ci]
  llm-abi compile <schema.json|.ts> --target <id>
  llm-abi explain <schema.json|.ts> --target <id>
  llm-abi analyze <schema.json|.ts>
  llm-abi doctor

Targets:
  openai            openai/responses/structured
  anthropic         anthropic/messages/structured
  gemini            google/gemini/structured
  deepseek          deepseek/chat/strict-tools

Options:
  --target, -t      Target profile id or alias
  --strict          Fail when the schema is unsupported
  --optimize        Drop redundant titles and duplicate descriptions
  --type            Type or interface name for TypeScript input
  --json            Machine-readable output
  --ci              Exit 1 when any target is unsupported
  --help, -h
  --version, -v
`;

function pad(value: string, size: number): string {
  return value.length >= size ? value : value + " ".repeat(size - value.length);
}
