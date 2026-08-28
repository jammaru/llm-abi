# リクエスト

`checkRequest()` は、「この組み合わせをプロバイダへ送れるか」を答えます。`compile()` ではありません。モデルは呼ばず、ペイロードも書き換えず、SDK も選びません。

```ts
import { checkRequest } from "llm-abi";

const result = checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});

result.coverage;
// "profiled"
result.compatibility;
// "unsupported"
result.effective.reasoningEffort;
// "medium"  (モデルのデフォルト)
```

この例は、フィールドを省略しただけで落ちます。GPT-5.6 は省略した `reasoning_effort` を `medium` にするからです。

## 結果の読み方

| フィールド      | 意味                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `coverage`      | プロファイルが当たれば `profiled`。出荷ルールがなければ `unknown`    |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported`             |
| `effective`     | プロファイルのデフォルトを入れたあと。省略は「未設定」ではありません |
| `fixes`         | エンドポイントやパラメータの提案。自動では適用しません               |

プロファイルが当たらないとき、`coverage` は `unknown`、`compatibility` は `lossless` です。これは **未チェック** です。送ってよい、ではありません。

## GPT-5.6

Chat Completions と function tools は、実効 reasoning が `none` のときだけ互換です。省略は `medium` になるので、省略しただけで失敗します。Responses なら、reasoning 付きの function tools を受け付けます。

```bash
npx llm-abi request request.json --ci
```

```json
{
  "provider": "openai",
  "model": "gpt-5.6-terra",
  "endpoint": "chat-completions",
  "tools": true
}
```

`provider` は `openai`、`azure-openai`、`azure` を受け付けます。`endpoint` は `chat-completions`、`responses`、短い別名（`chat`、`/v1/chat/completions`）です。

フィールドの全体は [API](./api.md) の `checkRequest()` を見てください。
