import type { Evidence, Support } from "../types.ts";

export interface TargetLimits {
  readonly maxDepth?: number;
  readonly maxProperties?: number;
  readonly maxEnumValues?: number;
  readonly maxStringBudget?: number;
  readonly maxOptionalProperties?: number;
  /**
   * Provider-enforced ceilings. Values above the bound stay in
   * `result.validate` and are stripped from the emitted schema.
   */
  readonly enforced?: {
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly minItems?: number;
    readonly maxItems?: number;
    readonly minProperties?: number;
    readonly maxProperties?: number;
  };
}

export interface ObjectPolicy {
  /**
   * `omit-false`: do not emit `additionalProperties: false` (xAI defaults to
   * false and rejects boolean schema `false`). Keep explicit `true`.
   */
  readonly additionalProperties: false | true | "preserve" | "omit-false";
  readonly requireAllProperties: boolean;
  readonly optionalAsNullable: boolean;
}

export interface TargetCapabilities {
  readonly anyOf: Support;
  readonly oneOf: Support;
  readonly allOf: Support;
  readonly not: Support;
  readonly refs: Support;
  readonly recursiveRefs: Support;
  readonly defs: Support;
  readonly nullableTypeArray: Support;
  readonly optionalProperties: Support;
  readonly additionalPropertiesTrue: Support;
  readonly additionalPropertiesSchema: Support;
  readonly pattern: Support;
  readonly format: Support;
  readonly minLength: Support;
  readonly maxLength: Support;
  readonly minimum: Support;
  readonly maximum: Support;
  readonly exclusiveMinimum: Support;
  readonly exclusiveMaximum: Support;
  readonly multipleOf: Support;
  readonly minItems: Support;
  readonly maxItems: Support;
  readonly uniqueItems: Support;
  readonly prefixItems: Support;
  readonly minProperties: Support;
  readonly maxProperties: Support;
  readonly enum: Support;
  readonly const: Support;
  readonly integer: Support;
  readonly nullType: Support;
}

export interface TargetProfile {
  readonly id: string;
  readonly aliases: readonly string[];
  readonly vendor: string;
  readonly mode: string;
  readonly revision: string;
  readonly dialect: "draft-07" | "2020-12" | "provider";
  readonly evidence: Evidence;
  readonly capabilities: TargetCapabilities;
  readonly formats: ReadonlySet<string> | "any";
  readonly minItemsAllowed?: ReadonlySet<number>;
  readonly limits: TargetLimits;
  readonly objectPolicy: ObjectPolicy;
  readonly rootMustBeObject: boolean;
  readonly rootAnyOf: Support;
  /**
   * Keyword used when emitting reusable definitions.
   * DeepSeek strict tools document `$def` rather than `$defs`.
   */
  readonly defsKeyword?: "$defs" | "$def";
}

export function defineTarget(profile: TargetProfile): TargetProfile {
  return profile;
}
