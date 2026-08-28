# API

名前付きエクスポートだけです。default export はありません。

普段使うのはこの4つです。

1. `compile` — スキーマをプロバイダ向けに直す
2. `check` — 組み込みのクラウド向けターゲットを一度に見る
3. `checkRequest` — モデル + エンドポイント + tools + reasoning が送れるか
4. `checkDeployment` — 手元や自前のランタイムで契約が持つか

```ts
import {
  compile,
  check,
  checkRequest,
  checkDeployment,
  analyze,
  fingerprint,
  listTargets,
  resolveTarget,
  listRequestProfiles,
  resolveRequestProfile,
  listRuntimeProfiles,
  resolveRuntimeProfile,
  listModelProfiles,
  resolveModelProfile,
} from "llm-abi";
```

## `compile(schema, target | options)`

JSON Schema、Standard JSON Schema、または閉じた TypeScript 型の部分集合を、プロバイダが受け取れるスキーマにします。

```ts
const result = compile(schema, "anthropic");
const same = compile(schema, { target: "anthropic/messages/structured" });
```

| フィールド      | 意味                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `schema`        | プロバイダ向け JSON Schema                                           |
| `diagnostics`   | 安定した `code`、パス、次にできること                                |
| `loss`          | 離散的な互換性 + 外された制約                                        |
| `fingerprint`   | 出力スキーマの正規化 SHA-256                                         |
| `target`        | 解決済みプロファイル（id、vendor、revision、maturity、証拠）         |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported`             |
| `size`          | 出力の UTF-8 バイト数と、余裕を見たトークン目安（`ceil(bytes / 3)`） |
| `validate`      | **元のスキーマ** に対する検証                                        |

`compile()` は純粋です。ネットワーク、ファイル、時計、乱数は使いません。

`strict: true` は、互換性が `unsupported` のとき `SchemaCompatibilityError` を投げます。

`constraintFallback: "description" | "strip"` は、ランタイムだけの制約を `description` に足すか、捨てるかを決めます。

`optimize: true` は、プロパティ名と同じ title や、title と同じ description を落とします。落とすたびに `redundant-annotation-removed` が出ます。デフォルトは `false` です。オフのままなら、以前出した JSON は変わりません。

`typeName` は、TypeScript 入力のどの `type` / `interface` をコンパイルするかを選びます。デフォルトは、最後の export、それがなければ最後の宣言です。

TypeScript 入力は閉じた部分集合です。`type` / `interface`、プリミティブ、リテラル、配列、タプル、ユニオン、交差、省略可能なプロパティ、入れ子オブジェクト、`Array<T>`、`ReadonlyArray<T>`、`Record<string, T>`。文字列・数値・真偽のリテラルユニオンは `enum` になります。`typescript` コンパイラ依存はなく、import 解決もジェネリック型宣言もありません。未対応の構文は、黙って落とさず throw します。

## `check(schema, options?)`

組み込みの **プロバイダ** ターゲット（または `options.targets`）すべてに `compile` を走らせます。ランタイム向けスキーマは、id を明示しない限り入りません。各行にそのターゲットの `size` が付きます。`options.optimize` は各 compile に渡ります。

## `analyze(schema)`

フィンガープリント、ノード／深さ／プロパティ数、未使用のルート `$defs`、入力サイズ、パースメモを返します。プロバイダへは下げません。

## `fingerprint(schema)`

入力スキーマの正規化 SHA-256 です。プロパティの順番は関係ありません。

## `checkRequest(request)`

プロバイダへ送る組み合わせが表現できるかを見ます。`compile()` ではありません。モデルは呼ばず、ペイロードも書き換えず、SDK も選びません。

```ts
const result = checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});
```

| フィールド      | 意味                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `coverage`      | リクエストプロファイルが当たれば `profiled`。ルールがなければ `unknown`                             |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported`                                            |
| `diagnostics`   | 安定した `code`、理由、次にできること                                                               |
| `effective`     | モデルのデフォルトを入れたあとのリクエスト。省略した `reasoningEffort` が `medium` になることがある |
| `profile`       | 当たったプロファイル。ルールがなければ `undefined`                                                  |
| `fixes`         | エンドポイントやパラメータの提案。自動では適用しません                                              |

出荷済みの OpenAI 互換ファミリーでは `provider` は `openai`、`azure-openai`、`azure` です。`endpoint` は `chat-completions`、`responses`、短い別名（`chat`、`/v1/chat/completions`）を受け付けます。`tools: true` または `tools: "function"` は function tools ありです。

`checkRequest()` は純粋です。同じ入力なら同じ結果です。

プロファイルが当たらないとき、`coverage` は `unknown`、`compatibility` は `lossless`、`profile` は `undefined` です。デフォルトは作りません。`unknown` は「未チェック」です。送ってよい、ではありません。

出荷済みの GPT-5.6 ルール: Chat Completions と function tools は、実効 reasoning が `none` のときだけ互換です。GPT-5.6 は省略した `reasoning_effort` を `medium` にするため、省略しただけで落ちます。Responses は reasoning 付きの function tools を受け付けます。

## `listTargets()` / `resolveTarget(id)`

`resolveTarget("claude")` は Anthropic の structured プロファイルです。`resolveTarget("deepseek")` は `deepseek/chat/strict-tools`。`resolveTarget("grok")` は `xai/grok/structured`。`resolveTarget("qwen")` は `alibaba/qwen/tools`（Alibaba Model Studio。**ローカル Qwen / LM Studio / Ollama / llama.cpp ではありません**）。`resolveTarget("mistral")` は `mistral/chat/structured`。`resolveTarget("openrouter")` は `openrouter/structured`。`resolveTarget("mcp")` は `mcp/2026-06/tools`。`listTargets()` のデフォルトは `scope: "provider"` です。`llamacpp/server/structured`、`vllm/openai/structured`、`sglang/openai/structured` などを見るときは `{ scope: "runtime" }` または `{ scope: "all" }` を渡します。`resolveTarget("vllm")` と `resolveTarget("sglang")` はランタイム scope のままです。未知の id は `LlmAbiError` です。

解決済みターゲットには次が付きます。

```ts
{
  maturity: "supported" | "partial" | "experimental",
  evidence: {
    kind: "documented" | "sdk-observed" | "empirical",
    source: "https://...",
    lastVerified: "2026-08-18",
    live: "nightly" | "not-configured",
  },
}
```

maturity、文書上の証拠、ライブ検証は別の信号です。ドキュメントを確認した日付は、ライブ API が通ったことではありません。

## `listRequestProfiles()` / `resolveRequestProfile(id)`

`resolveRequestProfile("openai/gpt-5.6")` は GPT-5.6 ファミリーです。未知の id は `LlmAbiError` です。

## `checkDeployment(input)`

スキーマとリクエストの契約が、ランタイム × エンジン × モデルで表現できるかを見ます。`compile()` でもジェネレータでもありません。

```ts
const result = checkDeployment({
  schema,
  deployment: {
    runtime: { kind: "lmstudio", apiSurface: "openai", engine: { kind: "llamacpp" } },
    model: { id: "Qwen3.8-27B-Q4_K_M", format: "gguf" },
  },
  request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
});
```

| フィールド      | 意味                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `coverage`      | ランタイムプロファイルが当たり、必要な機能が分かっていれば `profiled`。`partial` や `unknown` もある |
| `compatibility` | スキーマ compile と、ランタイム／モデル機能ルールの悪い方                                            |
| `schema`        | ランタイム向けスキーマターゲットが解決できたときだけ                                                 |
| `fixes`         | リクエスト変更の提案。自動では適用しません                                                           |

`checkDeployment()` は純粋です。ランタイムプロファイルが当たらなければ、`coverage` は `unknown`、`compatibility` は `lossless` です。未知の機能は `unsupported` になりません。probe の結果はここには入りません。

Ollama の Responses で `stateful: true` は `unsupported` です（`previous_response_id` が未対応と書かれています）。LM Studio は `format` が無いと GGUF か MLX かを推測しません。

## `llm-abi/local`

```ts
import {
  discoverLocalDeployments,
  probeDeployment,
  matrixLocalDeployments,
  createDeploymentLock,
  diffDeploymentLocks,
} from "llm-abi/local";
```

Node 専用です。デフォルトの探索は `127.0.0.1:1234`、`:11434`、`:8080` です。LAN は走査せず、リダイレクトも追いません。`local doctor` は GET でメタデータを取り、ロード済みモデルを並べるだけです。`local probe` は合成フィクスチャでの明示的な生成です。`matrixLocalDeployments()` はロード済みモデルを比べます。`createDeploymentLock()` は contract / deployment / evaluation のフィンガープリントを分け、絶対パスを消します。`model` を明示すると、ランタイムがそのモデルをロードすることがあります。probe が通っても、静的な互換性は上がりません。
