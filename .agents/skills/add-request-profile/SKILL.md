---
name: add-request-profile
description: Add an llm-abi request compatibility profile for provider, model, endpoint, and reasoning rules. Use when adding checkRequest families such as OpenAI GPT-5.6 Chat Completions tools plus reasoning.
---

# Add an llm-abi request profile

## Steps

1. Add or extend `packages/core/src/request/<vendor>.ts` with `defineRequestProfile`.
2. Register it in `packages/core/src/request/registry.ts`.
3. Set `evidence` to `documented`, `sdk-observed`, or `empirical`.
4. Add focused tests for omitted defaults and the incompatible combination.
5. Document the rule in `docs/api.md` and `docs/requests/README.md`.
6. Run `pnpm test` and `pnpm changeset`.

Do not add the rule to `compile()`. Do not add a vendor SDK. Do not fetch docs at runtime. Do not implement `negotiate()` or send the request.

See [docs/requests/README.md](../../../docs/requests/README.md).
