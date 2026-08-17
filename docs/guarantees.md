# Guarantees

llm-abi compiles one schema into a provider-safe schema and reports what could not be represented.

## What v0.1 guarantees

Given the same:

- input schema
- target id
- package version (which pins the profile revision)

`compile()` returns the same `schema`, `diagnostics`, `loss`, `fingerprint`, and `size`.

`result.validate(value)` validates against the **original** schema (or the original Standard Schema validator), not the lowered provider schema.

## What v0.1 does not guarantee

- Bit-identical JSON across future minor versions if a provider profile is corrected
- That a provider API will accept every emitted schema (live APIs change)
- That every model behind OpenRouter / Groq / Together behaves like the named vendor
- That every MCP host has shipped SEP-2106 full JSON Schema 2020-12
- 100% identical validation results between providers

## Compatibility levels

| Level        | Provider schema                 | Original `validate()`               |
| ------------ | ------------------------------- | ----------------------------------- |
| lossless     | Preserves meaning               | Passes iff provider output is valid |
| runtime-safe | Drops unenforceable constraints | Still enforces them                 |
| lossy        | Meaning changed                 | May disagree with the provider      |
| unsupported  | Cannot represent a construct    | Still defined; do not send blindly  |

`strict: true` throws when compatibility is `unsupported`.

`size.tokens` is a conservative overhead hint (`ceil(UTF-8 bytes / 3)`). It is not a provider billing API and not a compatibility percentage. Exceeding a profile `maxStringBudget` adds `string-budget-exceeded` without changing the compatibility level.
