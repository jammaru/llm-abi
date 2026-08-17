# CLI

The published binary is `llm-abi`. Node.js 22+ is required.

```bash
npx llm-abi check schema.json
npx llm-abi check user.ts --type User
npx llm-abi compile schema.json --target anthropic
npx llm-abi explain schema.json --target gemini
npx llm-abi analyze schema.json
npx llm-abi doctor
```

| Command   | Purpose                                        |
| --------- | ---------------------------------------------- |
| `check`   | Compatibility matrix for every built-in target |
| `compile` | Emit the provider schema                       |
| `explain` | Print diagnostics and loss for one target      |
| `analyze` | Node counts plus conservative size/token hint  |
| `doctor`  | Version, runtime, and profile revisions        |

| Flag       | Meaning                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| `--target` | Profile id or alias (`openai`, `anthropic`, `gemini`, `deepseek`, `xai`) |
| `--strict` | Fail when the schema is unsupported                                      |
| `--type`   | Type or interface name when the input is TypeScript                      |
| `--json`   | Machine-readable output                                                  |
| `--ci`     | Exit 1 when any target is `unsupported`                                  |

`llm-abi doctor --json` is intended for bug reports.

## GitHub Action

The repository root contains a reusable JavaScript Action that runs `llm-abi check --ci --json` for
each selected schema. By default it checks pull request changes matching `**/*.schema.json` or
`**/schema.json`.

```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0
    persist-credentials: false
- uses: jammaru/llm-abi@v0.1.0
  with:
    schema-files: "schemas/**/*.json"
    comment: "true"
```

Pin the Action to `@v0.1.0` or a later release tag. Set `pull-requests: write` on the job
or workflow when `comment` is enabled. The comment is optional; the Action always writes the
compatibility table to the job summary. Repeated runs update the same bot-authored comment.

Action outputs are `conclusion`, `checked-files`, `unsupported-count`, `results-json`, and
`comment-url`. Conclusions are `passed`, `unsupported`, `skipped`, or `error`.
