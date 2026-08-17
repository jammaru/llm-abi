# 0012 — Automatic npm releases

Date: 2026-08-18

## Decision

Run the Release workflow on every push to `main`. Changesets open a Release PR. Merging that PR publishes `llm-abi` to npm, creates a GitHub release, and tags `vX.Y.Z` for the reusable GitHub Action.

Playground, examples, and CI-only work do not get a changeset. They ship when `main` deploys Pages or Actions, not when npm versions.

## Why

0.1.0 was already on npm. After that, compiler work (TypeScript input, size, MCP, extra providers) sat in `.changeset/` with no publish because Release was `workflow_dispatch` only. The first-publish caution in 0002 no longer applies.
