# 保証

llm-abi は、ひとつのスキーマをプロバイダが受け取れる形に直し、表現できなかったものを報告します。

## このパッケージが保証すること

次が同じなら:

- 入力スキーマ
- ターゲット id
- パッケージバージョン（プロファイル revision を固定する）

`compile()` は同じ `schema`、`diagnostics`、`loss`、`fingerprint`、`size` を返します。

リクエスト入力とパッケージバージョンが同じなら、`checkRequest()` は同じ `compatibility`、`diagnostics`、`effective`、`fixes` を返します。省略フィールドは、ルールの前に出荷済みデフォルトで埋まります。

デプロイ記述、リクエスト、任意のスキーマ、パッケージバージョンが同じなら、`checkDeployment()` は同じ `compatibility`、`coverage`、診断、解決済みデプロイを返します。ネットワーク、ファイル、時計、環境変数は読みません。

`result.validate(value)` は **元のスキーマ**（または元の Standard Schema バリデータ）を見ます。下げたプロバイダスキーマではありません。

## このパッケージが保証しないこと

- プロバイダプロファイルを直したあと、将来の minor でも JSON がビット一致すること
- ライブ API が、出したスキーマをすべて受け取ること（API は変わる。nightly は accepted / rejected / skipped を記録する）
- OpenRouter / Groq / Together の向こうにあるすべてのモデルが、名前のベンダと同じ挙動をすること
- `coverage: "unknown"` のリクエストがライブ API に通ること（ルールが無い、という報告であり、保証ではない）
- ローカル probe が通ったら、静的互換性が上がること。probe は観測です。失敗は診断を足すことがあります。成功で `lossless` にはしません
- すべての MCP ホストが SEP-2106 の JSON Schema 2020-12 全体を載せていること
- プロバイダ間で検証結果がすべて同じであること

ターゲットの maturity、証拠の種類、ライブ検証は独立です。`lastVerified` は、メンテナがリンク先を見た日です。そのターゲットにライブアダプタがある、という意味になるのは `evidence.live === "nightly"` のときだけです。

## 互換性の段階

| 段階         | プロバイダスキーマ     | 元スキーマの `validate()`              |
| ------------ | ---------------------- | -------------------------------------- |
| lossless     | 意味を保つ             | プロバイダ出力が妥当なら通る           |
| runtime-safe | 強制できない制約を外す | その制約はこちらでまだ見る             |
| lossy        | 意味が変わった         | プロバイダと食い違うことがある         |
| unsupported  | 構文を表現できない     | 関数自体は定義される。そのまま送らない |

`strict: true` は、互換性が `unsupported` のとき throw します。

`size.tokens` は余裕を見た目安です（`ceil(UTF-8 バイト数 / 3)`）。プロバイダの請求 API でも、互換性のパーセントでもありません。プロファイルの `maxStringBudget` を超えると `string-budget-exceeded` が付きます。互換性の段階は変わりません。
