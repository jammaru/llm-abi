# Profiles

A target profile is data shipped with the package. `compile(schema, "anthropic")` resolves an alias to a profile id. Profiles are not fetched at runtime.

`listTargets()` defaults to cloud **provider** profiles. Runtime schema engines (LM Studio, Ollama, llama.cpp, vLLM, SGLang) are compile-addressable and stay out of `npx llm-abi check` unless you pass their id.

`resolveTarget("qwen")` is `alibaba/qwen/tools` — Alibaba Model Studio. It is not local Qwen.

## Provider targets

Maturity and evidence are separate. **Supported** means the profile is maintained with fixtures. It does not claim a live API check. **Last verified** is when maintainers checked the linked source. Only a nightly live adapter means the repository can send a compiled schema to that vendor.

| Alias        | Profile                         | Maturity     | Evidence                                                                                         | Last verified | Live    |
| ------------ | ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ | ------------- | ------- |
| `openai`     | `openai/responses/structured`   | Supported    | [documented](https://developers.openai.com/api/docs/guides/structured-outputs)                   | 2026-08-18    | Nightly |
| `anthropic`  | `anthropic/messages/structured` | Supported    | [documented](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)           | 2026-08-18    | Nightly |
| `gemini`     | `google/gemini/structured`      | Supported    | [documented](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)           | 2026-08-18    | Nightly |
| `deepseek`   | `deepseek/chat/strict-tools`    | Supported    | [documented](https://api-docs.deepseek.com/guides/tool_calls)                                    | 2026-08-18    | —       |
| `xai`        | `xai/grok/structured`           | Supported    | [documented](https://docs.x.ai/developers/model-capabilities/text/structured-outputs)            | 2026-08-18    | —       |
| `qwen`       | `alibaba/qwen/tools`            | Supported    | [documented](https://help.aliyun.com/en/model-studio/qwen-function-calling)                      | 2026-08-18    | —       |
| `mistral`    | `mistral/chat/structured`       | Experimental | [sdk-observed](https://docs.mistral.ai/capabilities/structured-output/custom_structured_output/) | 2026-08-18    | —       |
| `openrouter` | `openrouter/structured`         | Partial      | [documented](https://openrouter.ai/docs/guides/features/structured-outputs)                      | 2026-08-18    | —       |
| `mcp`        | `mcp/2026-06/tools`             | Partial      | [documented](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)              | 2026-08-18    | —       |

OpenRouter is a gateway: enforcement varies by the routed model, so compatibility is floored at `runtime-safe`. MCP is conservative for deployed hosts.

## Runtime targets

These need format or engine context. They are experimental. Keyword tables are taken from the linked docs, not copied from OpenAI strict mode.

| Alias           | Profile                      | Maturity     | Evidence                                                                           | Last verified |
| --------------- | ---------------------------- | ------------ | ---------------------------------------------------------------------------------- | ------------- |
| `llamacpp`      | `llamacpp/server/structured` | Experimental | [documented](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md) | 2026-08-28    |
| `lmstudio/gguf` | `lmstudio/gguf/structured`   | Experimental | [documented](https://lmstudio.ai/docs/developer/openai-compat/structured-output)   | 2026-08-28    |
| `lmstudio/mlx`  | `lmstudio/mlx/structured`    | Experimental | [documented](https://lmstudio.ai/docs/developer/openai-compat/structured-output)   | 2026-08-28    |
| `ollama`        | `ollama/chat/structured`     | Experimental | [documented](https://docs.ollama.com/capabilities/structured-outputs)              | 2026-08-28    |
| `vllm`          | `vllm/openai/structured`     | Experimental | [documented](https://docs.vllm.ai/en/stable/features/structured_outputs/)          | 2026-08-28    |
| `sglang`        | `sglang/openai/structured`   | Experimental | [documented](https://docs.sglang.io/docs/advanced_features/structured_outputs.md)  | 2026-08-28    |

There is no short `lmstudio` alias. GGUF and MLX use different schema engines; set `format` or compile with an explicit id.

See [Local runtimes](./local.md) for `checkDeployment()` and the `local` CLI.

## Evidence kinds

| Kind           | Meaning                                |
| -------------- | -------------------------------------- |
| `documented`   | Stated in official provider docs       |
| `sdk-observed` | Visible in an official SDK transformer |
| `empirical`    | Observed against a live API            |

`lastVerified` is not a successful live request. `evidence.live === "nightly"` is the live adapter signal.

## Request profiles

`checkRequest()` uses a separate profile family. The shipped GPT-5.6 rule: Chat Completions plus function tools is compatible only when effective reasoning is `none`. See [Requests](./requests.md).
