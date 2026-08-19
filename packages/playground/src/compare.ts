import type { Diagnostic } from "llm-abi";
import type { PlaygroundTargetView } from "./compile.ts";
import { formatPath } from "./format.ts";

export interface SchemaDiff {
  readonly path: string;
  readonly left: unknown;
  readonly right: unknown;
}

export interface DiagnosticRow {
  readonly key: string;
  readonly code: string;
  readonly keyword: string;
  readonly path: string;
  readonly byTarget: Map<string, boolean>;
}

const MAX_DIFFS: number = 80;

export function diffSchemas(
  left: unknown,
  right: unknown,
  rootPath = "(root)",
): readonly SchemaDiff[] {
  const diffs: SchemaDiff[] = [];
  walk(left, right, [], diffs, rootPath);
  return diffs.slice(0, MAX_DIFFS);
}

export function diagnosticMatrix(
  targets: readonly PlaygroundTargetView[],
  rootPath = "(root)",
): readonly DiagnosticRow[] {
  const rows = new Map<string, DiagnosticRow>();
  for (const target of targets) {
    for (const diagnostic of target.diagnostics) {
      const key = diagnosticKey(diagnostic);
      let row = rows.get(key);
      if (!row) {
        row = {
          key,
          code: diagnostic.code,
          keyword: diagnostic.keyword ?? "",
          path: formatPath(diagnostic.path, rootPath),
          byTarget: new Map(),
        };
        rows.set(key, row);
      }
      row.byTarget.set(target.target.id, true);
    }
  }
  return [...rows.values()];
}

function diagnosticKey(diagnostic: Diagnostic): string {
  return `${diagnostic.code}|${diagnostic.keyword ?? ""}|${diagnostic.path.join("/")}`;
}

function walk(
  left: unknown,
  right: unknown,
  path: readonly string[],
  diffs: SchemaDiff[],
  rootPath: string,
): void {
  if (diffs.length >= MAX_DIFFS) {
    return;
  }
  if (Object.is(left, right)) {
    return;
  }
  if (isObject(left) && isObject(right)) {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].toSorted();
    for (const key of keys) {
      walk(left[key], right[key], [...path, key], diffs, rootPath);
    }
    return;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      walk(left[index], right[index], [...path, String(index)], diffs, rootPath);
    }
    return;
  }
  diffs.push({
    path: path.length === 0 ? rootPath : path.join("."),
    left,
    right,
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
