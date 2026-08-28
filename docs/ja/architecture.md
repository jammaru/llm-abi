# アーキテクチャ

llm-abi はコンパイラです。変換器ではありません。

```text
Schema ABI
JSON Schema / Standard JSON Schema / TypeScript type subset
              ↓
        Normalized IR
              ↓
   analyze  →  lower(profile)  →  emit
              ↓
 provider JSON Schema + diagnostics + fingerprint + size

Request ABI
provider + model + endpoint + tools + reasoning
              ↓
     resolve request profile
              ↓
     apply model defaults
              ↓
     evaluate rules
              ↓
 compatibility + diagnostics + fixes

Runtime ABI
runtime + model + request (+ optional schema)
              ↓
     resolve runtime / model profiles
              ↓
     compile() when a schema engine is known
              ↓
 compatibility + coverage + diagnostics + fixes
```

`compile()` は `model`、`endpoint`、`reasoning_effort` を見ません。その組み合わせは `checkRequest()` です。ランタイム、エンジン、モデル形式の組み合わせは `checkDeployment()` です。

ランタイム向けスキーマは `scope: "runtime"` です。デフォルトの `check()` と `listTargets()` はプロバイダのままです。クラウドのマトリクスに、format が要る LM Studio や Ollama の行を混ぜないためです。

## IR

IR のノード種類は閉じています。`string`、`number`、`integer`、`boolean`、`null`、`object`、`array`、`tuple`、`enum`、`literal`、`union`、`intersection`、`ref`、`any`、`never`。

JSON Schema は一度だけ IR になります。プロバイダコードが生の JSON Schema キーワードをパターンマッチしてはいけません。

## ターゲットプロファイル

プロファイルはデータです。

- 各キーワードの能力（`supported` | `runtime-only` | `lossy` | `unsupported`）
- オブジェクト方針（`additionalProperties`、optional-as-nullable）
- 上限
- maturity（`supported` | `partial` | `experimental`）
- 証拠の種類と出典（`documented` | `sdk-observed` | `empirical`）
- 最終確認日と nightly アダプタの有無
- パッケージに同梱される revision 文字列

lowering はこのプロファイルを読みます。ベンダを足すときに、新しいコンパイラは要りません。

## リクエストプロファイル

こちらもデータです。モデルファミリーのマッチ、省略時のデフォルト、エンドポイントルール。`checkRequest()` はルールの前にデフォルトを入れるので、省略した `reasoningEffort` でも、モデルデフォルトが `none` でなければ非互換になります。

リクエストファミリーを足すときに、新しいチェッカーは要りません。[リクエスト](./requests.md) を見てください。コントリビュータ向けのフィールド一覧はリポジトリの `docs/requests/` にあります。

## 安全

信頼できないスキーマには、深さ、ノード数、`$ref` 数の上限があります。プロパティ名をキーにする辞書は `Map` か、null プロトタイプのオブジェクトです。

## Playground

`packages/playground` は Cloudflare Pages 上の静的 Vite アプリです。公開 `llm-abi` API を import し、ブラウザ内でコンパイルします。プロバイダプロファイルも localhost も取りに行きません。互換性は離散的な段階だけで、パーセントはありません。同じデプロイが `/docs/`（英語）と `/docs/ja/`（日本語）を配信します。ビルド時に `docs/*.md` と `docs/ja/*.md` から生成します。
