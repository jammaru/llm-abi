import { spawnSync } from "node:child_process";
import type { Compatibility, NormalizedCheck, TargetCheck } from "./types.ts";
import { OperationalError } from "./types.ts";

const COMPATIBILITIES = new Set<Compatibility>([
  "lossless",
  "runtime-safe",
  "lossy",
  "unsupported",
]);

export function runCheck(cliPath: string, schemaPath: string, cwd: string): NormalizedCheck {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--ci", "--json", "--", schemaPath],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
    },
  );
  if (result.error) {
    throw new OperationalError(`Unable to start llm-abi: ${result.error.message}`);
  }
  if (result.signal) {
    throw new OperationalError(
      `llm-abi was terminated by signal ${result.signal} for ${schemaPath}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new OperationalError(
      `llm-abi could not check ${schemaPath}: ${result.stderr.trim() || "invalid JSON output"}`,
    );
  }
  const normalized = normalizeCheck(parsed, schemaPath);
  const expectedStatus = normalized.targets.some((target) => target.compatibility === "unsupported")
    ? 1
    : 0;
  if (result.status !== expectedStatus) {
    throw new OperationalError(
      `llm-abi returned exit ${String(result.status)} for ${schemaPath}; expected ${String(expectedStatus)}`,
    );
  }
  return normalized;
}

function normalizeCheck(value: unknown, schemaPath: string): NormalizedCheck {
  if (!isRecord(value) || typeof value.fingerprint !== "string" || !Array.isArray(value.results)) {
    throw new OperationalError(`llm-abi returned an invalid result for ${schemaPath}`);
  }
  const targets: TargetCheck[] = value.results.map((row): TargetCheck => {
    if (
      !isRecord(row) ||
      !isRecord(row.target) ||
      typeof row.target.id !== "string" ||
      !isCompatibility(row.compatibility)
    ) {
      throw new OperationalError(`llm-abi returned an invalid target result for ${schemaPath}`);
    }
    return {
      id: row.target.id,
      compatibility: row.compatibility,
      ...tokensFrom(row),
    };
  });
  return { fingerprint: value.fingerprint, targets };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokensFrom(row: Record<string, unknown>): { tokens: number } | Record<string, never> {
  if (!isRecord(row.size) || typeof row.size.tokens !== "number") {
    return {};
  }
  if (!Number.isFinite(row.size.tokens) || row.size.tokens < 0) {
    return {};
  }
  return { tokens: row.size.tokens };
}

function isCompatibility(value: unknown): value is Compatibility {
  return typeof value === "string" && COMPATIBILITIES.has(value as Compatibility);
}
