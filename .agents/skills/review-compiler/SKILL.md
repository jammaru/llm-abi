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
11. Request rules stayed in `packages/core/src/request/`, not in `compile()`.
12. Omitted request fields are evaluated after profile defaults, not treated as "unset means safe".
13. Runtime rules stay in `packages/core/src/deployment/`, not in `compile()`. Probe and discovery stay out of the neutral `index` entry.
14. `listTargets()` default scope stays `provider`. The `qwen` alias stays `alibaba/qwen/tools`.

Reject agent-framework features and provider SDK wrappers in `packages/core`.
