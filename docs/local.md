# Local runtimes

The same Qwen3.8 weights are not the same schema contract on LM Studio GGUF, LM Studio MLX, Ollama, llama.cpp, vLLM, or SGLang.

`checkDeployment()` is the Runtime ABI. It is pure: no network. Discovery and probe live in `llm-abi/local` and the `llm-abi local` CLI.

`compile(schema, "qwen")` stays Alibaba Model Studio.

## Static check

```ts
import { checkDeployment } from "llm-abi";

const result = checkDeployment({
  schema,
  deployment: {
    runtime: { kind: "lmstudio", apiSurface: "openai", engine: { kind: "llamacpp" } },
    model: { id: "Qwen3.8-27B-Q4_K_M", format: "gguf" },
  },
  request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
});
```

LM Studio without `format` does not guess GGUF vs MLX. Ollama Responses with `stateful: true` is `unsupported`. Unknown features stay `unknown`; they do not become `unsupported`.

## CLI

Default discovery is loopback only: `127.0.0.1:1234` (LM Studio), `:11434` (Ollama), `:8080` (llama.cpp). It never leaves localhost unless you pass `--url`. Redirects are rejected.

```bash
npx llm-abi local doctor
npx llm-abi local check schema.json
npx llm-abi local matrix schema.json
npx llm-abi local lock schema.json
npx llm-abi local diff llm-abi.local.lock.json
npx llm-abi local probe --suite smoke
```

| Command        | What it does                                                                |
| -------------- | --------------------------------------------------------------------------- |
| `local doctor` | GET metadata for loaded models. Never generates                             |
| `local check`  | `checkDeployment()` for one loaded model                                    |
| `local matrix` | Static compatibility for every loaded model. `--probe` is optional          |
| `local lock`   | Snapshot fingerprints. No URLs, secrets, or absolute paths                  |
| `local diff`   | Compare two locks, or a lock against the current loaded deployment          |
| `local probe`  | Explicit smoke or `--suite full` keyword inference. Synthetic fixtures only |

`--model` may cause the runtime to load that model. Omit it to use what is already loaded.

A probe pass **does not** upgrade static compatibility.

vLLM and SGLang are opt-in:

```bash
npx llm-abi local doctor --url http://127.0.0.1:8000 --runtime vllm
npx llm-abi compile schema.json --target vllm
```

They are not scanned on the default loopback ports.

## Node API

```ts
import {
  discoverLocalDeployments,
  matrixLocalDeployments,
  createDeploymentLock,
  diffDeploymentLocks,
  probeDeployment,
} from "llm-abi/local";
```

Node only. The browser playground never calls localhost. Paste `llm-abi local doctor --json` if you want the playground to show those rows.

## Locks

`local lock` writes `llm-abi.local.lock.json` by default. Fingerprints are split:

- **contract** — schema + request
- **deployment** — runtime kind, engine, public model id
- **evaluation** — compatibility, coverage, profile revisions

`local diff lock.json` without a second file compares the current loaded deployment and ignores contract drift (no schema was supplied). Pass a schema file as the second argument to compare the contract honestly.

See [CLI](./cli.md) for flags and [Profiles](./profiles.md) for runtime target ids.
