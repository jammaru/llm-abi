# Guarantees

llm-abi compiles one schema into a provider-safe schema and reports what could not be represented.

## What v0.1 guarantees

Given the same:

- input schema
- target id
- package version (which pins the profile revision)

`compile()` returns the same `schema`, `diagnostics`, `loss`, `fingerprint`, and `size`.

Given the same request input and package version, `checkRequest()` returns the same `compatibility`, `diagnostics`, `effective` values, and `fixes`. Omitted fields are resolved through the shipped request profile defaults before rules run.

Given the same deployment descriptor, request, optional schema, and package version, `checkDeployment()` returns the same `compatibility`, `coverage`, diagnostics, and resolved deployment. It does not read the network, filesystem, clock, or environment.

`result.validate(value)` validates against the **original** schema (or the original Standard Schema validator), not the lowered provider schema.

## What v0.1 does not guarantee

- Bit-identical JSON across future minor versions if a provider profile is corrected
- That a provider API will accept every emitted schema (live APIs change; nightly checks record accepted / rejected / skipped)
- That every model behind OpenRouter / Groq / Together behaves like the named vendor
- That a request with `coverage: "unknown"` is accepted by the live API (`checkRequest` reports no shipped rule, not a guarantee)
- That a local probe pass upgrades static compatibility. Probe is an observation. Failure may add diagnostics; success does not raise `lossless`.
- That every MCP host has shipped SEP-2106 full JSON Schema 2020-12
- 100% identical validation results between providers

Target maturity, evidence kind, and live coverage are independent. `lastVerified` records when maintainers checked the linked evidence source; only `evidence.live === "nightly"` means the repository has a live adapter for that target.

## Compatibility levels

| Level        | Provider schema                 | Original `validate()`               |
| ------------ | ------------------------------- | ----------------------------------- |
| lossless     | Preserves meaning               | Passes iff provider output is valid |
| runtime-safe | Drops unenforceable constraints | Still enforces them                 |
| lossy        | Meaning changed                 | May disagree with the provider      |
| unsupported  | Cannot represent a construct    | Still defined; do not send blindly  |

`strict: true` throws when compatibility is `unsupported`.

`size.tokens` is a conservative overhead hint (`ceil(UTF-8 bytes / 3)`). It is not a provider billing API and not a compatibility percentage. Exceeding a profile `maxStringBudget` adds `string-budget-exceeded` without changing the compatibility level.
