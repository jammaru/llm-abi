# Contributing

Thank you for helping with llm-abi.

## Setup

```bash
pnpm install
pnpm test
pnpm check
```

Coverage, gzip size, and Node 24 are a manual `Extra` workflow, not a PR gate. Live provider checks are the `Live` workflow (`schedule` + `workflow_dispatch` only). They skip when secrets are missing and never run on pull requests.

## Project layout

- `packages/core` — compiler, public API, CLI
- `packages/conformance` — JSON Schema fixtures and the secret-gated live runner
- `packages/action` — reusable GitHub Action that runs the CLI
- `packages/playground` — static browser playground (`pnpm playground`)
- `examples` — copy-paste recipes under existing SDKs (OpenAI, Anthropic, Gemini, AI SDK, MCP). Typechecked and executed in CI. No provider API calls.
- `docs` — guarantees, API, CLI, and architecture
- `AGENTS.md` — product boundaries for humans and coding agents
- `.agents/skills` — shared agent checklists

## Pull requests

1. Keep the public API small.
2. Do not add runtime dependencies to `packages/core`.
3. Provider behavior belongs in a target profile, not in `if (provider === ...)` branches.
4. Add or update fixtures when you change lowering.
5. Run `pnpm changeset` for user-facing compiler changes.
6. Write English commit messages.

## Adding a provider

1. Create `packages/core/src/targets/<vendor>.ts` with `defineTarget`.
2. Register the profile in `registry.ts`.
3. Add fixtures and tests.
4. Record evidence: `documented`, `sdk-observed`, or `empirical`.
5. Mark the README status honestly (`Verified` / `Partial` / `Experimental`).

See [docs/targets/README.md](docs/targets/README.md) for the profile fields and evidence rules. `.agents/skills/add-target/SKILL.md` is the same checklist for agents.

## Playground

```bash
pnpm playground
```

The app is static. Compilation uses the `llm-abi` workspace package in the browser. Cloudflare Pages deploys `packages/playground/dist` from `main` with `pnpm dlx wrangler`. The workflow needs the `CLOUDFLARE_API_TOKEN` repository secret.

## Release

User-facing compiler changes (public API, new targets, diagnostics) need a file in `.changeset/`. Merging those PRs to `main` opens a Release PR. Merging the Release PR publishes `llm-abi` to npm, creates a GitHub release, and tags `vX.Y.Z` for the GitHub Action.

Playground, docs, and CI-only changes do not need a changeset.

## Live checks

`pnpm live` sends compiled fixtures to OpenAI, Anthropic, and Gemini. Pull requests never run it. Missing `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` / `GOOGLE_API_KEY` skips that vendor. Do not add those keys to the repository.
