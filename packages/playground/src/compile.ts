import { analyze, compile, listTargets, LlmAbiError } from "llm-abi";
import type {
  Analysis,
  Compatibility,
  CompileOptions,
  Diagnostic,
  JsonSchema,
  LossReport,
  ResolvedTarget,
  SchemaInput,
  SchemaSize,
  ValidationResult,
} from "llm-abi";

export type InputKind = "typescript" | "json";
export type ConstraintFallback = NonNullable<CompileOptions["constraintFallback"]>;

export interface PlaygroundOptions {
  readonly kind: InputKind;
  readonly typeName: string;
  readonly optimize: boolean;
  readonly constraintFallback: ConstraintFallback;
}

export interface PlaygroundTargetView {
  readonly target: ResolvedTarget;
  readonly compatibility: Compatibility;
  readonly diagnostics: readonly Diagnostic[];
  readonly loss: LossReport;
  readonly schema: JsonSchema;
  readonly size: SchemaSize;
  readonly fingerprint: string;
}

export type PlaygroundResult =
  | {
      readonly ok: true;
      readonly analysis: Analysis;
      readonly inputFingerprint: string;
      readonly targets: readonly PlaygroundTargetView[];
    }
  | {
      readonly ok: false;
      readonly message: string;
      readonly code: string;
    };

export function runPlayground(source: string, options: PlaygroundOptions): PlaygroundResult {
  let schema: SchemaInput;
  try {
    schema = toSchemaInput(source, options);
  } catch (error) {
    return fail(error);
  }
  const typeName = typeNameOf(options);
  try {
    const analysis = analyze(schema, { typeName });
    const targets = listTargets().map((target): PlaygroundTargetView => {
      const compiled = compile(schema, {
        target: target.id,
        optimize: options.optimize,
        constraintFallback: options.constraintFallback,
        typeName,
      });
      return {
        target: compiled.target,
        compatibility: compiled.compatibility,
        diagnostics: compiled.diagnostics,
        loss: compiled.loss,
        schema: compiled.schema,
        size: compiled.size,
        fingerprint: compiled.fingerprint,
      };
    });
    return {
      ok: true,
      analysis,
      inputFingerprint: analysis.fingerprint,
      targets,
    };
  } catch (error) {
    return fail(error);
  }
}

export type InstanceCheck =
  | {
      readonly status: "validated";
      readonly result: ValidationResult;
    }
  | {
      readonly status: "error";
      readonly message: string;
      readonly code: string;
    };

export function validateInstance(
  source: string,
  options: PlaygroundOptions,
  instanceText: string,
): InstanceCheck {
  let schema: SchemaInput;
  try {
    schema = toSchemaInput(source, options);
  } catch (error) {
    const failed = fail(error);
    return { status: "error", message: failed.message, code: failed.code };
  }
  let instance: unknown;
  try {
    instance = JSON.parse(instanceText) as unknown;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Instance must be JSON.",
      code: "invalid-instance",
    };
  }
  try {
    const first = listTargets()[0];
    if (!first) {
      return { status: "error", message: "No compile targets are registered.", code: "no-targets" };
    }
    const compiled = compile(schema, {
      target: first.id,
      optimize: options.optimize,
      constraintFallback: options.constraintFallback,
      typeName: typeNameOf(options),
    });
    return { status: "validated", result: compiled.validate(instance) };
  } catch (error) {
    const failed = fail(error);
    return { status: "error", message: failed.message, code: failed.code };
  }
}

export function toSchemaInput(source: string, options: PlaygroundOptions): SchemaInput {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    throw new LlmAbiError("Paste a TypeScript type or JSON Schema.", "empty-input");
  }
  if (options.kind === "typescript") {
    return trimmed;
  }
  try {
    return JSON.parse(trimmed) as SchemaInput;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON.";
    throw new LlmAbiError(`JSON Schema input is not valid JSON: ${detail}`, "invalid-json");
  }
}

function typeNameOf(options: PlaygroundOptions): string | undefined {
  if (options.kind !== "typescript") {
    return undefined;
  }
  const name = options.typeName.trim();
  return name.length > 0 ? name : undefined;
}

function fail(error: unknown): Extract<PlaygroundResult, { ok: false }> {
  if (error instanceof LlmAbiError) {
    return { ok: false, message: error.message, code: error.code };
  }
  return {
    ok: false,
    message: error instanceof Error ? error.message : String(error),
    code: "playground-error",
  };
}
