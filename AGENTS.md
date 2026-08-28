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
- `checkRequest(request)`
- `listRequestProfiles()` / `resolveRequestProfile(id)`
- `checkDeployment(input)`
- `listRuntimeProfiles()` / `resolveRuntimeProfile(id)`
- `listModelProfiles()` / `resolveModelProfile(id)`

Named exports only. No default export.

`compile()` is the schema ABI. `checkRequest()` is the request ABI. `checkDeployment()` is the runtime ABI. Do not fold model, endpoint, or `reasoning_effort` rules into `compile()`. Do not change the `qwen` alias; it is Alibaba Model Studio, not local Qwen. Discovery and probe belong in `llm-abi/local`, not the neutral entry.

## Architecture

```text
Schema ABI
  Input → IR → analyze → lower(profile) → emit → diagnostics

Request ABI
  Request → resolve profile → apply defaults → evaluate rules → diagnostics

Runtime ABI
  Deployment + request → resolve runtime/model profiles → compile() if resolvable → diagnostics
```

- IR lives in `packages/core/src/ir/`
- Provider schema differences live in `packages/core/src/targets/`
- Request compatibility lives in `packages/core/src/request/`
- Lowering and request rules are generic and data-driven
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

## Adding a runtime profile

1. Add `packages/core/src/deployment/runtime/<vendor>.ts` with `defineRuntimeProfile(...)`
2. Register it in `packages/core/src/deployment/runtime/registry.ts`
3. If structured output has a documented keyword table, add a `scope: "runtime"` compile target
4. Test omitted/unknown deployments and the failing combination
5. Do not fold the rule into `compile()`. Do not change the `qwen` alias

## Adding a request profile

1. Add `packages/core/src/request/<vendor>.ts` with `defineRequestProfile(...)`
2. Register it in `packages/core/src/request/registry.ts`
3. Test omitted defaults and the failing combination
4. Document evidence (`documented` | `sdk-observed` | `empirical`)
5. Do not fold the rule into `compile()`

## Agent files

- `AGENTS.md` (this file) is the cross-tool guide
- `.agents/skills/` holds task checklists (`add-target`, `add-request-profile`, `review-compiler`, `release`)
- `CLAUDE.md` points here so Claude Code uses the same rules

## Commands

```bash
pnpm install
pnpm test
pnpm check
pnpm bench
```
