# 0013 — Request ABI is a checker, not part of `compile()`

Date: 2026-08-28

## Decision

Ship `checkRequest()` as a second public surface next to the schema compiler.

```ts
checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});
```

Request compatibility lives in `packages/core/src/request/`. Schema lowering stays in `compile()`. The first shipped profile is `openai/gpt-5.6`.

## Why

GPT-5.6 accepts function tools and it accepts reasoning, but Chat Completions rejects the combination unless effective `reasoning_effort` is `none`. Omitting the field still fails because GPT-5.6 defaults to `medium`. That is an ABI problem: the same payload means different things on different model and endpoint pairs.

Putting those rules into `compile()` would mix JSON Schema lowering with request-parameter defaults. A separate checker can resolve omitted fields through a shipped profile and report `unsupported` before a 400.

`checkRequest()` does not call a provider, rewrite a payload, or choose an SDK. Suggested fixes are diagnostics only.

Unknown provider/model pairs return `coverage: "unknown"`. `compatibility: "lossless"` in that case means no shipped rule fired, not that the live API will accept the request.

## Evidence

`documented` against:

- https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol
- https://developers.openai.com/api/docs/guides/latest-model
- https://learn.microsoft.com/azure/foundry/openai/how-to/reasoning

The Microsoft note applies to `gpt-5.6` and later on Chat Completions. This package only matches the `gpt-5.6` family (`gpt-5.6`, `gpt-5.6-*`). Later families need their own profile when they are documented.

GPT-5.4 and GPT-5.5 are not claimed. Some SDKs route those models to Responses when tools and explicit reasoning are combined; that is not encoded here.

## Not in this change

- `negotiate()` or any request rewriter
- Playground UI for request checks
- Hosted-tool vs function-tool distinction beyond `tools: true | "function"`
- Opaque Azure deployment names that are not a model id
