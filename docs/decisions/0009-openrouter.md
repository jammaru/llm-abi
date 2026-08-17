# 0009 — OpenRouter is a gateway, not a model

Date: 2026-08-18

## Decision

The OpenRouter structured profile is not an OpenAI copy. Official docs accept `response_format.json_schema` and state that enforcement varies by routed provider: some guarantee conformance, others translate the schema or treat it as a hint.

The compiler therefore:

- preserves optional fields and `additionalProperties` instead of applying OpenAI required-all
- floors compatibility at `runtime-safe` via `compatibilityCeiling`
- always emits `gateway-enforcement-varies`

A lossless keyword mapping here does not mean every routed model accepts the schema. README status is **Partial**.

## Evidence

`documented` against https://openrouter.ai/docs/guides/features/structured-outputs (revision 2026-08).
