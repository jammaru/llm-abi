# CLI

公開バイナリは `llm-abi` です。Node.js 22+ が必要です。

```bash
npx llm-abi check schema.json
npx llm-abi check user.ts --type User
npx llm-abi compile schema.json --target anthropic
npx llm-abi explain schema.json --target gemini
npx llm-abi analyze schema.json
npx llm-abi request request.json
npx llm-abi doctor
npx llm-abi local doctor
npx llm-abi local check user.ts --type User
npx llm-abi local probe --suite smoke
npx llm-abi local matrix schema.json
npx llm-abi local lock schema.json
npx llm-abi local diff llm-abi.local.lock.json
npx llm-abi local diff llm-abi.local.lock.json schema.json
```

| コマンド       | 用途                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| `check`        | 組み込みターゲットすべての互換性マトリクス                                   |
| `compile`      | プロバイダスキーマを出す                                                     |
| `explain`      | 1ターゲットの診断と loss を出す                                              |
| `analyze`      | ノード数と、余裕を見たサイズ／トークン目安                                   |
| `request`      | 1件のプロバイダ向けペイロードのリクエスト互換性                              |
| `doctor`       | バージョン、ランタイム、プロファイル revision                                |
| `local doctor` | ループバックへ GET。ロード済みモデルのメタデータ。生成はしない               |
| `local probe`  | 明示的な smoke、または `--suite full` のキーワード推定。合成フィクスチャだけ |
| `local check`  | ロード済みモデル1件の静的 `checkDeployment()`。生成はしない                  |
| `local matrix` | ロード済みモデルすべての静的互換性。`--probe` は任意                         |
| `local lock`   | 秘密情報や絶対パスなしのフィンガープリントスナップショット                   |
| `local diff`   | lock 同士、または lock と今ロードされているデプロイの比較                    |

| フラグ      | 意味                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--target`  | プロファイル id またはエイリアス（`openai`、`anthropic`、`gemini`、`deepseek`、`xai`、`qwen` = Model Studio、`mistral`、`openrouter`、`mcp`、`llamacpp`、`ollama`、`vllm`、`sglang`） |
| `--strict`  | スキーマが unsupported なら失敗                                                                                                                                                       |
| `--type`    | TypeScript 入力の型／インタフェース名。`local check`、`probe`、`matrix`、`lock`、`diff` でも使う                                                                                      |
| `--json`    | 機械可読な出力                                                                                                                                                                        |
| `--ci`      | どれかが `unsupported` なら終了コード 1                                                                                                                                               |
| `--url`     | `local doctor` / `local probe` の明示 URL。ループバック以外は `remote` とラベル                                                                                                       |
| `--runtime` | 探索のヒント: `lmstudio`、`ollama`、`llamacpp`、`vllm`、`sglang`                                                                                                                      |
| `--model`   | `local probe` のモデル id。ランタイムがそのモデルをロードすることがある                                                                                                               |
| `--suite`   | `local probe` のスイート。`smoke`（デフォルト）または `full`                                                                                                                          |

`llm-abi request` は次の JSON を読みます。

```json
{
  "provider": "openai",
  "model": "gpt-5.6-terra",
  "endpoint": "chat-completions",
  "tools": true
}
```

`--ci` は、そのリクエストが `unsupported` なら終了コード 1 です。

`llm-abi doctor --json` はバグレポート向けです。リクエスト／ランタイム／モデルのプロファイルも出します。localhost には話しません。

`llm-abi local doctor --json` は `schemaVersion: 1` から始まります。ループバック以外の `--url` は `remote` です。デフォルト探索は `127.0.0.1` から出ません。`local probe` に `--url` が無いときは、`local doctor` と同じループバック一覧です。`--model` はランタイムにそのモデルをロードさせることがあります。省略すると、すでに載っているものだけを probe します。`local matrix` と `local lock` も、`--model` を付けない限りロード済みだけです。probe 成功で静的互換性は上がりません。lock に URL、秘密情報、絶対パスは入りません。vLLM と SGLang は `--url` と、だいたい `--runtime vllm` または `--runtime sglang` が必要です。デフォルトのループバックポートは見ません。

## GitHub Action

リポジトリルートに、再利用できる JavaScript Action があります。選んだスキーマごとに `llm-abi check --ci --json` を走らせます。デフォルトでは、`**/*.schema.json` または `**/schema.json` に当たるプルリクエストの変更を見ます。

```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0
    persist-credentials: false
- uses: jammaru/llm-abi@v0.5.0
  with:
    schema-files: "schemas/**/*.json"
    comment: "true"
```

Action はリリースタグにピンしてください（いまは `@v0.5.0`）。`@latest` は使わないでください。`comment` を使うジョブ／ワークフローには `pull-requests: write` を付けます。コメントは任意です。Action はいつも互換性テーブルをジョブサマリに書きます。再実行すると、同じボットコメントを更新します。

出力は `conclusion`、`checked-files`、`unsupported-count`、`results-json`、`comment-url` です。conclusion は `passed`、`unsupported`、`skipped`、`error` です。
