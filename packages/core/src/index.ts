export { compile } from "./compile.ts";
export { check } from "./check.ts";
export { analyze } from "./analyze.ts";
export { fingerprint } from "./fingerprint.ts";
export { listTargets, resolveTarget } from "./targets/registry.ts";
export { LlmAbiError, SchemaCompatibilityError, SchemaLimitError } from "./errors.ts";
export type {
  Analysis,
  AnalysisStats,
  CheckOptions,
  CheckResult,
  CheckRow,
  Compatibility,
  CompileOptions,
  CompileResult,
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  Evidence,
  JsonSchema,
  JsonSchemaObject,
  JsonValue,
  LossItem,
  LossReport,
  ResolvedTarget,
  SchemaInput,
  Support,
  TargetId,
  ValidationIssue,
  ValidationResult,
} from "./types.ts";
