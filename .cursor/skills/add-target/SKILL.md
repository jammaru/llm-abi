---
name: add-target
description: Add an llm-abi LLM provider target profile with fixtures, tests, and evidence. Use when adding OpenAI, Anthropic, Gemini, DeepSeek, xAI, Qwen, or other compile targets.
---

# Add an llm-abi target

## Steps

1. Create `packages/core/src/targets/<vendor>.ts` with `defineTarget`.
2. Register the profile and aliases in `packages/core/src/targets/registry.ts`.
3. Set `evidence` to `documented`, `sdk-observed`, or `empirical`.
4. Add JSON fixtures under `packages/conformance/fixtures/`.
5. Add a focused test for the vendor-specific lowering rule.
6. Update the README target table. Do not mark a target `Verified` without a documented or empirical basis.
7. Run `pnpm test` and `pnpm changeset`.

## Profile shape

```ts
export const vendor = defineTarget({
  id: "vendor/api/mode",
  aliases: ["vendor"],
  vendor: "vendor",
  mode: "structured",
  revision: "2026-08",
  dialect: "2020-12",
  evidence: "documented",
  capabilities: {/* Support per keyword */},
  formats: new Set(["date-time"]),
  limits: {},
  objectPolicy: {
    additionalProperties: false,
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "unsupported",
});
```

Do not add the vendor SDK as a dependency.
