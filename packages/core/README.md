# llm-abi

llm-abi is a schema compiler for LLM providers.

Give it a TypeScript type or JSON Schema. Get back the schema that provider will accept.

```bash
npm i llm-abi
```

```ts
import { compile } from "llm-abi";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
  },
  required: ["name"],
};

const result = compile(schema, "anthropic");

result.schema;
result.compatibility;
result.validate({ name: "Ada" });
```

[Docs](https://llm-abi.pages.dev/docs/) · [Playground](https://llm-abi.pages.dev/) · [GitHub](https://github.com/jammaru/llm-abi)
