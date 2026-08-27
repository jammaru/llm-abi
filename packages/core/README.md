# llm-abi

Published compiler for [llm-abi](https://github.com/jammaru/llm-abi).

```ts
import { compile, checkRequest } from "llm-abi";

const result = compile(schema, "anthropic");
const request = checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});
```

```bash
npx llm-abi check schema.json
```

Zero runtime dependencies. See the [repository README](https://github.com/jammaru/llm-abi) for targets, compatibility levels, and CLI docs.
