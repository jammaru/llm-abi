---
name: add-target
description: Add an llm-abi LLM provider target profile with fixtures, tests, and evidence. Use when adding OpenAI, Anthropic, Gemini, DeepSeek, xAI, Qwen, or other compile targets.
---

# Add an llm-abi target

## Steps

1. Create `packages/core/src/targets/<vendor>.ts` with `defineTarget`.
2. Register the profile and aliases in `packages/core/src/targets/registry.ts`. Set `scope: "runtime"` for local schema engines so they stay out of default `check()`.
3. Set `maturity`, `evidence`, `evidenceSource`, `lastVerified`, and `liveAdapter`.
4. Add JSON fixtures under `packages/conformance/fixtures/`.
5. Add a focused test for the vendor-specific lowering rule.
6. Update the README target table. Keep `Supported` / `Partial` / `Experimental` separate from evidence kind and live coverage.
7. Run `pnpm test` and `pnpm changeset`.

## Profile shape

```ts
export const vendor = defineTarget({
  id: "vendor/api/mode",
  aliases: ["vendor"],
  vendor: "vendor",
  mode: "structured",
  revision: "2026-08",
  maturity: "supported",
  dialect: "2020-12",
  evidence: "documented",
  evidenceSource: "https://example.com/docs",
  lastVerified: "2026-08-18",
  liveAdapter: false,
  capabilities: {/* Support per keyword */},
  formats: new Set(["date-time"]),
  limits: {},
  objectPolicy: {
    additionalProperties: false, // or "preserve" / "omit-false"
    requireAllProperties: false,
    optionalAsNullable: false,
  },
  rootMustBeObject: true,
  rootAnyOf: "unsupported",
});
```

See [docs/targets/README.md](../../../docs/targets/README.md) for field meanings, evidence, and README status.

Do not add the vendor SDK as a dependency.
