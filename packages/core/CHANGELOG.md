# llm-abi

## 0.5.2

### Patch Changes

- [#44](https://github.com/jammaru/llm-abi/pull/44) [`80577f6`](https://github.com/jammaru/llm-abi/commit/80577f6d3d943345dba043f061d28d6abccd110f) Thanks [@jammaru](https://github.com/jammaru)! - Rewrite the published package intro to a short library README: what it is, what you get back, and one `compile()` example.

## 0.5.1

### Patch Changes

- [#42](https://github.com/jammaru/llm-abi/pull/42) [`44a4e88`](https://github.com/jammaru/llm-abi/commit/44a4e883b32331ea89be2e2114ef6a96ba514fa2) Thanks [@jammaru](https://github.com/jammaru)! - Rewrite the published package README so npm shows the four compatibility labels, the docs site, and that the GPT-5.6 Chat Completions tools example is unsupported. Pin the GitHub Action example to `@v0.5.0` instead of `@v0.2.0` or `@latest`.

## 0.5.0

### Minor Changes

- [#39](https://github.com/jammaru/llm-abi/pull/39) [`8341e88`](https://github.com/jammaru/llm-abi/commit/8341e88ac2db457d2fae9d7c17bb2af711271ac2) Thanks [@jammaru](https://github.com/jammaru)! - Add experimental vLLM and SGLang runtime schema targets from documented OpenAI-compatible structured outputs. Keyword tables stay example-proven. Default check() and the qwen alias do not change.

## 0.4.0

### Minor Changes

- [#36](https://github.com/jammaru/llm-abi/pull/36) [`51206c2`](https://github.com/jammaru/llm-abi/commit/51206c2a962de81d4689d295f953115bb88ffa5f) Thanks [@jammaru](https://github.com/jammaru)! - Add local matrix, lock/diff, check, and a keyword probe suite so loaded runtimes can be compared and snapshotted without secrets, paths, or routing.

## 0.3.0

### Minor Changes

- [`153a635`](https://github.com/jammaru/llm-abi/commit/153a635d3acbb890b826a632c3ee68c38ff1c0ca) Thanks [@jammaru](https://github.com/jammaru)! - Expose target maturity, evidence source, last-verification date, and nightly-adapter coverage on resolved targets, including `resolveTarget()`. Deduplicate repeated diagnostics and loss items produced by shared IR nodes. Expand npm keywords for additional providers and schema compatibility.

- [`2177b44`](https://github.com/jammaru/llm-abi/commit/2177b44fe4933e1a310ab1ea366e25773dccfe59) Thanks [@jammaru](https://github.com/jammaru)! - Add `checkRequest()` so GPT-5.6 Chat Completions function-tool calls can be rejected before omitted `reasoning_effort` defaults to `medium` and the API returns 400.

- [#31](https://github.com/jammaru/llm-abi/pull/31) [`5f7ce66`](https://github.com/jammaru/llm-abi/commit/5f7ce66ccb95479fe92d47d18b01bc3caed00014) Thanks [@jammaru](https://github.com/jammaru)! - Add a Runtime ABI next to compile() and checkRequest(): checkDeployment(), runtime-scoped schema targets for llama.cpp / LM Studio / Ollama, and a Node-only llm-abi/local doctor and smoke probe. Default check() stays provider-only. The qwen alias remains Alibaba Model Studio.

## 0.2.0

### Minor Changes

- [#30](https://github.com/jammaru/llm-abi/pull/30) [`e3ab4f5`](https://github.com/jammaru/llm-abi/commit/e3ab4f574d5fe193a047983ab151cfe80a341d82) Thanks [@jammaru](https://github.com/jammaru)! - Add a documented DeepSeek strict-tools target, including `$def` emit and required-all objects.

- [#35](https://github.com/jammaru/llm-abi/pull/35) [`78aa4c8`](https://github.com/jammaru/llm-abi/commit/78aa4c8c01926861105bc1be10f9871a1f6ee5f6) Thanks [@jammaru](https://github.com/jammaru)! - Add an MCP tools host-subset target that inlines `$ref`, requires an object root, and keeps stripped constraints in `validate`.

- [#33](https://github.com/jammaru/llm-abi/pull/33) [`3a66dcb`](https://github.com/jammaru/llm-abi/commit/3a66dcb30ecad9f9059aae3b4010203db2d36f69) Thanks [@jammaru](https://github.com/jammaru)! - Add an sdk-observed Mistral structured target that closes objects without forcing optional fields required.

- [#34](https://github.com/jammaru/llm-abi/pull/34) [`5ec0581`](https://github.com/jammaru/llm-abi/commit/5ec058197ecb95342c170557e617fdb642b8a873) Thanks [@jammaru](https://github.com/jammaru)! - Add an OpenRouter gateway target that never claims lossless enforcement for every routed model.

- [#32](https://github.com/jammaru/llm-abi/pull/32) [`bf13078`](https://github.com/jammaru/llm-abi/commit/bf130786796fc30696181b6bba7d500c5ab1a839) Thanks [@jammaru](https://github.com/jammaru)! - Add a documented Qwen tools target that preserves optional fields and additionalProperties instead of copying OpenAI strict mode.

- [#22](https://github.com/jammaru/llm-abi/pull/22) [`9552e9a`](https://github.com/jammaru/llm-abi/commit/9552e9aba0dde7568052d7c67216f035c2654dd6) Thanks [@jammaru](https://github.com/jammaru)! - Report emitted schema size and a conservative token hint from analyze, compile, and check. Unused root `$defs` now emit a diagnostic instead of disappearing silently.

- [#23](https://github.com/jammaru/llm-abi/pull/23) [`aa9c0f0`](https://github.com/jammaru/llm-abi/commit/aa9c0f0665a4b6a73adba23d18dc7acce447e387) Thanks [@jammaru](https://github.com/jammaru)! - Accept a closed TypeScript type subset as `compile` / `check` / `analyze` input so the schema ABI is TypeScript-to-provider, not JSON-Schema-only.

- [#31](https://github.com/jammaru/llm-abi/pull/31) [`effa6cb`](https://github.com/jammaru/llm-abi/commit/effa6cbb72ef15c829299ffae749fd5aa0aacbc0) Thanks [@jammaru](https://github.com/jammaru)! - Add a documented xAI Grok structured target that omits `additionalProperties: false` and rejects recursive `$ref`.

### Patch Changes

- [#36](https://github.com/jammaru/llm-abi/pull/36) [`a9e6429`](https://github.com/jammaru/llm-abi/commit/a9e64290e53b221086beb59abf61eb9f1165c44c) Thanks [@jammaru](https://github.com/jammaru)! - Emit `enum` for TypeScript string, number, and boolean literal unions so MCP and other combinator-hostile hosts receive the object subset.

## 0.1.0

### Minor Changes

- [#17](https://github.com/jammaru/llm-abi/pull/17) [`366b8db`](https://github.com/jammaru/llm-abi/commit/366b8db917f7731a1473bef54bec6161e867cdea) Thanks [@jammaru](https://github.com/jammaru)! - Add a reusable GitHub Action for checking schema compatibility in pull requests.

- [`10ff3f8`](https://github.com/jammaru/llm-abi/commit/10ff3f8571636d36c2aa00d2eb025d6a18cf23ec) Thanks [@jammaru](https://github.com/jammaru)! - Initial public compiler for OpenAI, Anthropic, and Gemini structured outputs.
