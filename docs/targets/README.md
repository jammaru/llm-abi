# Targets

A target is one TypeScript file of data. The compiler already knows how to lower from a profile. Do not add `if (provider === ...)` branches, and do not depend on a vendor SDK in `packages/core`.

Copy [`packages/core/src/targets/openai.ts`](../../packages/core/src/targets/openai.ts) and change the fields.

## Steps

1. Add `packages/core/src/targets/<vendor>.ts` with `defineTarget(...)`.
2. Register the profile (and short aliases) in `packages/core/src/targets/registry.ts`.
3. Set `evidence` to `documented`, `sdk-observed`, or `empirical`.
4. Add or reuse JSON fixtures under `packages/conformance/fixtures/`. Every fixture is compiled against every registered target.
5. Add a focused test in `packages/core/tests/lower.test.ts` for the rule that is unique to this vendor.
6. Update the README target table. Mark `Verified` only when evidence is `documented` or `empirical`. Otherwise `Experimental`.
7. Run `pnpm test`. The conformance snapshot will change; that is expected for a new target.
8. Run `pnpm changeset` if the published compiler grows a public target id.

## Profile fields

| Field                  | Role                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                   | Canonical id, `vendor/api/mode`                                                                           |
| `aliases`              | What `compile(schema, "vendor")` accepts                                                                  |
| `revision`             | Doc or observation date shipped with the package                                                          |
| `dialect`              | Emitted JSON Schema dialect                                                                               |
| `capabilities`         | Per-keyword `supported` \| `runtime-only` \| `lossy` \| `unsupported`                                     |
| `formats`              | Allowed `format` values, or `"any"`                                                                       |
| `objectPolicy`         | `additionalProperties` (`false` / `true` / `preserve` / `omit-false`), required-all, optional-as-nullable |
| `rootMustBeObject`     | Structured-output APIs that reject a non-object root                                                      |
| `rootAnyOf`            | Whether a union root is representable                                                                     |
| `limits`               | Depth, property, enum, string budgets, and documented constraint ceilings                                 |
| `defsKeyword`          | Emitted reusable-def keyword (`$defs` default, `$def` for DeepSeek)                                       |
| `compatibilityCeiling` | Optional floor (gateways: never claim `lossless` for every routed model)                                  |

Capability values:

| Value          | Compile result                                                 |
| -------------- | -------------------------------------------------------------- |
| `supported`    | Keep the keyword in the provider schema                        |
| `runtime-only` | Strip it, keep `result.validate`, compatibility `runtime-safe` |
| `lossy`        | Rewrite with a diagnostic (`oneOf` → `anyOf`, and similar)     |
| `unsupported`  | Cannot represent; emit a diagnostic                            |

## Evidence

Profiles record **how we know** a capability, not just the capability.

| Evidence       | Meaning                                |
| -------------- | -------------------------------------- |
| `documented`   | Stated in official provider docs       |
| `sdk-observed` | Visible in an official SDK transformer |
| `empirical`    | Observed against a live API            |

v0.1 OpenAI, Anthropic, and Gemini profiles are `documented` against public structured-output references dated 2026-08. The DeepSeek strict-tools profile is `documented` against the official Tool Calls guide (Beta `strict: true`, `$def`, required-all objects, no `minLength` / `minItems`). The xAI Grok structured profile is `documented` against official structured-output docs (non-circular `$ref`, `omit-false` additionalProperties, optional fields, constraint ceilings). The Qwen tools profile is `documented` against Model Studio JSON Schema mode and function calling (closed type list, optional fields, `additionalProperties` true or false). The Mistral structured profile is `sdk-observed` against the official client's `rec_strict_json_schema` helper (force `additionalProperties: false`, keep optional fields). The OpenRouter structured profile is `documented` as a gateway: enforcement varies by routed provider, so compatibility is floored at `runtime-safe`. The MCP tools profile is `documented` against published `Tool.inputSchema` (`type: "object"`, `properties`, `required`); combinators and `$ref` are diagnosed because Claude Desktop / Claude Code hosts still commonly reject them.

When a doc and a live API disagree, prefer the live API, mark `empirical`, and keep a fixture.

## Status in the README

| README status  | When                                                 |
| -------------- | ---------------------------------------------------- |
| `Verified`     | `documented` or `empirical`, plus fixtures           |
| `Partial`      | Some modes work; others are missing or `unsupported` |
| `Experimental` | `sdk-observed` only, or the live API is still moving |

Do not invent a compatibility percentage.

## Out of scope for a target PR

- Agent frameworks
- Provider SDK wrappers in `packages/core`
- Fetching docs or config at runtime
- Playground or gateway product work

Planned extra vendors (later Cohere / Groq / Together) belong in their own issues. This file is only the profile recipe.
