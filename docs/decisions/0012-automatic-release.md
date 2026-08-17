# 0012 — Tag-triggered npm releases

Date: 2026-08-18

## Decision

Agents cut releases. Pushing a `vX.Y.Z` tag runs the Release workflow: publish `llm-abi` to npm with provenance, then create the GitHub Release. Feature PRs only add changesets. They do not publish.

Version bumps come from `pnpm changeset version` on current `main`, then a `Release` PR, then the tag.

## Why

0.1.0 was already on npm. Compiler work then sat in `.changeset/` because Release was `workflow_dispatch` only. The first-publish caution in 0002 no longer applies.

`changesets/action` would open a Version PR with `GITHUB_TOKEN`. GitHub rejects that unless Actions may create pull requests. An agent opens the Release PR, merges it, and pushes the tag. Release does not run on every push to `main` (0002).
