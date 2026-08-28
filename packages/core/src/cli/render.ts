import type { DiscoveredDeployment } from "../local/types.ts";
import type { CheckRequestResult } from "../request/types.ts";
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

export function renderRequest(result: CheckRequestResult): string {
  const effort = formatEffort(result.effective);
  const mark = MARK[result.compatibility] ?? result.compatibility;
  const profile = result.profile ? `${result.profile.id}  (${result.profile.revision})` : "none";
  const lines = [
    "Request compatibility",
    "",
    `Provider     ${result.effective.provider}`,
    `Model        ${result.effective.model}`,
    `Endpoint     ${result.effective.endpoint}`,
    `Tools        ${result.effective.tools ? "true" : "false"}`,
    `Reasoning    ${effort}`,
    `Profile      ${profile}`,
    `Coverage     ${result.coverage}`,
    `Result       ${mark}`,
  ];
  if (result.diagnostics.length > 0) {
    lines.push("", "Diagnostics");
    for (const diagnostic of result.diagnostics) {
      lines.push(formatRequestDiagnostic(diagnostic));
    }
  }
  if (result.fixes.length > 0) {
    lines.push("", "Fixes");
    for (const fix of result.fixes) {
      const label = fix.preferred ? "preferred" : "alternative";
      const parts: string[] = [];
      if (fix.endpoint) {
        parts.push(`endpoint → ${fix.endpoint}`);
      }
      if (fix.reasoningEffort) {
        parts.push(`reasoningEffort → ${fix.reasoningEffort}`);
      }
      lines.push(`  ${label}  ${parts.join("  ")}`);
      lines.push(`    ${fix.message}`);
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

function formatRequestDiagnostic(diagnostic: {
  readonly severity: string;
  readonly code: string;
  readonly path: readonly string[];
  readonly message: string;
  readonly keyword?: string;
  readonly reason?: string;
  readonly action?: string;
}): string {
  const path = diagnostic.path.length === 0 ? "<request>" : diagnostic.path.join(".");
  const keyword = diagnostic.keyword ? ` \`${diagnostic.keyword}\`` : "";
  const reason = diagnostic.reason ? `\n  ${diagnostic.reason}` : "";
  const action = diagnostic.action ? `\n  ${diagnostic.action}` : "";
  return `[${diagnostic.severity}] ${diagnostic.code}${keyword}\n  ${path}\n  ${diagnostic.message}${reason}${action}`;
}

function formatEffort(effective: CheckRequestResult["effective"]): string {
  if (effective.reasoningEffort === undefined) {
    return "omitted";
  }
  if (effective.reasoningEffortSource === "model-default") {
    return `${effective.reasoningEffort} (model default)`;
  }
  if (effective.reasoningEffortSource === "explicit") {
    return `${effective.reasoningEffort} (explicit)`;
  }
  return effective.reasoningEffort;
}

export function renderLocalDoctor(deployments: readonly DiscoveredDeployment[]): string {
  const lines = ["Local deployments", ""];
  if (deployments.length === 0) {
    lines.push(
      "No loopback runtime detected.",
      "Default ports: 1234 (LM Studio), 11434 (Ollama), 8080 (unspecified).",
      "",
    );
    return lines.join("\n");
  }
  for (const item of deployments) {
    const runtime = item.detection.runtime ?? "unknown";
    lines.push(runtime);
    lines.push(`  URL       ${item.baseURL}`);
    lines.push(`  Endpoint  ${item.endpointKind}`);
    if (item.models.length === 0) {
      lines.push("  Model     none loaded");
    }
    for (const model of item.models) {
      lines.push(`  Model     ${model.id}`);
      if (model.format) {
        lines.push(`  Format    ${model.format}`);
      }
      if (model.engine) {
        lines.push(`  Engine    ${model.engine}`);
      }
      if (model.contextLength !== undefined) {
        lines.push(`  Context   ${String(model.contextLength)}`);
      }
      if (model.parallel !== undefined) {
        lines.push(`  Parallel  ${String(model.parallel)}`);
      }
    }
    lines.push("");
  }
  lines.push("No generation was performed.");
  return lines.join("\n");
}

export const HELP: string = `llm-abi — schema compatibility compiler for LLM providers

Usage:
  llm-abi check <schema.json|.ts> [--ci]
  llm-abi compile <schema.json|.ts> --target <id>
  llm-abi explain <schema.json|.ts> --target <id>
  llm-abi analyze <schema.json|.ts>
  llm-abi request <request.json> [--ci]
  llm-abi doctor
  llm-abi local doctor [--url <http://127.0.0.1:1234>]
  llm-abi local probe [--url <http://127.0.0.1:1234>] [--suite smoke]

Request file:
  JSON object with provider, model, endpoint, optional tools, optional reasoningEffort

Targets:
  openai            openai/responses/structured
  anthropic         anthropic/messages/structured
  gemini            google/gemini/structured
  deepseek          deepseek/chat/strict-tools
  xai               xai/grok/structured
  qwen              alibaba/qwen/tools   (Alibaba Model Studio, not local Qwen)
  mistral           mistral/chat/structured
  openrouter        openrouter/structured
  mcp               mcp/2026-06/tools

Runtime schema targets (compile by id; not in default check):
  llamacpp          llamacpp/server/structured
  ollama            ollama/chat/structured
  lmstudio/gguf     lmstudio/gguf/structured
  lmstudio/mlx      lmstudio/mlx/structured

Options:
  --target, -t      Target profile id or alias
  --strict          Fail when the schema is unsupported
  --optimize        Drop redundant titles and duplicate descriptions
  --type            Type or interface name for TypeScript input
  --json            Machine-readable output
  --ci              Exit 1 when a target or request is unsupported
  --url             Explicit runtime base URL (non-loopback is labeled remote)
  --suite           local probe suite: smoke (default) or full
  --help, -h
  --version, -v
`;

function pad(value: string, size: number): string {
  return value.length >= size ? value : value + " ".repeat(size - value.length);
}
