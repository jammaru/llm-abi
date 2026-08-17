# Guarantees

llm-abi compiles one schema into a provider-safe schema and reports what could not be represented.

## What v0.1 guarantees

Given the same:

- input schema
- target id
- package version (which pins the profile revision)

`compile()` returns the same `schema`, `diagnostics`, `loss`, and `fingerprint`.

`result.validate(value)` validates against the **original** schema (or the original Standard Schema validator), not the lowered provider schema.

## What v0.1 does not guarantee

- Bit-identical JSON across future minor versions if a provider profile is corrected
- That a provider API will accept every emitted schema (live APIs change)
- That every model behind OpenRouter / Groq / Together behaves like the named vendor
- 100% identical validation results between providers

## Compatibility levels

| Level        | Provider schema                 | Original `validate()`               |
| ------------ | ------------------------------- | ----------------------------------- |
| lossless     | Preserves meaning               | Passes iff provider output is valid |
| runtime-safe | Drops unenforceable constraints | Still enforces them                 |
| lossy        | Meaning changed                 | May disagree with the provider      |
| unsupported  | Cannot represent a construct    | Still defined; do not send blindly  |

`strict: true` throws when compatibility is `unsupported`.
