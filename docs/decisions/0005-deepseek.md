# 0005 — DeepSeek `$def` and required-all objects

Date: 2026-08-18

## Decision

The DeepSeek strict-tools profile is not an OpenAI copy. Official Beta `strict` docs require:

- every object property in `required`
- `additionalProperties: false`
- reusable modules under `$def` / `$ref: "#/$def/…"`
- `minLength`, `maxLength`, `minItems`, and `maxItems` unsupported

Emit uses `defsKeyword: "$def"`. Optional properties become required (lossy `optional-to-required`) rather than nullable, because `null` is not a documented strict type.

## Evidence

`documented` against https://api-docs.deepseek.com/guides/tool_calls (revision 2026-08).
