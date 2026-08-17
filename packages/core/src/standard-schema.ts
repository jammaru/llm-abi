/**
 * Standard Schema / Standard JSON Schema types, copied from the spec.
 * The spec is types-only and may be copied without a runtime dependency.
 *
 * @see https://standardschema.dev/schema
 * @see https://standardschema.dev/json-schema
 */

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
      options?: Options | undefined,
    ) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output> | undefined;
  }

  export interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }
}

export interface StandardJSONSchemaV1<Input = unknown, Output = Input> extends StandardSchemaV1<
  Input,
  Output
> {
  readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}

export declare namespace StandardJSONSchemaV1 {
  export interface Props<Input = unknown, Output = Input> extends StandardSchemaV1.Props<
    Input,
    Output
  > {
    readonly jsonSchema: Converter;
  }

  export interface Converter {
    readonly input: (options: Options) => Record<string, unknown>;
    readonly output: (options: Options) => Record<string, unknown>;
  }

  export type Target = "draft-2020-12" | "draft-07" | "openapi-3.0" | (string & {});

  export interface Options {
    readonly target: Target;
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }
}

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("~standard" in value)) {
    return false;
  }
  const standard = (value as { "~standard": unknown })["~standard"];
  if (typeof standard !== "object" || standard === null) {
    return false;
  }
  const props = standard as { version?: unknown; validate?: unknown };
  return props.version === 1 && typeof props.validate === "function";
}

export function isStandardJSONSchema(value: unknown): value is StandardJSONSchemaV1 {
  if (!isStandardSchema(value)) {
    return false;
  }
  const props = value["~standard"] as { jsonSchema?: unknown };
  if (typeof props.jsonSchema !== "object" || props.jsonSchema === null) {
    return false;
  }
  const converter = props.jsonSchema as { output?: unknown };
  return typeof converter.output === "function";
}
