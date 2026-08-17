import type { InputKind } from "./compile.ts";

export interface PlaygroundExample {
  readonly id: string;
  readonly title: string;
  readonly lesson: string;
  readonly kind: InputKind;
  readonly typeName: string;
  readonly source: string;
  readonly instance: string;
}

export const EXAMPLES: readonly PlaygroundExample[] = [
  {
    id: "ts-user",
    title: "TypeScript user",
    lesson:
      "The schema ABI starts from a closed TypeScript subset. OpenAI rewrites optional fields; Anthropic and Gemini keep them optional.",
    kind: "typescript",
    typeName: "User",
    source: `export type User = {
  name: string;
  age: number;
  nickname?: string;
};
`,
    instance: `{
  "name": "Ada",
  "age": 36
}
`,
  },
  {
    id: "json-constraints",
    title: "Numeric and string limits",
    lesson:
      "Anthropic cannot enforce minimum / minLength in the provider schema. Compatibility is runtime-safe, not a percentage: result.validate still checks them.",
    kind: "json",
    typeName: "",
    source: `{
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "age": { "type": "number", "minimum": 0, "maximum": 150 }
  },
  "required": ["name", "age"]
}
`,
    instance: `{
  "name": "Ada",
  "age": 36
}
`,
  },
  {
    id: "json-optional",
    title: "Optional properties",
    lesson:
      "OpenAI strict structured outputs require every property and treat missing optionals as null. That rewrite is lossy and always diagnosed.",
    kind: "json",
    typeName: "",
    source: `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "nickname": { "type": "string" }
  },
  "required": ["name"]
}
`,
    instance: `{
  "name": "Ada"
}
`,
  },
  {
    id: "json-one-of",
    title: "oneOf union",
    lesson:
      "oneOf becomes anyOf on OpenAI and Anthropic (lossy). Gemini cannot represent either union form here.",
    kind: "json",
    typeName: "",
    source: `{
  "type": "object",
  "properties": {
    "value": {
      "oneOf": [{ "type": "string" }, { "type": "number" }]
    }
  },
  "required": ["value"]
}
`,
    instance: `{
  "value": "ok"
}
`,
  },
  {
    id: "json-union-root",
    title: "Union at the root",
    lesson:
      "OpenAI and Gemini structured outputs need an object root. Anthropic can keep a root anyOf. Unsupported is a discrete level, not a score.",
    kind: "json",
    typeName: "",
    source: `{
  "anyOf": [
    {
      "type": "object",
      "properties": { "email": { "type": "string" } },
      "required": ["email"]
    },
    {
      "type": "object",
      "properties": { "id": { "type": "number" } },
      "required": ["id"]
    }
  ]
}
`,
    instance: `{
  "email": "ada@example.com"
}
`,
  },
  {
    id: "json-tuple",
    title: "Tuple prefixItems",
    lesson:
      "Gemini keeps prefixItems. OpenAI and Anthropic cannot represent tuples in structured output.",
    kind: "json",
    typeName: "",
    source: `{
  "type": "object",
  "properties": {
    "point": {
      "type": "array",
      "prefixItems": [{ "type": "number" }, { "type": "number" }],
      "items": false
    }
  },
  "required": ["point"]
}
`,
    instance: `{
  "point": [1, 2]
}
`,
  },
  {
    id: "json-pattern",
    title: "String pattern",
    lesson:
      "Gemini treats pattern as runtime-only. OpenAI and Anthropic keep simple patterns in the provider schema.",
    kind: "json",
    typeName: "",
    source: `{
  "type": "object",
  "properties": {
    "handle": { "type": "string", "pattern": "^@[a-zA-Z0-9_]+$" }
  },
  "required": ["handle"]
}
`,
    instance: `{
  "handle": "@ada"
}
`,
  },
  {
    id: "json-additional",
    title: "additionalProperties: true",
    lesson:
      "OpenAI and Anthropic force additionalProperties false. Gemini preserves true. The rewrite is diagnosed; nothing is dropped silently.",
    kind: "json",
    typeName: "",
    source: `{
  "type": "object",
  "properties": {
    "id": { "type": "string" }
  },
  "required": ["id"],
  "additionalProperties": true
}
`,
    instance: `{
  "id": "u_1",
  "extra": true
}
`,
  },
];

export const DEFAULT_EXAMPLE_ID: string = "ts-user";

export function exampleById(id: string): PlaygroundExample | undefined {
  return EXAMPLES.find((example) => example.id === id);
}

export function defaultExample(): PlaygroundExample {
  return exampleById(DEFAULT_EXAMPLE_ID) ?? EXAMPLES[0]!;
}
