---
name: release
description: Cut an llm-abi npm release. Use when publishing compiler changesets, tagging vX.Y.Z, or the user asks to release or publish llm-abi.
---

# Release llm-abi

Agents cut releases. Do not ask a human to run `npm version` or to click Publish.

Playground, docs, and CI-only work do not get a changeset and do not need a release.

## Steps

1. `main` is green. `.changeset/` has pending files (not only README).
2. From current `main`: `pnpm changeset version`. That bumps `packages/core`, updates `CHANGELOG.md`, and deletes the consumed changesets.
3. Commit `Version packages`. Open a PR titled `Release`. Wait for CI. Squash-merge.
4. Tag the merge commit. The tag must match `packages/core/package.json`:

```text
git fetch origin main
git tag -a vX.Y.Z origin/main -m "llm-abi X.Y.Z"
git push origin vX.Y.Z
```

5. The Release workflow publishes to npm (OIDC, no `NPM_TOKEN`), then creates the GitHub Release. Confirm `npm view llm-abi version` and the Releases page.

## Do not

- Open the Version PR with `changesets/action`. `GITHUB_TOKEN` cannot create pull requests in this repository.
- Bump `package.json` on a feature PR. Feature PRs only add a changeset.
- Force-push `main` or moving major tags.
- Publish from a laptop. Trusted Publishing is the `release.yml` workflow only.
