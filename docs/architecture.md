# Architecture

llm-abi is a compiler, not a converter.

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

`compile()` does not inspect `model`, `endpoint`, or `reasoning_effort`. Those combinations belong to `checkRequest()`. Runtime, engine, and model-format combinations belong to `checkDeployment()`.

Runtime schema targets use `scope: "runtime"`. Default `check()` and `listTargets()` stay on provider targets so the cloud matrix does not mix in LM Studio or Ollama rows that need format context.

## IR

The IR is a closed set of node kinds: `string`, `number`, `integer`, `boolean`, `null`, `object`, `array`, `tuple`, `enum`, `literal`, `union`, `intersection`, `ref`, `any`, `never`.

JSON Schema is parsed into IR once. Provider code must not pattern-match raw JSON Schema keywords.

## Target profiles

A profile is data:

- capability of each keyword (`supported` | `runtime-only` | `lossy` | `unsupported`)
- object policy (`additionalProperties`, optional-as-nullable)
- limits
- maturity (`supported` | `partial` | `experimental`)
- evidence kind and source (`documented` | `sdk-observed` | `empirical`)
- last verification date and nightly-adapter coverage
- revision string shipped with the package

The lowering pass reads the profile. Adding a vendor should not require a new compiler.

## Request profiles

A request profile is also data: model family matchers, omitted-parameter defaults, and endpoint rules. `checkRequest()` applies those defaults before evaluating rules, so an omitted `reasoningEffort` can still be incompatible when the model default is not `none`.

Adding a request family should not require a new checker. See [Requests](./requests.md). Contributor profile fields live in the repository under `docs/requests/`.

## Safety

Untrusted schemas are bounded by max depth, max nodes, and max `$ref` count. Dictionaries keyed by property names use `Map` or null-prototype objects.

## Playground

`packages/playground` is a static Vite app hosted on Cloudflare Pages. It imports the public `llm-abi` API, compiles in the browser, and never fetches provider profiles or localhost runtimes. Compatibility is shown as discrete levels, never a percentage. The same deploy serves these pages at `/docs/`, generated from `docs/*.md` at build time.
