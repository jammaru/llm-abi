import type { Evidence, Support } from "../types.ts";

export interface TargetLimits {
  readonly maxDepth?: number;
  readonly maxProperties?: number;
  readonly maxEnumValues?: number;
  readonly maxStringBudget?: number;
  readonly maxOptionalProperties?: number;
}

export interface ObjectPolicy {
  readonly additionalProperties: false | true | "preserve";
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
}

export function defineTarget(profile: TargetProfile): TargetProfile {
  return profile;
}
