# 0014 — Runtime ABI is a checker, not a local LLM runtime

Date: 2026-08-28

## Decision

Ship a third public surface next to `compile()` and `checkRequest()`:

```ts
checkDeployment({
  schema,
  deployment: { runtime, model },
  request: { endpoint, structuredOutput, tools, stateful },
});
```

Runtime schema engines may also be `compile()` targets with `scope: "runtime"`. Default `check()`, `listTargets()`, the playground, and the GitHub Action stay on `scope: "provider"`.

Node-only discovery and optional smoke probe live in `llm-abi/local` and `llm-abi local …`. They are not part of the neutral library entry.

## Why

OpenAI-compatible labels are not ABI-compatible. The same Qwen3.8 weights can differ across:

- LM Studio GGUF → llama.cpp grammar
- LM Studio MLX → Outlines
- Ollama native `format`
- llama.cpp server

That is the same class of problem llm-abi already treats for cloud vendors. It does not require `generate()`, a router, or a provider SDK.

`compile(schema, "qwen")` remains Alibaba Model Studio (`alibaba/qwen/tools`). Local Qwen is a model identity (`qwen/qwen3.8`) plus a runtime schema target. Mixing those would break existing users.

## Rules

- `checkDeployment()` is pure: no network, filesystem, clock, or env
- Probe success must not upgrade static compatibility
- Unknown is not `supported` and not `unsupported`
- Default discovery is `127.0.0.1` only and never loads a model
- `local doctor` is GET metadata only
- Only `local probe` may generate, and only with synthetic fixtures
- Port 8080 is not an identity. MLX LM is never auto-detected
- Absolute model paths are reduced to a basename in resolved output

## Evidence

First runtime schema targets are `experimental` and `documented` against:

- https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md
- https://lmstudio.ai/docs/developer/openai-compat/structured-output
- https://docs.ollama.com/capabilities/structured-outputs
- https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/SERVER.md

Keyword tables stay conservative. Undocumented keywords are `runtime-only` except where llama.cpp documents a break.

## Later in this series

`local matrix`, `local lock` / `local diff`, and a keyword probe suite ship as follow-up CLI on `llm-abi/local`. The playground can paste `local doctor --json`; it still does not open localhost. vLLM / SGLang profiles remain deferred.

## Never

- `generate()`, `chat()`, `route()`, model download/load
