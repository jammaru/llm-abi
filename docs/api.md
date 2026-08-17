# Public API

Named exports only. There is no default export.

```ts
import { compile, check, analyze, fingerprint, listTargets, resolveTarget } from "sabijs";
```

## `compile(schema, target | options)`

Compiles a JSON Schema or Standard JSON Schema object into a provider-safe schema.

```ts
const result = compile(schema, "anthropic");
const same = compile(schema, { target: "anthropic/messages/structured" });
```

| Field           | Meaning                                                  |
| --------------- | -------------------------------------------------------- |
| `schema`        | Provider JSON Schema                                     |
| `diagnostics`   | Stable `code` values, paths, and suggested actions       |
| `loss`          | Discrete compatibility plus removed constraints          |
| `fingerprint`   | Canonical SHA-256 of the emitted schema                  |
| `target`        | Resolved profile id, vendor, mode, revision              |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported` |
| `validate`      | Validates against the **original** schema                |

`compile()` is pure: no network, filesystem, clocks, or randomness.

`strict: true` throws `SchemaCompatibilityError` when compatibility is `unsupported`.

`constraintFallback: "description" | "strip"` controls whether runtime-only constraints are appended to `description`.

## `check(schema, options?)`

Runs `compile` for every built-in target (or `options.targets`).

## `analyze(schema)`

Returns fingerprint, node/depth/property stats, and parse notes. Does not lower to a provider.

## `fingerprint(schema)`

Canonical SHA-256 of the input schema. Property order does not matter.

## `listTargets()` / `resolveTarget(id)`

`resolveTarget("claude")` returns the Anthropic structured profile. Unknown ids throw `SabiError`.
