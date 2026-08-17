# 0004 — Compatibility playground

Date: 2026-08-18

## Decision

Ship a static browser playground in `packages/playground`. It calls `compile`, `check` is not required, `analyze`, and `listTargets` from `llm-abi`. Compilation happens on the client. Provider profiles are the ones shipped with the package.

## Why

The library's unique value is provider-aware lowering plus loss diagnostics, including a closed TypeScript type subset as the ABI input. A playground that pastes TypeScript or JSON Schema and compares OpenAI / Anthropic / Gemini output is the strongest way to see that, without turning llm-abi into an agent framework or a hosted compiler API.

## Constraints

- Keep the playground out of `packages/core`
- Do not fetch provider docs or profiles at runtime
- Do not invent compatibility percentages
- Do not send the user's schema to a server
- Cloudflare Pages is a static upload of the Vite build (`base: "./"`). Compilation stays in the browser; the host never receives the schema.
