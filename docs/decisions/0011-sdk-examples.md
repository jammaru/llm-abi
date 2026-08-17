# 0011 — Examples sit under SDKs, they do not wrap them

Date: 2026-08-18

## Decision

llm-abi is a schema compiler, not an SDK. Examples show the unique loop:

1. `compile(schema, target)` lowers to a provider-safe schema and emits diagnostics.
2. `result.schema` is placed in the field the existing SDK already documents.
3. `result.validate` checks model output against the original schema, including constraints the provider stripped.

Recipes live in `examples/`. They do not call provider APIs (no secrets, no network). They do not add OpenAI, Anthropic, Gemini, Vercel AI SDK, or the MCP TypeScript SDK as `packages/core` dependencies.

The MCP recipe compiles a TypeScript tool argument type to `inputSchema`. String literal unions become `enum` (not `anyOf` of `const`) so hosts that still reject combinators receive the published object subset. Non-recursive `$defs` are inlined.

## Evidence

SDK field names are taken from public docs dated 2026-08: OpenAI Responses `text.format`, Anthropic `output_config.format`, Gemini Interactions `response_format`, AI SDK `jsonSchema` / `inputSchema`, MCP `Tool.inputSchema`.
