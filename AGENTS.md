# Agent guide

llm-abi is a **schema compatibility compiler** for LLM providers.

> Compile any TypeScript / JSON Schema to a provider-safe schema, and report what could not be represented.

## Product boundaries

- Do not build an agent framework.
- Do not depend on OpenAI, Anthropic, Gemini, Zod, or AI SDK in `packages/core`.
- Do not fetch provider docs or config at runtime. Profiles ship with the package.
- Do not invent compatibility percentages. Use `lossless | runtime-safe | lossy | unsupported`.
- Do not silently drop meaning. Every rewrite needs a diagnostic.

## Public API

Keep it small:

- `compile(schema, target | options)`
- `check(schema)`
- `analyze(schema)`
- `fingerprint(schema)`
- `listTargets()` / `resolveTarget(id)`

Named exports only. No default export.

## Architecture

```text
Input → IR → analyze → lower(profile) → emit → diagnostics
```

- IR lives in `packages/core/src/ir/`
- Provider differences live in `packages/core/src/targets/`
- Lowering is generic and data-driven
- CLI is a separate tsdown entry and may use Node APIs
- Library entry must stay platform-neutral

## Implementation rules

- Explicit return types on exported functions (`isolatedDeclarations`)
- Source TypeScript must be Node strip-only compatible (the GitHub Action loads `.ts` on Node 24): no parameter properties, enums, or namespaces
- `Map` / `Set` for dictionaries keyed by user input
- Depth, node, and `$ref` limits on untrusted schemas
- Deterministic `compile()`: same input + target = same output
- Tests for every lowering rule and every fixture × target
- English for public docs, issue text, and commit messages
- A changeset for user-facing compiler changes (`pnpm changeset`)

## Adding a target

1. Add `packages/core/src/targets/<vendor>.ts` with `defineTarget(...)`
2. Register it in `packages/core/src/targets/registry.ts`
3. Add fixtures under `packages/conformance/fixtures/`
4. Add focused tests for the vendor-specific rules
5. Document evidence (`documented` | `sdk-observed` | `empirical`)
6. Update README target table honestly (`Supported` / `Partial` / `Experimental`)

## Agent files

- `AGENTS.md` (this file) is the cross-tool guide
- `.agents/skills/` holds task checklists (`add-target`, `review-compiler`, `release`)
- `CLAUDE.md` points here so Claude Code uses the same rules

## Commands

```bash
pnpm install
pnpm test
pnpm check
pnpm bench
```
