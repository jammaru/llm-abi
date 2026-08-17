# Public API

Named exports only. There is no default export.

```ts
import { compile, check, analyze, fingerprint, listTargets, resolveTarget } from "llm-abi";
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
| `target`        | Resolved profile id, vendor, mode, revision                                         |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported`                            |
| `size`          | UTF-8 bytes of the emitted schema and a conservative token hint (`ceil(bytes / 3)`) |
| `validate`      | Validates against the **original** schema                                           |

`compile()` is pure: no network, filesystem, clocks, or randomness.

`strict: true` throws `SchemaCompatibilityError` when compatibility is `unsupported`.

`constraintFallback: "description" | "strip"` controls whether runtime-only constraints are appended to `description`.

`optimize: true` drops titles that duplicate the property name and descriptions that duplicate the title. Each omission emits `redundant-annotation-removed`. Default is `false`, so v0.1 emitted JSON stays the same.

`typeName` selects which `type` or `interface` to compile from TypeScript source. Default: the last exported declaration, otherwise the last declaration.

TypeScript input is a closed subset: `type` / `interface`, primitives, literals, arrays, tuples, unions, intersections, optional properties, nested objects, `Array<T>`, `ReadonlyArray<T>`, and `Record<string, T>`. There is no `typescript` compiler dependency, no import resolution, and no generic type declarations. Unsupported syntax throws instead of being dropped silently.

## `check(schema, options?)`

Runs `compile` for every built-in target (or `options.targets`). Each row includes that target's emitted `size`. `options.optimize` is forwarded to each compile.

## `analyze(schema)`

Returns fingerprint, node/depth/property stats, unused root `$defs` count, input schema byte/token size, and parse notes. Does not lower to a provider.

## `fingerprint(schema)`

Canonical SHA-256 of the input schema. Property order does not matter.

## `listTargets()` / `resolveTarget(id)`

`resolveTarget("claude")` returns the Anthropic structured profile. `resolveTarget("deepseek")` returns `deepseek/chat/strict-tools`. Unknown ids throw `LlmAbiError`.
