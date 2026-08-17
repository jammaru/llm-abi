export class LlmAbiError extends Error {
  readonly code: string;

  constructor(message: string, code = "llm-abi-error") {
    super(message);
    this.name = "LlmAbiError";
    this.code = code;
  }
}

export class SchemaCompatibilityError extends LlmAbiError {
  readonly targetId: string;
  readonly path: readonly string[];

  constructor(options: {
    readonly message: string;
    readonly targetId: string;
    readonly path?: readonly string[];
    readonly code?: string;
  }) {
    super(options.message, options.code ?? "schema-compatibility");
    this.name = "SchemaCompatibilityError";
    this.targetId = options.targetId;
    this.path = options.path ?? [];
  }
}

export class SchemaLimitError extends LlmAbiError {
  constructor(message: string, code = "schema-too-large") {
    super(message, code);
    this.name = "SchemaLimitError";
  }
}
