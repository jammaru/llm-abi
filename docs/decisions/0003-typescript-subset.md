# 0003 — TypeScript type subset input

Date: 2026-08-18

## Decision

`compile`, `check`, and `analyze` accept a closed subset of TypeScript `type` / `interface` syntax as a string. The subset is parsed inside `packages/core` and lowered through the existing IR.

## Why

The public description is the schema ABI between TypeScript and LLM providers. JSON Schema alone left that claim untrue. A `typescript` compiler dependency would break core's zero-dependency and platform-neutral rules, so the parser is a closed subset, not `tsc`.

## Supported

- `type` aliases and `interface` bodies (including interface merging)
- primitives, literals, arrays, tuples, unions, intersections
- string / number / boolean literal unions emit `enum`, not `anyOf` of `const`
- optional properties, nested objects
- `Array<T>`, `ReadonlyArray<T>`, `Record<string, T>`

## Unsupported (errors, never silent)

- `import` / `export from`
- generic type declarations
- mapped and conditional types
- `typeof`, `keyof`, `enum`, classes, functions as values

`compile()` stays pure: no filesystem, no `tsc`, no module resolution. The CLI may read a `.ts` file as source text.
