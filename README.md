# Sabi

**One schema. Every model.**

Compile TypeScript and JSON Schema into provider-safe schemas for OpenAI, Claude, Gemini, and more.

[![CI](https://github.com/jammaru/sabi/actions/workflows/ci.yml/badge.svg)](https://github.com/jammaru/sabi/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/sabijs)](https://www.npmjs.com/package/sabijs)
[![license](https://img.shields.io/npm/l/sabijs)](./LICENSE)

Your JSON Schema works on OpenAI.

It fails on Gemini.

Anthropic silently cannot enforce `minimum`.

Sabi fixes this.

```ts
import { compile } from "sabijs";

const result = compile(UserSchema, {
  target: "anthropic",
});

result.schema;
result.diagnostics;
result.loss;
result.fingerprint;
result.validate;
```

```bash
npx sabijs check schema.json
```

```text
Schema compatibility

Target                                 Result
────────────────────────────────────────────────
openai/responses/structured            PASS*
anthropic/messages/structured          PASS*
google/gemini/structured               PASS

2 constraints require runtime validation.
```

## Why

LLM providers all say they accept JSON Schema. They do not accept the same JSON Schema.

| Provider  | What actually happens                                          |
| --------- | -------------------------------------------------------------- |
| OpenAI    | Strict structured outputs use a JSON Schema subset             |
| Anthropic | Unsupported constraints are stripped and moved to descriptions |
| Gemini    | Officially a subset; large or deep schemas can be rejected     |

Sabi is not another Zod-to-JSON-Schema converter. It is a **schema compatibility compiler**: one input schema, provider-aware lowering, diagnostics, loss reporting, runtime validation, and a CI checker.

## Install

```bash
npm install sabijs
```

The brand is **Sabi**. The npm package is `sabijs` because the unscoped name `sabi` is already taken by an unrelated placeholder.

```ts
import { compile, check, analyze, fingerprint } from "sabijs";
```

Zero runtime dependencies. The compiler library is about 14 KB gzip. Node, Bun, Deno, browsers, and edge runtimes can import it. The CLI requires Node.js 22+.

## Usage

```ts
import { compile } from "sabijs";

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

Zod, Valibot, ArkType, and other Standard Schema libraries work when they expose JSON Schema conversion. Validation-only Standard Schema objects are rejected with a clear error. Sabi does not depend on Zod.

### Targets (v0.1)

| Alias       | Profile                         | Status   |
| ----------- | ------------------------------- | -------- |
| `openai`    | `openai/responses/structured`   | Verified |
| `anthropic` | `anthropic/messages/structured` | Verified |
| `gemini`    | `google/gemini/structured`      | Verified |

DeepSeek, xAI, Qwen, Mistral, Cohere, OpenRouter, Groq, Together, and MCP are planned. New providers are data: add a target profile, fixtures, and expected diagnostics.

## CLI

```bash
npx sabijs check schema.json
npx sabijs compile schema.json --target anthropic
npx sabijs explain schema.json --target gemini
npx sabijs doctor
```

`--ci` exits with status 1 when any target is `unsupported`.

## Guarantees

Sabi **does**:

- Compile one schema into a provider-safe schema
- Tell you exactly what was rewritten, stripped, or moved to runtime validation
- Keep `compile()` pure: no network, no filesystem, no clocks, no hidden config
- Keep provider profiles versioned with the package

Sabi **does not**:

- Guarantee identical validation results across every model
- Claim support for every model hosted on every gateway
- Replace OpenAI, Anthropic, Gemini, or Vercel AI SDK

See [docs/guarantees.md](docs/guarantees.md), [docs/api.md](docs/api.md), and [docs/cli.md](docs/cli.md).

## How it works

```text
JSON Schema / Standard Schema
            ↓
      Normalized IR
            ↓
 Analyze → Lower → Emit
            ↓
 Provider schema + diagnostics + fingerprint + validate()
```

Provider differences live in **profiles**, not scattered `if (provider === "anthropic")` branches.

## Repository

```text
packages/core          compiler + CLI (published as sabijs)
packages/conformance   fixture corpus
examples/              copy-paste recipes
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Adding a provider should be a profile file, fixtures, and tests — not a rewrite of the compiler.

## Documentation

- [API](docs/api.md)
- [CLI](docs/cli.md)
- [Architecture](docs/architecture.md)
- [Target evidence](docs/targets/README.md)

## License

MIT © jammaru
