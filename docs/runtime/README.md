# Runtime profiles

A runtime profile is data. `checkDeployment()` resolves the runtime, optional model family, and schema engine, then evaluates request requirements. Do not add `if (runtime === "ollama")` branches in the checker.

Schema keyword support stays on `compile()` targets with `scope: "runtime"`. Model profiles record tools, vision, and reasoning only.

## Steps

1. Add `packages/core/src/deployment/runtime/<vendor>.ts` with `defineRuntimeProfile(...)`.
2. Register it in `packages/core/src/deployment/runtime/registry.ts`.
3. If the schema engine is documented, add a `scope: "runtime"` target and set `schemaTarget`.
4. Set `evidence` to `documented`, `sdk-observed`, or `empirical`.
5. Add tests for the failing combination and for an unknown deployment.
6. Update [docs/api.md](../api.md) and run `pnpm test` plus `pnpm changeset`.

## Out of scope

- Generating, routing, or loading models
- Fetching docs at runtime
- Folding runtime rules into `compile()`
- Treating `unknown` as `supported` or `unsupported`
- Changing the `qwen` compile alias (Alibaba Model Studio)
