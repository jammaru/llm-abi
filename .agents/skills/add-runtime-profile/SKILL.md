---
name: add-runtime-profile
description: Add an llm-abi runtime or model compatibility profile. Use when adding LM Studio, Ollama, llama.cpp, or local model-family rules for checkDeployment.
---

# Add an llm-abi runtime profile

## Steps

1. Add `packages/core/src/deployment/runtime/<vendor>.ts` with `defineRuntimeProfile`.
2. Register it in `packages/core/src/deployment/runtime/registry.ts`.
3. If structured output has documented keyword limits, add a `scope: "runtime"` compile target and set `schemaTarget`.
4. Set `evidence` to `documented`, `sdk-observed`, or `empirical`.
5. Test the failing combination, an unknown deployment, and LM Studio without format.
6. Document the rule in `docs/api.md` and `docs/runtime/README.md`.
7. Run `pnpm test` and `pnpm changeset`.

Do not add the rule to `compile()`. Do not add a vendor SDK. Do not fetch docs at runtime. Do not implement `generate()`, `route()`, or model load. Do not change the `qwen` alias.
