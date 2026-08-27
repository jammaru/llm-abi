# Request profiles

A request profile is one TypeScript file of data. `checkRequest()` already knows how to apply defaults and evaluate rules. Do not add `if (model === ...)` branches in the checker, and do not depend on a vendor SDK in `packages/core`.

Copy [`packages/core/src/request/openai.ts`](../../packages/core/src/request/openai.ts) and change the fields.

## Steps

1. Add or extend `packages/core/src/request/<vendor>.ts` with `defineRequestProfile(...)`.
2. Register the profile in `packages/core/src/request/registry.ts`.
3. Set `evidence` to `documented`, `sdk-observed`, or `empirical`.
4. Add focused tests in `packages/core/tests/request.test.ts` for omitted defaults and the failing combination.
5. Update [docs/api.md](../api.md) when a new family is shipped.
6. Run `pnpm test` and `pnpm changeset`.

## Profile fields

| Field       | Role                                                                 |
| ----------- | -------------------------------------------------------------------- |
| `id`        | Canonical id, `vendor/family`                                        |
| `providers` | Provider strings that share this contract (`openai`, `azure-openai`) |
| `family`    | Model family label used in `effective.family`                        |
| `models`    | Exact ids and prefixes (`gpt-5.6`, `gpt-5.6-`)                       |
| `defaults`  | Values applied when the caller omits a field                         |
| `rules`     | Endpoint / tools / effective-reasoning predicates                    |
| `revision`  | Doc or observation date shipped with the package                     |
| `evidence`  | `documented` \| `sdk-observed` \| `empirical`                        |

Rules run against **effective** values. An omitted `reasoningEffort` is not "unset"; it becomes the profile default when one exists.

## Out of scope for a request-profile PR

- Agent frameworks
- Provider SDK wrappers in `packages/core`
- Fetching docs or config at runtime
- Rewriting or sending the request (`negotiate()` is not a public API)
- Folding request rules into `compile()`
