# llm-abi

**One schema. Every model.**

![Same oneOf schema: lossy on OpenAI, unsupported on Gemini](docs/assets/playground-demo.gif)

```bash
npm i llm-abi
```

Paste a JSON Schema (or a TypeScript type) in the [playground](https://llm-abi.pages.dev/). Each provider comes back `lossless`, `runtime-safe`, `lossy`, or `unsupported`, with diagnostics for every rewrite.

The schema compatibility compiler between TypeScript and LLM providers.

Compile TypeScript and JSON Schema into provider-safe schemas for OpenAI, Claude, Gemini, and more.

[![CI](https://github.com/jammaru/llm-abi/actions/workflows/ci.yml/badge.svg)](https://github.com/jammaru/llm-abi/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/llm-abi)](https://www.npmjs.com/package/llm-abi)
[![license](https://img.shields.io/npm/l/llm-abi)](./LICENSE)

[Playground](https://llm-abi.pages.dev/) — paste a TypeScript type or JSON Schema, then compare every built-in target, diagnostics, loss, and emitted JSON.

Your JSON Schema works on OpenAI.

It fails on Gemini.

Anthropic silently cannot enforce `minimum`.

llm-abi fixes this.

```ts
import { compile } from "llm-abi";

const result = compile(UserSchema, {
  target: "anthropic",
});

result.schema;
result.diagnostics;
result.loss;
result.fingerprint;
result.size;
result.validate;
```

```bash
npx llm-abi check schema.json
```

```text
Schema compatibility

Target                                 Result   Tokens
────────────────────────────────────────────────────────
openai/responses/structured            PASS*    142
anthropic/messages/structured          PASS*    168
google/gemini/structured               PASS     155

2 constraints require runtime validation.
```

## Use llm-abi when

- One generated or hand-written schema must work across multiple LLM providers.
- You need to catch provider rejection and silent constraint loss before an API call.
- You want a build/CI gate without adopting another agent framework or provider SDK.
- You need the emitted provider schema and a runtime validator for constraints the provider cannot enforce.

Use a provider SDK, AI SDK, Instructor, or BAML for making model calls, retries, and application orchestration. llm-abi sits underneath those tools: compile the schema, then pass `result.schema` to the SDK you already use.

## Why

LLM providers all say they accept JSON Schema. They do not accept the same JSON Schema.

| Provider  | What actually happens                                                       |
| --------- | --------------------------------------------------------------------------- |
| OpenAI    | Strict structured outputs use a JSON Schema subset                          |
| Anthropic | Unsupported constraints are stripped and moved to descriptions              |
| Gemini    | Officially a subset; large or deep schemas can be rejected                  |
| MCP hosts | The protocol accepts JSON Schema, but deployed host support can be narrower |

llm-abi is not another Zod-to-JSON-Schema converter. It is a **schema compatibility compiler**: one input schema, provider-aware lowering, diagnostics, loss reporting, conservative size/token hints, runtime validation, and a CI checker.

Try that loop in the [compatibility playground](https://llm-abi.pages.dev/). Compilation runs in the browser. Profiles ship with the package. Each target exposes its evidence source and verification date. There is no compatibility percentage.

### Where it fits

| Tool category                       | Primary job                                      | llm-abi relationship                                      |
| ----------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| Zod / Valibot / ArkType             | Define and validate application data             | Accept their Standard JSON Schema output                  |
| OpenAI / Anthropic / Gemini SDKs    | Call one provider                                | Compile before assigning the SDK schema field             |
| Vercel AI SDK / Instructor / BAML   | Generation, parsing, retries, orchestration      | Complementary; llm-abi is the provider-compatibility gate |
| Provider-specific schema converters | Make a schema fit one provider or client surface | Use llm-abi when one source must target several providers |

## Install

```bash
npm install llm-abi
```

```ts
import { compile, check, checkRequest, analyze, fingerprint } from "llm-abi";
```

Zero runtime dependencies. The compiler library is about 14 KB gzip. Node, Bun, Deno, browsers, and edge runtimes can import it. The CLI requires Node.js 22+.

## Usage

```ts
import { compile } from "llm-abi";

const UserSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", minimum: 0, maximum: 150 },
    nickname: { type: "string" },
  },
  required: ["name", "age"],
};

const result = compile(UserSchema, "anthropic");
```

`compile(schema, "openai")` is enough. Options exist for people who need them:

```ts
compile(UserSchema, {
  target: "anthropic/messages/structured",
  strict: true,
  constraintFallback: "description",
});
```

Copy-paste recipes under [`examples/`](examples/README.md) place `result.schema` in the OpenAI, Anthropic, Gemini, Vercel AI SDK, and MCP fields those SDKs already document. They do not call those APIs, and they do not add those SDKs to `packages/core`.

### Compatibility

Every compile result has a discrete compatibility level. There is no invented percentage score.

| Level          | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| `lossless`     | Provider schema preserves the input semantics                         |
| `runtime-safe` | Provider cannot enforce some constraints; `result.validate` still can |
| `lossy`        | Semantics changed (for example `oneOf` → `anyOf`)                     |
| `unsupported`  | The construct cannot be represented; diagnostics explain why          |

```ts
result.loss;
// {
//   level: "runtime-safe",
//   removed: [{ path: ["age"], keyword: "minimum", fallback: "runtime-validation" }]
// }
```

### Input

- JSON Schema objects (draft-07 / 2020-12)
- [Standard JSON Schema](https://standardschema.dev/json-schema) (`~standard.jsonSchema`)
- A closed TypeScript type subset (`type` / `interface` syntax). No `tsc`, no imports.

```ts
compile(
  `
    type User = {
      name: string;
      age: number;
      nickname?: string;
    }
  `,
  "openai",
);
```

Zod, Valibot, ArkType, and other Standard Schema libraries work when they expose JSON Schema conversion. Validation-only Standard Schema objects are rejected with a clear error. llm-abi does not depend on Zod.

### Targets

Maturity and evidence are separate. `Supported` means the profile is maintained with fixtures; it does not claim a live API check. “Last verified” is the date the profile was checked against the linked evidence source.

| Alias        | Profile                         | Maturity     | Evidence                                                                                         | Last verified | Live adapter |
| ------------ | ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ | ------------- | ------------ |
| `openai`     | `openai/responses/structured`   | Supported    | [documented](https://developers.openai.com/api/docs/guides/structured-outputs)                   | 2026-08-18    | Nightly      |
| `anthropic`  | `anthropic/messages/structured` | Supported    | [documented](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)           | 2026-08-18    | Nightly      |
| `gemini`     | `google/gemini/structured`      | Supported    | [documented](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)           | 2026-08-18    | Nightly      |
| `deepseek`   | `deepseek/chat/strict-tools`    | Supported    | [documented](https://api-docs.deepseek.com/guides/tool_calls)                                    | 2026-08-18    | —            |
| `xai`        | `xai/grok/structured`           | Supported    | [documented](https://docs.x.ai/developers/model-capabilities/text/structured-outputs)            | 2026-08-18    | —            |
| `qwen`       | `alibaba/qwen/tools`            | Supported    | [documented](https://help.aliyun.com/en/model-studio/qwen-function-calling)                      | 2026-08-18    | —            |
| `mistral`    | `mistral/chat/structured`       | Experimental | [sdk-observed](https://docs.mistral.ai/capabilities/structured-output/custom_structured_output/) | 2026-08-18    | —            |
| `openrouter` | `openrouter/structured`         | Partial      | [documented](https://openrouter.ai/docs/guides/features/structured-outputs)                      | 2026-08-18    | —            |
| `mcp`        | `mcp/2026-06/tools`             | Partial      | [documented](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)              | 2026-08-18    | —            |

The MCP target is deliberately conservative for deployed hosts. The current protocol specification allows a full JSON Schema object; a future protocol target and host-specific compatibility profiles are tracked separately.

Cohere, Groq, and Together are planned. New providers are data: add a target profile, fixtures, and expected diagnostics.

### Request compatibility

`compile()` makes a schema provider-safe. It does not inspect `model`, `endpoint`, or `reasoning_effort`. Use `checkRequest()` for those combinations.

GPT-5.6 on Chat Completions rejects function tools unless effective reasoning is `none`. Omitting `reasoning_effort` still fails because the model default is `medium`. Responses accepts tools with reasoning.

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
// "medium"  (model default)
result.fixes;
// [{ preferred: true, endpoint: "responses", ... }, { reasoningEffort: "none", ... }]
```

`checkRequest()` does not send the request or rewrite it. If no request profile matches, `coverage` is `unknown`. That is unchecked, not safe to send.

## CLI

```bash
npx llm-abi check schema.json
npx llm-abi compile schema.json --target anthropic
npx llm-abi explain schema.json --target gemini
npx llm-abi analyze schema.json
npx llm-abi request request.json
npx llm-abi doctor
```

`--ci` exits with status 1 when any target is `unsupported`.

### GitHub Action

The reusable Action checks schema files changed by a pull request. It writes a job summary and can
update one pull request comment with fingerprint and compatibility changes against the base branch.

```yaml
name: Schema compatibility

on:
  pull_request:
    paths:
      - "schemas/**/*.json"

permissions:
  contents: read
  pull-requests: write

jobs:
  llm-abi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: jammaru/llm-abi@v0.2.0
        with:
          schema-files: "schemas/**/*.json"
          comment: "true"
```

Pin the Action to this tag (`@v0.2.0`) or a later release. The compatibility check fails only
when a current target is `unsupported`. Invalid input or an Action runtime failure uses exit
status 2. Pull requests from forks still run the check, but GitHub may restrict their token to
read-only; in that case the Action leaves the job summary and skips the comment without changing
the compatibility result.

### Nightly live checks

A scheduled workflow sends **compiled** schemas to OpenAI, Anthropic, and Gemini when repository secrets exist. It never runs on pull requests. Missing secrets skip that vendor. Outcomes are `accepted`, `rejected`, or `skipped` — never a percentage. Every run uploads a timestamped `live-conformance.json` artifact with fixture × target outcomes. A rejection means the live API disagreed with the profile; mark evidence `empirical` and add a fixture.

## Guarantees

llm-abi **does**:

- Compile one schema into a provider-safe schema
- Tell you exactly what was rewritten, stripped, or moved to runtime validation
- Check request combinations (model, endpoint, tools, reasoning) before a provider 400
- Keep `compile()` and `checkRequest()` pure: no network, no filesystem, no clocks, no hidden config
- Keep provider and request profiles versioned with the package

llm-abi **does not**:

- Guarantee identical validation results across every model
- Claim support for every model hosted on every gateway
- Replace OpenAI, Anthropic, Gemini, or Vercel AI SDK

See [docs/guarantees.md](docs/guarantees.md), [docs/api.md](docs/api.md), and [docs/cli.md](docs/cli.md).

## How it works

```text
JSON Schema / Standard Schema / TypeScript type subset
            ↓
      Normalized IR
            ↓
 Analyze → Lower → Emit
            ↓
 Provider schema + diagnostics + fingerprint + size + validate()

Request → profile defaults → rules → compatibility + fixes
```

Provider differences live in **profiles**, not scattered `if (provider === "anthropic")` branches.

## Repository

```text
packages/core          compiler + CLI (published as llm-abi)
packages/conformance   fixture corpus and secret-gated live runner
packages/playground    browser compatibility playground
examples/              copy-paste SDK recipes (no network, no core SDK deps)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Adding a provider should be a profile file, fixtures, and tests — not a rewrite of the compiler.

## Documentation

- [API](docs/api.md)
- [CLI](docs/cli.md)
- [Architecture](docs/architecture.md)
- [Target profiles](docs/targets/README.md)
- [Request profiles](docs/requests/README.md)
- [Examples](examples/README.md)
- [Playground](https://llm-abi.pages.dev/)

## License

MIT © jammaru
