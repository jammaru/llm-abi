# CLI

The published binary is `llm-abi`. Node.js 22+ is required.

```bash
npx llm-abi check schema.json
npx llm-abi compile schema.json --target anthropic
npx llm-abi explain schema.json --target gemini
npx llm-abi doctor
```

| Command   | Purpose                                        |
| --------- | ---------------------------------------------- |
| `check`   | Compatibility matrix for every built-in target |
| `compile` | Emit the provider schema                       |
| `explain` | Print diagnostics and loss for one target      |
| `doctor`  | Version, runtime, and profile revisions        |

| Flag       | Meaning                                               |
| ---------- | ----------------------------------------------------- |
| `--target` | Profile id or alias (`openai`, `anthropic`, `gemini`) |
| `--strict` | Fail when the schema is unsupported                   |
| `--json`   | Machine-readable output                               |
| `--ci`     | Exit 1 when any target is `unsupported`               |

`llm-abi doctor --json` is intended for bug reports.
