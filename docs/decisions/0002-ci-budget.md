# 0002 — CI budget

Date: 2026-08-17

## Decision

GitHub Actions is a scarce budget. Default CI is one job on Node 22.

That job runs `pnpm check`: format, lint, typecheck, tests, build, pack, and examples.

Coverage, gzip size, the consumer pack, and Node 24 are `workflow_dispatch` only (`Extra`).

Live provider HTTP checks are `schedule` + `workflow_dispatch` only (`Live`). They skip when secrets are missing. They are not a pull-request job.

Release runs on `main` after the first npm publish. See [0012-automatic-release.md](./0012-automatic-release.md).

Dependabot is monthly, grouped, and ignores TypeScript / `@types/node` majors.

## Why

The first CI runs failed in 11s on `pnpm/action-setup` (`version: 10` vs `packageManager: pnpm@10.11.0`) and still billed three jobs per event. A Node 22+24 matrix, a second examples job, coverage that re-runs tests, a scheduled nightly, and Release on every `main` push would keep burning minutes before anyone uses the library.

Node 22 is the documented runtime. A second current Node is a canary, not a PR gate.
