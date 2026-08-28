# プロファイル

ターゲットプロファイルは、パッケージに同梱されたデータです。`compile(schema, "anthropic")` はエイリアスをプロファイル id に解決します。実行時に取りに行きません。

`listTargets()` のデフォルトはクラウドの **プロバイダ** です。LM Studio、Ollama、llama.cpp、vLLM、SGLang は compile できますが、id を渡さない限り `npx llm-abi check` には出ません。

`resolveTarget("qwen")` は `alibaba/qwen/tools` — Alibaba Model Studio です。ローカルの Qwen ではありません。

## プロバイダ

maturity と証拠は別物です。**Supported** は、フィクスチャ付きでメンテしている、という意味です。ライブ API が通った、ではありません。**Last verified** は、メンテナがリンク先を確認した日です。コンパイル済みスキーマをそのベンダへ送れるのは、nightly のライブアダプタがあるときだけです。

| エイリアス   | プロファイル                    | Maturity     | 証拠                                                                                             | Last verified | Live    |
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

OpenRouter はゲートウェイです。ルーティング先のモデルで強制力が変わるので、互換性の下限は `runtime-safe` です。MCP は、デプロイされたホスト向けに保守的です。

## ランタイム

こちらは format やエンジンの文脈が要ります。実験的です。キーワード表はリンク先のドキュメントから取っています。OpenAI の strict mode のコピーではありません。

| エイリアス      | プロファイル                 | Maturity     | 証拠                                                                               | Last verified |
| --------------- | ---------------------------- | ------------ | ---------------------------------------------------------------------------------- | ------------- |
| `llamacpp`      | `llamacpp/server/structured` | Experimental | [documented](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md) | 2026-08-28    |
| `lmstudio/gguf` | `lmstudio/gguf/structured`   | Experimental | [documented](https://lmstudio.ai/docs/developer/openai-compat/structured-output)   | 2026-08-28    |
| `lmstudio/mlx`  | `lmstudio/mlx/structured`    | Experimental | [documented](https://lmstudio.ai/docs/developer/openai-compat/structured-output)   | 2026-08-28    |
| `ollama`        | `ollama/chat/structured`     | Experimental | [documented](https://docs.ollama.com/capabilities/structured-outputs)              | 2026-08-28    |
| `vllm`          | `vllm/openai/structured`     | Experimental | [documented](https://docs.vllm.ai/en/stable/features/structured_outputs/)          | 2026-08-28    |
| `sglang`        | `sglang/openai/structured`   | Experimental | [documented](https://docs.sglang.io/docs/advanced_features/structured_outputs.md)  | 2026-08-28    |

短い `lmstudio` エイリアスはありません。GGUF と MLX はスキーマエンジンが違います。`format` を付けるか、id を明示して compile してください。

`checkDeployment()` と `local` CLI は [ローカル](./local.md) を見てください。

## 証拠の種類

| 種類           | 意味                         |
| -------------- | ---------------------------- |
| `documented`   | 公式ドキュメントに書いてある |
| `sdk-observed` | 公式 SDK の変換処理で見える  |
| `empirical`    | ライブ API に対して観測した  |

`lastVerified` は、ライブリクエストが成功した日ではありません。ライブアダプタの信号は `evidence.live === "nightly"` です。

## リクエストプロファイル

`checkRequest()` は別ファミリーです。出荷済みの GPT-5.6 ルール: Chat Completions と function tools は、実効 reasoning が `none` のときだけ互換です。詳細は [リクエスト](./requests.md) です。
