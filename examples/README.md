# Examples

Recipes that sit under existing SDKs. Each file compiles a schema, builds the provider request field, and validates model output against the **original** schema. None of these packages call a network API, and none of them are dependencies of `packages/core`.

| Directory          | Recipe                                               |
| ------------------ | ---------------------------------------------------- |
| `openai/`          | OpenAI Responses `text.format.json_schema`           |
| `anthropic/`       | Anthropic Messages `output_config.format`            |
| `gemini/`          | Gemini Interactions `response_format.schema`         |
| `ai-sdk/`          | Vercel AI SDK `generateObject` / `tools.inputSchema` |
| `mcp/`             | MCP tool `inputSchema` host subset                   |
| `standard-schema/` | Standard JSON Schema input                           |

```bash
pnpm --filter @llm-abi/example-openai start
pnpm --filter @llm-abi/example-mcp start
```

Pass `result.schema` to the SDK. Keep `result.diagnostics` and `result.validate` in your process. Do not add OpenAI, Anthropic, Gemini, AI SDK, or the MCP TypeScript SDK to `packages/core`.
