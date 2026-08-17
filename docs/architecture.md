# Architecture

llm-abi is a compiler, not a converter.

```text
JSON Schema / Standard JSON Schema / TypeScript type subset
              ↓
        Normalized IR
              ↓
   analyze  →  lower(profile)  →  emit
              ↓
 provider JSON Schema + diagnostics + fingerprint + size
```

## IR

The IR is a closed set of node kinds: `string`, `number`, `integer`, `boolean`, `null`, `object`, `array`, `tuple`, `enum`, `literal`, `union`, `intersection`, `ref`, `any`, `never`.

JSON Schema is parsed into IR once. Provider code must not pattern-match raw JSON Schema keywords.

## Target profiles

A profile is data:

- capability of each keyword (`supported` | `runtime-only` | `lossy` | `unsupported`)
- object policy (`additionalProperties`, optional-as-nullable)
- limits
- evidence (`documented` | `sdk-observed` | `empirical`)
- revision string shipped with the package

The lowering pass reads the profile. Adding DeepSeek should not require a new compiler.

## Safety

Untrusted schemas are bounded by max depth, max nodes, and max `$ref` count. Dictionaries keyed by property names use `Map` or null-prototype objects.
