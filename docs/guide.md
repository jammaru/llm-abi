# Guide

Give llm-abi one TypeScript type or JSON Schema. It returns the schema each provider will actually accept, and what changed.

It does not call a model. Put `result.schema` on the SDK you already use. Compatibility is four labels — never a percentage.

```bash
npm install llm-abi
```

```ts
import { compile } from "llm-abi";

const result = compile(schema, "anthropic");

if (result.compatibility === "unsupported") {
  throw new Error("This schema cannot be represented on Anthropic.");
}

const checked = result.validate(modelJson);
if (!checked.ok) {
  throw new Error("The model output failed the original schema.");
}
```

## How to read the result

| Result         | Meaning                                            | What you do                          |
| -------------- | -------------------------------------------------- | ------------------------------------ |
| `lossless`     | The provider schema keeps the written meaning      | Send `result.schema`                 |
| `runtime-safe` | Some constraints were stripped                     | Send it, then call `result.validate` |
| `lossy`        | The rewrite changed meaning (`oneOf` → `anyOf`, …) | Decide whether that change is OK     |
| `unsupported`  | The construct cannot be represented                | Change the schema or the target      |

`result.validate` always checks the **original** schema, not the lowered one. If Anthropic moved `minimum` into a description, `age: -1` still fails validation.

## Three questions, three functions

| You want to know                                                   | Call                |
| ------------------------------------------------------------------ | ------------------- |
| Can this schema be represented on this provider?                   | `compile` / `check` |
| Can this model + endpoint + tools + reasoning combination be sent? | `checkRequest`      |
| Can this contract hold on a local or self-hosted runtime?          | `checkDeployment`   |

Do not fold request or runtime rules into `compile()`. `compile(schema, "qwen")` is Alibaba Model Studio, not a laptop Qwen GGUF.

## Next

- [Playground](https://llm-abi.pages.dev/) — paste a type or schema. Compilation stays in the browser.
- [API](./api.md) — `compile`, `check`, `checkRequest`, `checkDeployment`
- [CLI](./cli.md) — `npx llm-abi check schema.json`
- [Profiles](./profiles.md) — built-in targets and evidence
- [Requests](./requests.md) — `checkRequest` for model, endpoint, tools, and reasoning
- [Local runtimes](./local.md) — LM Studio, Ollama, llama.cpp, vLLM, SGLang
- [Guarantees](./guarantees.md) — what is deterministic, and what is not
- [Architecture](./architecture.md) — Schema ABI, Request ABI, and Runtime ABI
