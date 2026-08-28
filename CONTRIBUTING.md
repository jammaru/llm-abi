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

- `packages/core` — compiler, request checker, runtime checker, public API, CLI, Node `llm-abi/local`
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
3. Provider behavior belongs in a target or request profile, not in `if (provider === ...)` branches.
4. Add or update fixtures when you change lowering.
5. Run `pnpm changeset` for user-facing compiler changes.
6. Write English commit messages.

## Adding a provider

1. Create `packages/core/src/targets/<vendor>.ts` with `defineTarget`.
2. Register the profile in `registry.ts`.
3. Add fixtures and tests.
4. Record evidence: `documented`, `sdk-observed`, or `empirical`.
5. Mark the README status honestly (`Supported` / `Partial` / `Experimental`). Maturity is not a live API check.

See [docs/targets/README.md](docs/targets/README.md) for the profile fields and evidence rules. `.agents/skills/add-target/SKILL.md` is the same checklist for agents.

## Adding a request profile

Request compatibility (`checkRequest`) is a separate layer from schema compile. Add a profile under `packages/core/src/request/`, register it, and test omitted defaults. See [docs/requests/README.md](docs/requests/README.md). Do not put model or `reasoning_effort` rules into `compile()`.

## Adding a runtime profile

Runtime compatibility (`checkDeployment`) is a third layer. Add a profile under `packages/core/src/deployment/`, register it, and keep network code in `llm-abi/local`. See [docs/runtime/README.md](docs/runtime/README.md). Do not change the `qwen` compile alias.

## Playground

```bash
pnpm playground
```

The app is static. Compilation uses the `llm-abi` workspace package in the browser. Cloudflare Pages builds `packages/playground/dist` from `main` when the GitHub repository is connected in the project settings.

## Release

User-facing compiler changes (public API, new targets, diagnostics) need a file in `.changeset/`. An agent cuts the npm release (see `.agents/skills/release/SKILL.md`):

1. `pnpm changeset version` on current `main`
2. Open and squash-merge a `Release` PR
3. Tag `vX.Y.Z` on that merge commit and push it

The Release workflow publishes `llm-abi` to npm via OIDC (no `NPM_TOKEN`), creates the GitHub Release, and that tag is what the reusable GitHub Action pins to.

Playground, docs, and CI-only changes do not need a changeset.

## Live checks

`pnpm live` sends compiled fixtures to OpenAI, Anthropic, and Gemini. Pull requests never run it. Missing `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` / `GOOGLE_API_KEY` skips that vendor. Do not add those keys to the repository.
