---
name: review-compiler
description: Review llm-abi compiler changes for IR purity, diagnostics stability, determinism, and schema safety. Use when reviewing PRs, lowering changes, or target profile updates.
---

# Review llm-abi compiler changes

Check, then fix:

1. Core gained no runtime dependency.
2. Provider logic is in a profile, not scattered conditionals.
3. Every rewrite emits a stable diagnostic `code`.
4. `compile()` remains deterministic and side-effect free.
5. Depth / node / `$ref` limits still apply.
6. User-keyed objects use `Map` or `Object.create(null)`.
7. Source TypeScript stays Node strip-only compatible (no parameter properties, enums, or namespaces). The GitHub Action loads `.ts` on Node 24.
8. Fixtures cover the new construct × each target.
9. README status (`Supported` / `Partial` / `Experimental`) matches the evidence field and live coverage.
10. Public API did not grow without an explicit decision.

Reject agent-framework features and provider SDK wrappers in `packages/core`.
