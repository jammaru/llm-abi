# Contributing

Thank you for helping with llm-abi.

## Setup

```bash
pnpm install
pnpm test
pnpm check
```

Node.js 22+ and pnpm 10 are required. `pnpm check` is what GitHub Actions runs on every PR (one job, Node 22). Coverage, gzip size, and Node 24 are a manual `Extra` workflow, not a PR gate.

## Project layout

- `packages/core` — compiler, public API, CLI
- `packages/conformance` — JSON Schema fixtures
- `packages/action` — reusable GitHub Action that runs the CLI
- `packages/playground` — static browser playground (`pnpm playground`)
- `examples` — copy-paste recipes, typechecked and executed in CI
- `docs` — guarantees, API, CLI, and architecture
- `AGENTS.md` — product boundaries for humans and coding agents
- `.agents/skills` — shared agent checklists

## Pull requests

1. Keep the public API small.
2. Do not add runtime dependencies to `packages/core`.
3. Provider behavior belongs in a target profile, not in `if (provider === ...)` branches.
4. Add or update fixtures when you change lowering.
5. Run `pnpm changeset` for user-facing changes.
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

The app is static. Compilation uses the `llm-abi` workspace package in the browser. GitHub Pages deploys `packages/playground/dist` from `main` (Pages source: GitHub Actions).
