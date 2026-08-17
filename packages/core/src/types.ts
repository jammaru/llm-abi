export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonSchema = boolean | JsonSchemaObject;

export interface JsonSchemaObject {
  readonly [key: string]: JsonValue | JsonSchema | readonly JsonSchema[] | undefined;
}

export type SchemaDialect = "draft-07" | "2020-12" | "provider";

export type Compatibility = "lossless" | "runtime-safe" | "lossy" | "unsupported";

export type DiagnosticSeverity = "info" | "warning" | "error";

export type DiagnosticCode =
  | "unsupported-keyword"
  | "unsupported-construct"
  | "runtime-only-constraint"
  | "lossy-conversion"
  | "recursive-ref"
  | "external-ref"
  | "schema-too-deep"
  | "schema-too-large"
  | "optional-to-nullable"
  | "optional-to-required"
  | "additional-properties-forced"
  | "additional-properties-omitted"
  | "boolean-schema-rewritten"
  | "one-of-to-any-of"
  | "all-of-merged"
  | "root-must-be-object"
  | "complex-pattern"
  | "unused-def-removed"
  | "redundant-annotation-removed"
  | "string-budget-exceeded";

export interface Diagnostic {
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly path: readonly string[];
  readonly message: string;
  readonly keyword?: string;
  readonly action?: string;
}

export type Support = "supported" | "runtime-only" | "lossy" | "unsupported";

export type Evidence = "documented" | "sdk-observed" | "empirical";

export type TargetId = string;

export interface ResolvedTarget {
  readonly id: string;
  readonly vendor: string;
  readonly mode: string;
  readonly revision: string;
  readonly aliases: readonly string[];
}

export interface LossItem {
  readonly path: readonly string[];
  readonly keyword: string;
  readonly value?: JsonValue;
  readonly fallback: "runtime-validation" | "description" | "dropped" | "rewritten";
}

export interface LossReport {
  readonly level: Compatibility;
  readonly removed: readonly LossItem[];
}

export interface ValidationIssue {
  readonly path: readonly string[];
  readonly message: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly issues: readonly ValidationIssue[];
}

export type SchemaInput = JsonSchema | StandardSchemaLike | Record<string, unknown> | string;

export interface StandardSchemaLike {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => unknown;
    readonly jsonSchema?: {
      readonly output: (options: { readonly target: string }) => Record<string, unknown>;
    };
  };
}

export interface CompileOptions {
  readonly target: TargetId;
  readonly strict?: boolean;
  readonly optimize?: boolean;
  readonly constraintFallback?: "description" | "strip";
  readonly typeName?: string;
}

export interface SchemaSize {
  readonly bytes: number;
  readonly tokens: number;
}

export interface CompileResult {
  readonly schema: JsonSchema;
  readonly diagnostics: readonly Diagnostic[];
  readonly loss: LossReport;
  readonly fingerprint: string;
  readonly target: ResolvedTarget;
  readonly compatibility: Compatibility;
  readonly size: SchemaSize;
  readonly validate: (value: unknown) => ValidationResult;
}

export interface CheckRow {
  readonly target: ResolvedTarget;
  readonly compatibility: Compatibility;
  readonly diagnostics: readonly Diagnostic[];
  readonly size: SchemaSize;
}

export interface CheckOptions {
  readonly targets?: readonly TargetId[];
  readonly optimize?: boolean;
  readonly typeName?: string;
}

export interface CheckResult {
  readonly fingerprint: string;
  readonly results: readonly CheckRow[];
}

export interface AnalysisStats {
  readonly nodes: number;
  readonly depth: number;
  readonly properties: number;
  readonly defs: number;
  readonly unusedDefs: number;
  readonly constraints: number;
  readonly bytes: number;
  readonly tokens: number;
}

export interface Analysis {
  readonly fingerprint: string;
  readonly stats: AnalysisStats;
  readonly notes: readonly Diagnostic[];
}

export interface AnalyzeOptions {
  readonly typeName?: string;
}
