# llm-abi

**One schema. Every model.**

Compile a TypeScript type or JSON Schema into the schema each provider will accept. Compatibility is `lossless`, `runtime-safe`, `lossy`, or `unsupported` — not a percentage.

```bash
npm i llm-abi
```

```ts
import { compile, checkRequest } from "llm-abi";

const result = compile(schema, "anthropic");
result.schema;
result.compatibility;
result.validate(modelOutput);

const request = checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});
// unsupported: omitted reasoning_effort defaults to medium
```

Zero runtime dependencies. `compile(schema, "qwen")` is Alibaba Model Studio, not local Qwen.

[Docs](https://llm-abi.pages.dev/docs/) · [Playground](https://llm-abi.pages.dev/) · [GitHub](https://github.com/jammaru/llm-abi)
