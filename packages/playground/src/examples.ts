import type { InputKind } from "./compile.ts";
import type { Locale } from "./locale.ts";

export interface LocalizedText {
  readonly en: string;
  readonly ja: string;
}

export interface PlaygroundExample {
  readonly id: string;
  readonly title: LocalizedText;
  readonly lesson: LocalizedText;
  readonly kind: InputKind;
  readonly typeName: string;
  readonly source: string;
  readonly instance: string;
}

export function localizedText(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export const EXAMPLES: readonly PlaygroundExample[] = [
  {
    id: "json-one-of",
    title: { en: "oneOf union", ja: "oneOf ユニオン" },
    lesson: {
      en: "oneOf becomes anyOf on OpenAI and Anthropic (lossy). Gemini cannot represent either union form (unsupported). That spread is the point of llm-abi.",
      ja: "OpenAI と Anthropic では oneOf が anyOf になり（lossy）、Gemini はどちらのユニオン形も表せません（unsupported）。この差が llm-abi の対象です。",
    },
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
    id: "ts-user",
    title: { en: "TypeScript user", ja: "TypeScript のユーザー" },
    lesson: {
      en: "Start from a closed TypeScript subset. OpenAI rewrites optional fields; Anthropic and Gemini keep them optional.",
      ja: "閉じた TypeScript サブセットから始めます。OpenAI は optional を書き換え、Anthropic と Gemini は optional のまま残します。",
    },
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
    title: { en: "Numeric and string limits", ja: "数値と文字列の制限" },
    lesson: {
      en: "Anthropic cannot enforce minimum / minLength in the provider schema. Compatibility is runtime-safe, not a percentage: result.validate still checks them.",
      ja: "Anthropic は minimum / minLength をプロバイダスキーマでは強制できません。互換性は runtime-safe であり、パーセントではありません。result.validate がそれらを検査します。",
    },
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
    title: { en: "Optional properties", ja: "オプショナルなプロパティ" },
    lesson: {
      en: "OpenAI strict structured outputs require every property and treat missing optionals as null. That rewrite is diagnosed; compatibility is runtime-safe, not lossless.",
      ja: "OpenAI の strict structured outputs は全プロパティを必須にし、欠けた optional を null として扱います。この書き換えは診断され、互換性は lossless ではなく runtime-safe です。",
    },
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
    id: "json-union-root",
    title: { en: "Union at the root", ja: "ルートのユニオン" },
    lesson: {
      en: "OpenAI and Gemini structured outputs need an object root. Anthropic can keep a root anyOf. Unsupported is a discrete level, not a score.",
      ja: "OpenAI と Gemini の structured outputs はオブジェクトルートが必要です。Anthropic はルートの anyOf を残せます。unsupported は離散的なレベルであり、スコアではありません。",
    },
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
    title: { en: "Tuple prefixItems", ja: "タプルの prefixItems" },
    lesson: {
      en: "Gemini keeps prefixItems. OpenAI and Anthropic cannot represent tuples in structured output.",
      ja: "Gemini は prefixItems を残します。OpenAI と Anthropic の structured output ではタプルを表せません。",
    },
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
    title: { en: "String pattern", ja: "文字列の pattern" },
    lesson: {
      en: "Gemini treats pattern as runtime-only. OpenAI and Anthropic keep simple patterns in the provider schema.",
      ja: "Gemini は pattern を実行時のみとして扱います。OpenAI と Anthropic は単純な pattern をプロバイダスキーマに残します。",
    },
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
    title: { en: "additionalProperties: true", ja: "additionalProperties: true" },
    lesson: {
      en: "OpenAI and Anthropic force additionalProperties false. Gemini preserves true. The rewrite is diagnosed; nothing is dropped silently.",
      ja: "OpenAI と Anthropic は additionalProperties を false に強制します。Gemini は true を保ちます。書き換えは診断され、黙って捨てられません。",
    },
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

export const DEFAULT_EXAMPLE_ID: string = "json-one-of";

export function exampleById(id: string): PlaygroundExample | undefined {
  return EXAMPLES.find((example) => example.id === id);
}

export function defaultExample(): PlaygroundExample {
  return exampleById(DEFAULT_EXAMPLE_ID) ?? EXAMPLES[0]!;
}
