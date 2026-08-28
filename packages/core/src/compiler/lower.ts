import { worseCompatibility } from "../compatibility/rank.ts";
import type { Compatibility, Diagnostic, JsonValue, LossItem, LossReport } from "../types.ts";
import type { SchemaDocument, SchemaNode } from "../ir/types.ts";
import { isUnsafePattern } from "../json/pattern.ts";
import type { TargetProfile } from "../targets/types.ts";

export interface LowerOptions {
  readonly constraintFallback: "description" | "strip";
}

export interface LowerResult {
  readonly document: SchemaDocument;
  readonly diagnostics: Diagnostic[];
  readonly loss: LossReport;
}

interface LowerContext {
  profile: TargetProfile;
  options: LowerOptions;
  diagnostics: Diagnostic[];
  removed: LossItem[];
  level: Compatibility;
}

export function lowerDocument(
  document: SchemaDocument,
  profile: TargetProfile,
  options: LowerOptions,
): LowerResult {
  const ctx: LowerContext = {
    profile,
    options,
    diagnostics: [],
    removed: [],
    level: "lossless",
  };
  for (const note of document.notes) {
    if (note.code === "unused-def-removed") {
      ctx.diagnostics.push({
        code: "unused-def-removed",
        severity: "info",
        path: note.path,
        keyword: note.keyword,
        message: note.message,
        action: "Omitted from the provider schema because nothing referenced it.",
      });
      continue;
    }
    if (note.keyword === "not" || note.keyword === "if" || note.keyword === "patternProperties") {
      push(
        ctx,
        {
          code: "unsupported-keyword",
          severity: "warning",
          path: note.path,
          keyword: note.keyword,
          message: note.message,
          action: "Keyword was ignored during parsing.",
        },
        "lossy",
        {
          path: note.path,
          keyword: note.keyword,
          fallback: "dropped",
        },
      );
    }
  }
  document.root = lowerNode(document.root, ctx, true);
  if (ctx.profile.rootMustBeObject && !isObjectRoot(document.root, document.defs, new Set())) {
    push(
      ctx,
      {
        code: "root-must-be-object",
        severity: "error",
        path: [],
        keyword: "type",
        message: `${ctx.profile.id} requires an object schema at the root.`,
        action: "Wrap this schema in an object property before compiling.",
      },
      "unsupported",
    );
  }
  const defs = new Map<string, SchemaNode>();
  for (const [key, value] of document.defs) {
    defs.set(key, lowerNode(value, ctx, false));
  }
  document.defs = defs;
  if (profile.compatibilityCeiling) {
    push(
      ctx,
      {
        code: "gateway-enforcement-varies",
        severity: "warning",
        path: [],
        keyword: "response_format",
        message: `${profile.id} is a gateway: routed providers may translate or ignore this schema.`,
        action:
          "Validate the instance. A lossless compile here does not mean every routed model accepts the schema.",
      },
      profile.compatibilityCeiling,
    );
  }
  return {
    document,
    diagnostics: ctx.diagnostics,
    loss: { level: ctx.level, removed: ctx.removed },
  };
}

function lowerNode(node: SchemaNode, ctx: LowerContext, isRoot: boolean): SchemaNode {
  switch (node.kind) {
    case "string":
      return lowerString(node, ctx);
    case "number":
    case "integer":
      return lowerNumber(node, ctx);
    case "object":
      return lowerObject(node, ctx);
    case "array":
      return lowerArray(node, ctx);
    case "tuple":
      return lowerTuple(node, ctx);
    case "union":
      return lowerUnion(node, ctx, isRoot);
    case "intersection":
      return lowerIntersection(node, ctx);
    case "ref":
      return lowerRef(node, ctx);
    case "literal":
      return lowerLiteral(node, ctx);
    default:
      return node;
  }
}

function lowerString(node: Extract<SchemaNode, { kind: "string" }>, ctx: LowerContext): SchemaNode {
  applyConstraint(ctx, node, "minLength", node.minLength, () => {
    node.minLength = undefined;
  });
  applyConstraint(ctx, node, "maxLength", node.maxLength, () => {
    node.maxLength = undefined;
  });
  applyConstraint(ctx, node, "pattern", node.pattern, () => {
    node.pattern = undefined;
  });
  if (node.pattern && isUnsafePattern(node.pattern)) {
    push(
      ctx,
      {
        code: "complex-pattern",
        severity: "warning",
        path: node.path,
        keyword: "pattern",
        message: "Pattern is too complex or uses regex features that providers reject.",
        action: "Moved to runtime validation.",
      },
      "runtime-safe",
      {
        path: node.path,
        keyword: "pattern",
        value: node.pattern,
        fallback: "runtime-validation",
      },
    );
    appendConstraint(ctx, node, `Pattern: ${node.pattern}`);
    node.pattern = undefined;
  }
  if (node.format) {
    const formats = ctx.profile.formats;
    if (formats !== "any" && !formats.has(node.format)) {
      const value = node.format;
      push(
        ctx,
        {
          code: "runtime-only-constraint",
          severity: "warning",
          path: node.path,
          keyword: "format",
          message: `${ctx.profile.id} does not document format "${value}".`,
          action: "Constraint moved to runtime validation.",
        },
        "runtime-safe",
        {
          path: node.path,
          keyword: "format",
          value,
          fallback: "runtime-validation",
        },
      );
      appendConstraint(ctx, node, constraintText("format", value));
      node.format = undefined;
    }
  }
  return node;
}

function lowerNumber(
  node: Extract<SchemaNode, { kind: "number" | "integer" }>,
  ctx: LowerContext,
): SchemaNode {
  applyConstraint(ctx, node, "minimum", node.minimum, () => {
    node.minimum = undefined;
  });
  applyConstraint(ctx, node, "maximum", node.maximum, () => {
    node.maximum = undefined;
  });
  applyConstraint(ctx, node, "exclusiveMinimum", node.exclusiveMinimum, () => {
    node.exclusiveMinimum = undefined;
  });
  applyConstraint(ctx, node, "exclusiveMaximum", node.exclusiveMaximum, () => {
    node.exclusiveMaximum = undefined;
  });
  applyConstraint(ctx, node, "multipleOf", node.multipleOf, () => {
    node.multipleOf = undefined;
  });
  return node;
}

function lowerObject(node: Extract<SchemaNode, { kind: "object" }>, ctx: LowerContext): SchemaNode {
  const properties = new Map<string, SchemaNode>();
  for (const [key, value] of node.properties) {
    properties.set(key, lowerNode(value, ctx, false));
  }
  node.properties = properties;
  applyConstraint(ctx, node, "minProperties", node.minProperties, () => {
    node.minProperties = undefined;
  });
  applyConstraint(ctx, node, "maxProperties", node.maxProperties, () => {
    node.maxProperties = undefined;
  });

  if (typeof node.additionalProperties !== "boolean") {
    if (ctx.profile.capabilities.additionalPropertiesSchema !== "supported") {
      push(
        ctx,
        {
          code: "unsupported-construct",
          severity: "warning",
          path: [...node.path, "*"],
          keyword: "additionalProperties",
          message: "Map/record schemas are not supported by this target.",
          action: "additionalProperties was set to false.",
        },
        "lossy",
        {
          path: node.path,
          keyword: "additionalProperties",
          fallback: "dropped",
        },
      );
      node.additionalProperties = false;
    } else {
      node.additionalProperties = lowerNode(node.additionalProperties, ctx, false);
    }
  } else if (
    node.additionalProperties === true &&
    ctx.profile.objectPolicy.additionalProperties === false
  ) {
    const emptyMap = node.properties.size === 0;
    push(
      ctx,
      {
        code: "additional-properties-forced",
        severity: emptyMap ? "warning" : "info",
        path: node.path,
        keyword: "additionalProperties",
        message: `${ctx.profile.id} requires additionalProperties: false.`,
        action: "Forced additionalProperties to false.",
      },
      emptyMap ? "lossy" : "lossless",
      emptyMap
        ? {
            path: node.path,
            keyword: "additionalProperties",
            fallback: "dropped",
          }
        : undefined,
    );
    node.additionalProperties = false;
  } else if (
    node.additionalProperties === true &&
    ctx.profile.capabilities.additionalPropertiesTrue !== "supported" &&
    ctx.profile.objectPolicy.additionalProperties !== "preserve" &&
    ctx.profile.objectPolicy.additionalProperties !== "omit-false"
  ) {
    node.additionalProperties = false;
  }

  if (
    node.additionalProperties === false &&
    ctx.profile.objectPolicy.additionalProperties === "omit-false"
  ) {
    push(
      ctx,
      {
        code: "additional-properties-omitted",
        severity: "info",
        path: node.path,
        keyword: "additionalProperties",
        message: `${ctx.profile.id} defaults additionalProperties to false and rejects boolean schema false.`,
        action: "Omitted additionalProperties: false from the provider schema.",
      },
      "lossless",
    );
  }

  if (ctx.profile.objectPolicy.requireAllProperties) {
    for (const key of node.properties.keys()) {
      if (node.required.has(key)) {
        continue;
      }
      if (ctx.profile.objectPolicy.optionalAsNullable) {
        const current = node.properties.get(key);
        if (current) {
          node.properties.set(key, wrapOptionalNull(current));
        }
        node.required.add(key);
        push(
          ctx,
          {
            code: "optional-to-nullable",
            severity: "warning",
            path: [...node.path, key],
            keyword: "required",
            message: `Optional property "${key}" became required ${ctx.profile.id} union with null.`,
            action: "Treat null as missing at runtime.",
          },
          "runtime-safe",
          {
            path: [...node.path, key],
            keyword: "optional",
            fallback: "rewritten",
          },
        );
      } else {
        node.required.add(key);
        push(
          ctx,
          {
            code: "optional-to-required",
            severity: "warning",
            path: [...node.path, key],
            keyword: "required",
            message: `Optional property "${key}" became required for ${ctx.profile.id}.`,
            action: "Always send this property; the provider does not document optional-as-null.",
          },
          "lossy",
          {
            path: [...node.path, key],
            keyword: "optional",
            fallback: "rewritten",
          },
        );
      }
    }
  }
  return node;
}

function lowerArray(node: Extract<SchemaNode, { kind: "array" }>, ctx: LowerContext): SchemaNode {
  node.items = lowerNode(node.items, ctx, false);
  applyMinItems(node, ctx);
  applyConstraint(ctx, node, "maxItems", node.maxItems, () => {
    node.maxItems = undefined;
  });
  applyConstraint(ctx, node, "uniqueItems", node.uniqueItems, () => {
    node.uniqueItems = undefined;
  });
  return node;
}

function lowerTuple(node: Extract<SchemaNode, { kind: "tuple" }>, ctx: LowerContext): SchemaNode {
  if (ctx.profile.capabilities.prefixItems !== "supported") {
    push(
      ctx,
      {
        code: "unsupported-construct",
        severity: "error",
        path: node.path,
        keyword: "prefixItems",
        message: "Tuple/prefixItems schemas are not supported by this target.",
        action: "Emitted as an array of anyOf prefix item types.",
      },
      "lossy",
      {
        path: node.path,
        keyword: "prefixItems",
        fallback: "rewritten",
      },
    );
    return lowerArray(
      {
        kind: "array",
        path: node.path,
        title: node.title,
        description: node.description,
        items:
          node.prefixItems.length === 1
            ? node.prefixItems[0]!
            : {
                kind: "union",
                path: node.path,
                discriminant: "anyOf",
                variants: node.prefixItems,
              },
        minItems: node.minItems,
        maxItems: node.maxItems,
      },
      ctx,
    );
  }
  node.prefixItems = node.prefixItems.map((item) => lowerNode(item, ctx, false));
  if (typeof node.rest === "object") {
    node.rest = lowerNode(node.rest, ctx, false);
  }
  if (node.rest === false && ctx.profile.objectPolicy.additionalProperties === "omit-false") {
    const closedLength = node.prefixItems.length;
    if (node.maxItems === undefined || node.maxItems > closedLength) {
      node.maxItems = closedLength;
    }
    node.rest = undefined;
    push(
      ctx,
      {
        code: "boolean-schema-rewritten",
        severity: "warning",
        path: node.path,
        keyword: "items",
        message: `${ctx.profile.id} rejects boolean JSON Schema values such as items: false.`,
        action: `Rewrote tuple rest to maxItems: ${String(closedLength)}.`,
      },
      "lossless",
    );
  }
  return node;
}

function lowerUnion(
  node: Extract<SchemaNode, { kind: "union" }>,
  ctx: LowerContext,
  isRoot: boolean,
): SchemaNode {
  node.variants = node.variants.map((variant) => lowerNode(variant, ctx, false));
  if (isRoot && ctx.profile.rootAnyOf !== "supported" && node.discriminant !== "type-array") {
    push(
      ctx,
      {
        code: "root-must-be-object",
        severity: "error",
        path: node.path,
        keyword: node.discriminant,
        message: `${ctx.profile.id} does not allow a union at the schema root.`,
        action: "Wrap the union in an object property before compiling.",
      },
      "unsupported",
    );
  }
  if (node.discriminant === "oneOf") {
    const support = ctx.profile.capabilities.oneOf;
    if (support !== "supported") {
      push(
        ctx,
        {
          code: "one-of-to-any-of",
          severity: "warning",
          path: node.path,
          keyword: "oneOf",
          message: "oneOf was rewritten to anyOf.",
          action: "Exclusive union semantics are no longer guaranteed by the provider.",
        },
        "lossy",
        {
          path: node.path,
          keyword: "oneOf",
          fallback: "rewritten",
        },
      );
      node.discriminant = "anyOf";
    }
  }
  if (node.discriminant === "anyOf" && ctx.profile.capabilities.anyOf !== "supported") {
    push(
      ctx,
      {
        code: "unsupported-construct",
        severity: "error",
        path: node.path,
        keyword: "anyOf",
        message: `${ctx.profile.id} does not support anyOf/unions.`,
        action: "Union was kept in the IR but may be rejected by the provider.",
      },
      "unsupported",
    );
  }
  return node;
}

function lowerIntersection(
  node: Extract<SchemaNode, { kind: "intersection" }>,
  ctx: LowerContext,
): SchemaNode {
  node.parts = node.parts.map((part) => lowerNode(part, ctx, false));
  const support = ctx.profile.capabilities.allOf;
  if (support === "supported") {
    return node;
  }
  if (support === "runtime-only") {
    push(
      ctx,
      {
        code: "runtime-only-constraint",
        severity: "warning",
        path: node.path,
        keyword: "allOf",
        message: `${ctx.profile.id} accepts multi-schema allOf as best-effort only.`,
        action: "allOf was kept; conformance is not guaranteed by the provider.",
      },
      "runtime-safe",
      {
        path: node.path,
        keyword: "allOf",
        fallback: "runtime-validation",
      },
    );
    return node;
  }
  push(
    ctx,
    {
      code: "unsupported-construct",
      severity: "error",
      path: node.path,
      keyword: "allOf",
      message: "Unmerged allOf intersection cannot be represented for this target.",
      action: "Simplify the source schema into a single object.",
    },
    "unsupported",
    {
      path: node.path,
      keyword: "allOf",
      fallback: "dropped",
    },
  );
  return node;
}

function lowerRef(node: Extract<SchemaNode, { kind: "ref" }>, ctx: LowerContext): SchemaNode {
  if (node.ref.startsWith("http://") || node.ref.startsWith("https://")) {
    push(
      ctx,
      {
        code: "external-ref",
        severity: "error",
        path: node.path,
        keyword: "$ref",
        message: `External $ref "${node.ref}" cannot be compiled.`,
        action: "Inline the referenced schema.",
      },
      "unsupported",
    );
  }
  if (node.cyclic && ctx.profile.capabilities.recursiveRefs !== "supported") {
    push(
      ctx,
      {
        code: "recursive-ref",
        severity: "error",
        path: node.path,
        keyword: "$ref",
        message: `${ctx.profile.id} does not support recursive $ref.`,
        action: "Inline this definition or reduce recursive depth.",
      },
      "unsupported",
      {
        path: node.path,
        keyword: "$ref",
        value: node.ref,
        fallback: "dropped",
      },
    );
  }
  return node;
}

function lowerLiteral(
  node: Extract<SchemaNode, { kind: "literal" }>,
  ctx: LowerContext,
): SchemaNode {
  if (ctx.profile.capabilities.const === "supported") {
    return node;
  }
  push(
    ctx,
    {
      code: "lossy-conversion",
      severity: "warning",
      path: node.path,
      keyword: "const",
      message: "const was rewritten to a single-value enum.",
      action: "Emitted as enum.",
    },
    "runtime-safe",
    {
      path: node.path,
      keyword: "const",
      value: node.value,
      fallback: "rewritten",
    },
  );
  return {
    kind: "enum",
    path: node.path,
    title: node.title,
    description: node.description,
    values: [node.value],
  };
}

function applyMinItems(node: Extract<SchemaNode, { kind: "array" }>, ctx: LowerContext): void {
  if (node.minItems === undefined) {
    return;
  }
  const allowed = ctx.profile.minItemsAllowed;
  if (allowed) {
    if (allowed.has(node.minItems)) {
      return;
    }
    applyConstraint(ctx, node, "minItems", node.minItems, () => {
      node.minItems = undefined;
    });
    return;
  }
  applyConstraint(ctx, node, "minItems", node.minItems, () => {
    node.minItems = undefined;
  });
}

function enforcedCeiling(profile: TargetProfile, keyword: string): number | undefined {
  const enforced = profile.limits.enforced;
  if (!enforced) {
    return undefined;
  }
  if (
    keyword === "minLength" ||
    keyword === "maxLength" ||
    keyword === "minItems" ||
    keyword === "maxItems" ||
    keyword === "minProperties" ||
    keyword === "maxProperties"
  ) {
    return enforced[keyword];
  }
  return undefined;
}

function applyConstraint(
  ctx: LowerContext,
  node: SchemaNode,
  keyword: keyof TargetProfile["capabilities"],
  value: JsonValue | undefined,
  strip: () => void,
): void {
  if (value === undefined || value === false) {
    return;
  }
  const support = ctx.profile.capabilities[keyword];
  const ceiling = enforcedCeiling(ctx.profile, keyword);
  const overCeiling = ceiling !== undefined && typeof value === "number" && value > ceiling;
  if (support === "supported" && !overCeiling) {
    return;
  }
  if (support === "supported" && overCeiling) {
    push(
      ctx,
      {
        code: "runtime-only-constraint",
        severity: "warning",
        path: node.path,
        keyword,
        message: `${ctx.profile.id} only guarantees \`${keyword}\` up to ${String(ceiling)}.`,
        action: "Constraint moved to runtime validation.",
      },
      "runtime-safe",
      {
        path: node.path,
        keyword,
        value,
        fallback: "runtime-validation",
      },
    );
    if (ctx.options.constraintFallback === "description") {
      appendConstraint(ctx, node, constraintText(keyword, value));
    }
    strip();
    return;
  }
  const text = constraintText(keyword, value);
  if (support === "runtime-only") {
    push(
      ctx,
      {
        code: "runtime-only-constraint",
        severity: "warning",
        path: node.path,
        keyword,
        message: `${ctx.profile.id} does not enforce \`${keyword}\`.`,
        action: "Constraint moved to runtime validation.",
      },
      "runtime-safe",
      {
        path: node.path,
        keyword,
        value,
        fallback: "runtime-validation",
      },
    );
    if (ctx.options.constraintFallback === "description") {
      appendConstraint(ctx, node, text);
    }
    strip();
    return;
  }
  push(
    ctx,
    {
      code: support === "lossy" ? "lossy-conversion" : "unsupported-keyword",
      severity: support === "unsupported" ? "error" : "warning",
      path: node.path,
      keyword,
      message: `\`${keyword}\` cannot be represented on ${ctx.profile.id}.`,
      action: "Constraint was stripped from the provider schema.",
    },
    support === "unsupported" ? "unsupported" : "lossy",
    {
      path: node.path,
      keyword,
      value,
      fallback: "dropped",
    },
  );
  strip();
}

function wrapOptionalNull(node: SchemaNode): SchemaNode {
  if (node.kind === "union" && node.variants.some((item) => item.kind === "null")) {
    return node;
  }
  return {
    kind: "union",
    path: node.path,
    discriminant: "type-array",
    variants: [node, { kind: "null", path: node.path }],
  };
}

function appendConstraint(ctx: LowerContext, node: SchemaNode, text: string): void {
  if (ctx.options.constraintFallback !== "description") {
    return;
  }
  node.description = node.description ? `${node.description} ${text}` : text;
}

function constraintText(keyword: string, value: JsonValue): string {
  switch (keyword) {
    case "minimum":
      return `Must be >= ${String(value)}.`;
    case "maximum":
      return `Must be <= ${String(value)}.`;
    case "exclusiveMinimum":
      return `Must be > ${String(value)}.`;
    case "exclusiveMaximum":
      return `Must be < ${String(value)}.`;
    case "minLength":
      return `Must have length >= ${String(value)}.`;
    case "maxLength":
      return `Must have length <= ${String(value)}.`;
    case "multipleOf":
      return `Must be a multiple of ${String(value)}.`;
    case "minItems":
      return `Must have at least ${String(value)} items.`;
    case "maxItems":
      return `Must have at most ${String(value)} items.`;
    case "pattern":
      return `Must match pattern ${String(value)}.`;
    case "format":
      return `Must be a valid ${String(value)}.`;
    case "uniqueItems":
      return "Items must be unique.";
    default:
      return `${keyword}: ${String(value)}`;
  }
}

function isObjectRoot(
  node: SchemaNode,
  defs: ReadonlyMap<string, SchemaNode>,
  seen: Set<SchemaNode>,
): boolean {
  if (seen.has(node)) {
    return true;
  }
  seen.add(node);
  if (node.kind === "object") {
    return true;
  }
  if (node.kind === "ref") {
    const target = defs.get(node.ref);
    return target ? isObjectRoot(target, defs, seen) : false;
  }
  if (node.kind === "union") {
    const nonNull = node.variants.filter((variant) => variant.kind !== "null");
    return nonNull.length === 1 && isObjectRoot(nonNull[0]!, defs, seen);
  }
  return false;
}

function push(
  ctx: LowerContext,
  diagnostic: Diagnostic,
  level: Compatibility,
  loss?: LossItem,
): void {
  ctx.diagnostics.push(diagnostic);
  ctx.level = worseCompatibility(ctx.level, level);
  if (loss) {
    ctx.removed.push(loss);
  }
}
