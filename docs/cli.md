# CLI

The published binary is `llm-abi`. Node.js 22+ is required.

```bash
npx llm-abi check schema.json
npx llm-abi check user.ts --type User
npx llm-abi compile schema.json --target anthropic
npx llm-abi explain schema.json --target gemini
npx llm-abi analyze schema.json
npx llm-abi request request.json
npx llm-abi doctor
npx llm-abi local doctor
npx llm-abi local check schema.json
npx llm-abi local probe --suite smoke
npx llm-abi local matrix schema.json
npx llm-abi local lock schema.json
npx llm-abi local diff llm-abi.local.lock.json
npx llm-abi local diff llm-abi.local.lock.json schema.json
```

| Command        | Purpose                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| `check`        | Compatibility matrix for every built-in target                              |
| `compile`      | Emit the provider schema                                                    |
| `explain`      | Print diagnostics and loss for one target                                   |
| `analyze`      | Node counts plus conservative size/token hint                               |
| `request`      | Request compatibility for one provider payload                              |
| `doctor`       | Version, runtime, and profile revisions                                     |
| `local doctor` | Loopback GET metadata for loaded models. Never generates                    |
| `local probe`  | Explicit smoke or `--suite full` keyword inference. Synthetic fixtures only |
| `local check`  | Static `checkDeployment()` for one loaded model. No generation              |
| `local matrix` | Static compatibility for every loaded model. `--probe` is optional          |
| `local lock`   | Snapshot fingerprints without secrets or absolute paths                     |
| `local diff`   | Compare two locks, or a lock against the current loaded deployment          |

| Flag        | Meaning                                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--target`  | Profile id or alias (`openai`, `anthropic`, `gemini`, `deepseek`, `xai`, `qwen` = Model Studio, `mistral`, `openrouter`, `mcp`, `llamacpp`, `ollama`) |
| `--strict`  | Fail when the schema is unsupported                                                                                                                   |
| `--type`    | Type or interface name when the input is TypeScript                                                                                                   |
| `--json`    | Machine-readable output                                                                                                                               |
| `--ci`      | Exit 1 when any target is `unsupported`                                                                                                               |
| `--url`     | Explicit runtime base URL for `local doctor` / `local probe`. Non-loopback is labeled `remote`                                                        |
| `--runtime` | Hint for local discovery: `lmstudio`, `ollama`, `llamacpp`                                                                                            |
| `--model`   | Model id for `local probe`. May cause the runtime to load that model                                                                                  |
| `--suite`   | `local probe` suite: `smoke` (default) or `full`                                                                                                      |

`llm-abi request` reads a JSON object:

```json
{
  "provider": "openai",
  "model": "gpt-5.6-terra",
  "endpoint": "chat-completions",
  "tools": true
}
```

`--ci` exits 1 when that request is `unsupported`.

`llm-abi doctor --json` is intended for bug reports. Doctor also lists request, runtime, and model profiles. It does not talk to localhost.

`llm-abi local doctor --json` starts with `schemaVersion: 1`. Non-loopback `--url` is labeled `remote`. Default discovery does not leave `127.0.0.1`. `local probe` without `--url` uses the same loopback list as `local doctor`. `--model` may cause the runtime to load that model; omit it to probe only what is already loaded. `local matrix` and `local lock` are loaded-models-only unless `--model` is set. Probe success does not upgrade static compatibility. Locks omit URLs, secrets, and absolute paths.

## GitHub Action

The repository root contains a reusable JavaScript Action that runs `llm-abi check --ci --json` for
each selected schema. By default it checks pull request changes matching `**/*.schema.json` or
`**/schema.json`.

```yaml
- uses: actions/checkout@v7
  with:
    fetch-depth: 0
    persist-credentials: false
- uses: jammaru/llm-abi@v0.2.0
  with:
    schema-files: "schemas/**/*.json"
    comment: "true"
```

Pin the Action to `@v0.2.0` or a later release tag. Set `pull-requests: write` on the job
or workflow when `comment` is enabled. The comment is optional; the Action always writes the
compatibility table to the job summary. Repeated runs update the same bot-authored comment.

Action outputs are `conclusion`, `checked-files`, `unsupported-count`, `results-json`, and
`comment-url`. Conclusions are `passed`, `unsupported`, `skipped`, or `error`.
