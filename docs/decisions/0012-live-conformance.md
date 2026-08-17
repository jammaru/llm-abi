# 0012 — Live conformance is secret-gated and never a PR job

Date: 2026-08-18

## Decision

Offline fixtures remain the PR gate. Live provider checks are a separate nightly (and `workflow_dispatch`) job.

The runner:

- does not run on `pull_request`
- skips a vendor when its secret is missing
- sends only the **compiled** schema
- records `accepted` | `rejected` | `skipped` per fixture × adapter
- never invents a compatibility percentage or score
- uses `fetch`, not vendor SDKs, and not `packages/core`

`rejected` means the live API refused a schema this package compiled. That is profile drift: mark evidence `empirical` and add a fixture. The job fails so the drift is visible. It does not edit profiles by itself.

Rate limits, missing secrets, 5xx, and `compile === unsupported` are `skipped`, not failures.

v0.1 adapters are OpenAI Responses, Anthropic Messages, and Gemini `generateContent`. Other targets wait for secrets and an adapter.

## Evidence

Issue #3. CI budget decision 0002: extra work stays off the PR job.
