import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../packages/conformance/fixtures");
mkdirSync(dir, { recursive: true });

const fixtures = {
  "one-of.json": {
    type: "object",
    properties: { value: { oneOf: [{ type: "string" }, { type: "number" }] } },
    required: ["value"],
  },
  "all-of.json": {
    allOf: [
      { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    ],
  },
  "const.json": {
    type: "object",
    properties: { kind: { const: "user" } },
    required: ["kind"],
  },
  "format.json": {
    type: "object",
    properties: { email: { type: "string", format: "email" } },
    required: ["email"],
  },
  "minimum.json": {
    type: "object",
    properties: { age: { type: "number", minimum: 0 } },
    required: ["age"],
  },
  "maximum.json": {
    type: "object",
    properties: { score: { type: "number", maximum: 100 } },
    required: ["score"],
  },
  "min-length.json": {
    type: "object",
    properties: { name: { type: "string", minLength: 1 } },
    required: ["name"],
  },
  "max-length.json": {
    type: "object",
    properties: { bio: { type: "string", maxLength: 280 } },
    required: ["bio"],
  },
  "additional-properties-false.json": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: false,
  },
  "additional-properties-true.json": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: true,
  },
  "record.json": {
    type: "object",
    additionalProperties: { type: "number" },
  },
  "tuple.json": {
    type: "object",
    properties: {
      point: {
        type: "array",
        prefixItems: [{ type: "number" }, { type: "number" }],
        items: false,
      },
    },
    required: ["point"],
  },
  "array.json": {
    type: "object",
    properties: { tags: { type: "array", items: { type: "string" } } },
    required: ["tags"],
  },
  "unique-items.json": {
    type: "object",
    properties: {
      tags: { type: "array", items: { type: "string" }, uniqueItems: true },
    },
    required: ["tags"],
  },
  "nullable.json": {
    type: "object",
    properties: { nickname: { type: "string", nullable: true } },
    required: ["nickname"],
  },
  "integer.json": {
    type: "object",
    properties: { count: { type: "integer", minimum: 0 } },
    required: ["count"],
  },
  "boolean.json": {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
  },
  "exclusive-min.json": {
    type: "object",
    properties: { ratio: { type: "number", exclusiveMinimum: 0 } },
    required: ["ratio"],
  },
  "multiple-of.json": {
    type: "object",
    properties: { cents: { type: "number", multipleOf: 0.01 } },
    required: ["cents"],
  },
  "min-items.json": {
    type: "object",
    properties: { tags: { type: "array", items: { type: "string" }, minItems: 1 } },
    required: ["tags"],
  },
  "max-items.json": {
    type: "object",
    properties: { tags: { type: "array", items: { type: "string" }, maxItems: 8 } },
    required: ["tags"],
  },
  "min-properties.json": {
    type: "object",
    minProperties: 1,
    additionalProperties: { type: "string" },
  },
  "deep-object.json": {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          profile: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number", minimum: 0 },
            },
            required: ["name"],
          },
        },
        required: ["profile"],
      },
    },
    required: ["user"],
  },
  "defs-ref.json": {
    type: "object",
    properties: { author: { $ref: "#/$defs/Person" } },
    required: ["author"],
    $defs: {
      Person: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  },
  "not-keyword.json": {
    type: "object",
    properties: { value: { type: "string", not: { const: "admin" } } },
    required: ["value"],
  },
  "external-ref.json": {
    type: "object",
    properties: { other: { $ref: "https://example.com/schema.json" } },
    required: ["other"],
  },
  "union-root.json": {
    anyOf: [
      { type: "object", properties: { a: { type: "string" } }, required: ["a"] },
      { type: "object", properties: { b: { type: "number" } }, required: ["b"] },
    ],
  },
  "type-array-nullable.json": {
    type: "object",
    properties: { note: { type: ["string", "null"] } },
    required: ["note"],
  },
  "empty-object.json": {
    type: "object",
    additionalProperties: false,
  },
  "discriminated-union.json": {
    type: "object",
    properties: {
      event: {
        oneOf: [
          {
            type: "object",
            properties: { type: { const: "click" }, x: { type: "number" } },
            required: ["type", "x"],
          },
          {
            type: "object",
            properties: { type: { const: "key" }, code: { type: "string" } },
            required: ["type", "code"],
          },
        ],
      },
    },
    required: ["event"],
  },
  "complex-pattern.json": {
    type: "object",
    properties: { code: { type: "string", pattern: "(a+)+" } },
    required: ["code"],
  },
};

for (const [name, schema] of Object.entries(fixtures)) {
  writeFileSync(join(dir, name), `${JSON.stringify(schema, null, 2)}\n`);
}

process.stdout.write(`wrote ${Object.keys(fixtures).length} fixtures\n`);
