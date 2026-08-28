# ガイド

llm-abi に TypeScript の型か JSON Schema を **1つ** 渡します。返ってくるのは、各プロバイダが実際に受け取れるスキーマと、「何が変わったか」です。

モデルは呼びません。`result.schema` を、いつもの SDK に渡してください。互換性のパーセントはありません。結果は次の4つだけです。

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

## 結果の読み方

| 結果           | 意味                                               | 次にすること                        |
| -------------- | -------------------------------------------------- | ----------------------------------- |
| `lossless`     | 書いた意味が、プロバイダ側でも残っている           | `result.schema` を送る              |
| `runtime-safe` | 一部の制約がスキーマから外された                   | 送ったあと `result.validate` を呼ぶ |
| `lossy`        | 書き換えで意味が変わった（`oneOf` → `anyOf` など） | その変更でよいか自分で判断する      |
| `unsupported`  | その構文を表現できない                             | スキーマかターゲットを変える        |

`result.validate` が見るのは **元のスキーマ** です。下げたあとのスキーマではありません。Anthropic が `minimum` を description に移しても、`age: -1` は検証で落ちます。

## 知りたいことごとに関数が分かれている

| 知りたいこと                                               | 呼ぶ関数            |
| ---------------------------------------------------------- | ------------------- |
| このスキーマは、このプロバイダで表現できるか               | `compile` / `check` |
| このモデル + エンドポイント + tools + reasoning は送れるか | `checkRequest`      |
| 手元や自前のランタイムでも、同じ契約が持つか               | `checkDeployment`   |

リクエストやランタイムのルールを `compile()` に混ぜないでください。`compile(schema, "qwen")` は Alibaba Model Studio です。ノート PC 上の Qwen GGUF ではありません。

## 次に読む

- [Playground](https://llm-abi.pages.dev/) — 型やスキーマを貼る。コンパイルはこのブラウザ内で完結します
- [API](./api.md) — `compile`、`check`、`checkRequest`、`checkDeployment`
- [CLI](./cli.md) — `npx llm-abi check schema.json`
- [プロファイル](./profiles.md) — 組み込みターゲットと証拠
- [リクエスト](./requests.md) — モデル・エンドポイント・tools・reasoning
- [ローカル](./local.md) — LM Studio、Ollama、llama.cpp、vLLM、SGLang
- [保証](./guarantees.md) — 何が決定的で、何がそうでないか
- [構成](./architecture.md) — Schema ABI、Request ABI、Runtime ABI
