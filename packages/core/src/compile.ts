import { SchemaCompatibilityError } from "./errors.ts";
import { emitSchema } from "./compiler/emit.ts";
import { lowerDocument } from "./compiler/lower.ts";
import { validateDocument } from "./compiler/validate.ts";
import { fingerprintJson } from "./fingerprint.ts";
import { cloneDocument } from "./ir/types.ts";
import { parseInput } from "./input.ts";
import { budgetDiagnostic, measureSchema } from "./size.ts";
import { getTargetProfile, toResolved } from "./targets/registry.ts";
import type {
  CompileOptions,
  CompileResult,
  Diagnostic,
  LossItem,
  SchemaInput,
  TargetId,
  ValidationResult,
} from "./types.ts";

export function compile(
  schema: SchemaInput,
  targetOrOptions: TargetId | CompileOptions,
): CompileResult {
  const options = normalizeOptions(targetOrOptions);
  const profile = getTargetProfile(options.target);
  const parsed = parseInput(schema, { typeName: options.typeName });
  const original = parsed.document;
  const working = cloneDocument(original);
  const lowered = lowerDocument(working, profile, {
    constraintFallback: options.constraintFallback ?? "description",
  });
  const emitted = emitSchema(lowered.document, profile, {
    optimize: options.optimize ?? false,
  });
  const size = measureSchema(emitted.schema);
  const diagnostics: Diagnostic[] = uniqueDiagnostics([
    ...lowered.diagnostics,
    ...emitted.diagnostics,
  ]);
  const budget = budgetDiagnostic(size, profile);
  if (budget) {
    diagnostics.push(budget);
  }

  if (options.strict && lowered.loss.level === "unsupported") {
    const first = diagnostics.find((item) => item.severity === "error") ?? diagnostics[0];
    throw new SchemaCompatibilityError({
      message: first?.message ?? `Schema is unsupported on ${profile.id}.`,
      targetId: profile.id,
      path: first?.path,
      code: first?.code ?? "unsupported",
    });
  }

  const result: CompileResult = {
    schema: emitted.schema,
    diagnostics,
    loss: {
      level: lowered.loss.level,
      removed: uniqueLossItems(lowered.loss.removed),
    },
    fingerprint: fingerprintJson(emitted.schema),
    target: toResolved(profile),
    compatibility: lowered.loss.level,
    size,
    validate: (value: unknown): ValidationResult => {
      if (parsed.validateStandard) {
        const standard = parsed.validateStandard(value);
        if (standard instanceof Promise) {
          throw new SchemaCompatibilityError({
            message: "Standard Schema validation must be synchronous.",
            targetId: profile.id,
            code: "async-validation",
          });
        }
        const record = standard as { issues?: readonly { message: string }[] };
        if (record.issues) {
          return {
            ok: false,
            issues: record.issues.map((issue) => ({
              path: [],
              message: issue.message,
            })),
          };
        }
        return { ok: true, issues: [] };
      }
      return validateDocument(original, value, { coerceOptionalNull: true });
    },
  };
  return result;
}

function uniqueDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = [
      diagnostic.code,
      diagnostic.severity,
      diagnostic.path.join("/"),
      diagnostic.keyword ?? "",
      diagnostic.message,
      diagnostic.action ?? "",
    ].join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueLossItems(items: readonly LossItem[]): LossItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.path.join("/"),
      item.keyword,
      item.fallback,
      item.value === undefined ? "" : JSON.stringify(item.value),
    ].join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeOptions(targetOrOptions: TargetId | CompileOptions): CompileOptions {
  if (typeof targetOrOptions === "string") {
    return { target: targetOrOptions };
  }
  return targetOrOptions;
}
