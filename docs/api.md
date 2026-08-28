# Public API

Named exports only. There is no default export.

You will usually call four functions: `compile` (schema), `check` (every cloud provider), `checkRequest` (model + endpoint + tools + reasoning), and `checkDeployment` (local or self-hosted runtime).

```ts
import {
  compile,
  check,
  checkRequest,
  checkDeployment,
  analyze,
  fingerprint,
  listTargets,
  resolveTarget,
  listRequestProfiles,
  resolveRequestProfile,
  listRuntimeProfiles,
  resolveRuntimeProfile,
  listModelProfiles,
  resolveModelProfile,
} from "llm-abi";
```

## `compile(schema, target | options)`

Compiles a JSON Schema, Standard JSON Schema object, or a closed TypeScript type subset into a provider-safe schema.

```ts
const result = compile(schema, "anthropic");
const same = compile(schema, { target: "anthropic/messages/structured" });
```

| Field           | Meaning                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| `schema`        | Provider JSON Schema                                                                |
| `diagnostics`   | Stable `code` values, paths, and suggested actions                                  |
| `loss`          | Discrete compatibility plus removed constraints                                     |
| `fingerprint`   | Canonical SHA-256 of the emitted schema                                             |
| `target`        | Resolved profile id, vendor, mode, revision, maturity, and evidence                 |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported`                            |
| `size`          | UTF-8 bytes of the emitted schema and a conservative token hint (`ceil(bytes / 3)`) |
| `validate`      | Validates against the **original** schema                                           |

`compile()` is pure: no network, filesystem, clocks, or randomness.

`strict: true` throws `SchemaCompatibilityError` when compatibility is `unsupported`.

`constraintFallback: "description" | "strip"` controls whether runtime-only constraints are appended to `description`.

`optimize: true` drops titles that duplicate the property name and descriptions that duplicate the title. Each omission emits `redundant-annotation-removed`. Default is `false`, so previously emitted JSON stays the same when you leave it off.

`typeName` selects which `type` or `interface` to compile from TypeScript source. Default: the last exported declaration, otherwise the last declaration.

TypeScript input is a closed subset: `type` / `interface`, primitives, literals, arrays, tuples, unions, intersections, optional properties, nested objects, `Array<T>`, `ReadonlyArray<T>`, and `Record<string, T>`. String, number, and boolean literal unions emit `enum`. There is no `typescript` compiler dependency, no import resolution, and no generic type declarations. Unsupported syntax throws instead of being dropped silently.

## `check(schema, options?)`

Runs `compile` for every built-in **provider** target (or `options.targets`). Runtime schema targets are omitted unless listed explicitly. Each row includes that target's emitted `size`. `options.optimize` is forwarded to each compile.

## `analyze(schema)`

Returns fingerprint, node/depth/property stats, unused root `$defs` count, input schema byte/token size, and parse notes. Does not lower to a provider.

## `fingerprint(schema)`

Canonical SHA-256 of the input schema. Property order does not matter.

## `checkRequest(request)`

Checks whether a provider request combination is representable. This is not `compile()`. It does not call a model, rewrite a payload, or pick an SDK.

```ts
const result = checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});
```

| Field           | Meaning                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| `coverage`      | `profiled` if a request profile matched; `unknown` if no shipped rule applies |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported`                      |
| `diagnostics`   | Stable `code` values, reasons, and suggested actions                          |
| `effective`     | Request after model defaults. Omitted `reasoningEffort` may become `medium`   |
| `profile`       | Matched request profile, or `undefined` when no shipped rule applies          |
| `fixes`         | Suggested endpoint or parameter changes. Nothing is applied automatically     |

`provider` is `openai`, `azure-openai`, or `azure` for the shipped OpenAI-compatible family. `endpoint` accepts `chat-completions`, `responses`, and short aliases (`chat`, `/v1/chat/completions`). `tools: true` or `tools: "function"` means function tools are present.

`checkRequest()` is pure: no network, filesystem, clocks, or randomness. Same input returns the same result.

If no request profile matches the provider and model, `coverage` is `unknown`, `compatibility` is `lossless`, `profile` is `undefined`, and no default is invented. Treat `unknown` as unchecked, not as safe to send.

The shipped GPT-5.6 rule: Chat Completions plus function tools is compatible only when effective reasoning is `none`. GPT-5.6 defaults omitted `reasoning_effort` to `medium`, so omitting it is enough to fail. Responses accepts function tools with reasoning.

## `listTargets()` / `resolveTarget(id)`

`resolveTarget("claude")` returns the same `ResolvedTarget` as `listTargets()` for the Anthropic structured profile. `resolveTarget("deepseek")` returns `deepseek/chat/strict-tools`. `resolveTarget("grok")` returns `xai/grok/structured`. `resolveTarget("qwen")` returns `alibaba/qwen/tools` (Alibaba Model Studio tools/structured output, **not** local Qwen / LM Studio / Ollama / llama.cpp). `resolveTarget("mistral")` returns `mistral/chat/structured`. `resolveTarget("openrouter")` returns `openrouter/structured`. `resolveTarget("mcp")` returns `mcp/2026-06/tools`. `listTargets()` defaults to `scope: "provider"`. Pass `{ scope: "runtime" }` or `{ scope: "all" }` for local schema engines such as `llamacpp/server/structured`, `vllm/openai/structured`, and `sglang/openai/structured`. `resolveTarget("vllm")` and `resolveTarget("sglang")` stay runtime-scoped. Unknown ids throw `LlmAbiError`.

Each resolved target includes:

```ts
{
  maturity: "supported" | "partial" | "experimental",
  evidence: {
    kind: "documented" | "sdk-observed" | "empirical",
    source: "https://...",
    lastVerified: "2026-08-18",
    live: "nightly" | "not-configured",
  },
}
```

Maturity, documentary evidence, and live coverage are independent signals. A documentation verification date does not claim a successful live API request.

## `listRequestProfiles()` / `resolveRequestProfile(id)`

`resolveRequestProfile("openai/gpt-5.6")` returns the GPT-5.6 request family. Unknown ids throw `LlmAbiError`.

## `checkDeployment(input)`

Checks whether a schema and request contract can be represented on a runtime × engine × model deployment. This is not `compile()` and not a generator.

```ts
const result = checkDeployment({
  schema,
  deployment: {
    runtime: { kind: "lmstudio", apiSurface: "openai", engine: { kind: "llamacpp" } },
    model: { id: "Qwen3.8-27B-Q4_K_M", format: "gguf" },
  },
  request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
});
```

| Field           | Meaning                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `coverage`      | `profiled` if a runtime profile matched and required features are known; `partial` or `unknown` |
| `compatibility` | Worst of schema compile and runtime/model feature rules                                         |
| `schema`        | Present only when a runtime schema target could be resolved                                     |
| `fixes`         | Suggested request changes. Nothing is applied automatically                                     |

`checkDeployment()` is pure. If no runtime profile matches, `coverage` is `unknown` and `compatibility` is `lossless`. Unknown features do not become `unsupported`. Probe results never live here.

Ollama Responses with `stateful: true` is `unsupported` (`previous_response_id` is documented unsupported). LM Studio without `format` does not guess GGUF vs MLX.

## `llm-abi/local`

```ts
import {
  discoverLocalDeployments,
  probeDeployment,
  matrixLocalDeployments,
  createDeploymentLock,
  diffDeploymentLocks,
} from "llm-abi/local";
```

Node only. Default discovery is `127.0.0.1:1234`, `:11434`, and `:8080`. It does not scan a LAN or follow redirects. `local doctor` is GET metadata and lists loaded models only. `local probe` is explicit generation with synthetic fixtures. `matrixLocalDeployments()` compares loaded models. `createDeploymentLock()` splits contract, deployment, and evaluation fingerprints and redacts absolute paths. An explicit `model` may cause the runtime to load that model. A probe pass does not upgrade static compatibility.
