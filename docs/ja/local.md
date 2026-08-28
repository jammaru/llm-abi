# ローカルランタイム

同じ Qwen3.8 の重みでも、LM Studio の GGUF、LM Studio の MLX、Ollama、llama.cpp、vLLM、SGLang ではスキーマ契約が違います。

`checkDeployment()` が Runtime ABI です。純粋で、ネットワークは使いません。探索と probe は `llm-abi/local` と `llm-abi local` CLI にあります。

`compile(schema, "qwen")` は、これまでどおり Alibaba Model Studio です。

## 静的チェック

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

LM Studio は `format` が無いと GGUF か MLX かを推測しません。Ollama の Responses で `stateful: true` は `unsupported` です。未知の機能は `unknown` のままです。`unsupported` にはしません。

## CLI

デフォルトの探索はループバックだけです。`127.0.0.1:1234`（LM Studio）、`:11434`（Ollama）、`:8080`（llama.cpp）。`--url` を付けない限り localhost から出ません。リダイレクトは拒否します。

```bash
npx llm-abi local doctor
npx llm-abi local check schema.json
npx llm-abi local matrix schema.json
npx llm-abi local lock schema.json
npx llm-abi local diff llm-abi.local.lock.json
npx llm-abi local probe --suite smoke
```

| コマンド       | すること                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| `local doctor` | ロード済みモデルのメタデータを GET。生成はしない                             |
| `local check`  | ロード済みモデル1件の `checkDeployment()`                                    |
| `local matrix` | ロード済みモデルすべての静的互換性。`--probe` は任意                         |
| `local lock`   | フィンガープリントを保存。URL、秘密情報、絶対パスは入れない                  |
| `local diff`   | lock 同士、または lock と今ロードされているデプロイの比較                    |
| `local probe`  | 明示的な smoke、または `--suite full` のキーワード推定。合成フィクスチャだけ |

`--model` は、ランタイムにそのモデルをロードさせることがあります。省略すると、すでに載っているものを使います。

probe が通っても、**静的な互換性は上がりません**。

vLLM と SGLang はオプトインです。

```bash
npx llm-abi local doctor --url http://127.0.0.1:8000 --runtime vllm
npx llm-abi compile schema.json --target vllm
```

デフォルトのループバックポートは見ません。

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

Node 専用です。ブラウザの playground は localhost に接続しません。playground に行を出したいときは、手元の `llm-abi local doctor --json` を貼ってください。

## lock

`local lock` のデフォルト出力は `llm-abi.local.lock.json` です。フィンガープリントは3つに分かれます。

- **contract** — スキーマ + リクエスト
- **deployment** — ランタイムの種類、エンジン、公開モデル id
- **evaluation** — 互換性、coverage、プロファイル revision

`local diff lock.json` だけ（2つ目のファイルなし）は、今ロードされているデプロイと比べます。スキーマを渡していないので、contract のずれは無視します。契約まで比べるなら、2つ目の引数にスキーマファイルを渡してください。

フラグは [CLI](./cli.md)、ランタイムの id は [プロファイル](./profiles.md) です。
