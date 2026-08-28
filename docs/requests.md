# Requests

`checkRequest()` answers whether a provider request combination can be sent. It is not `compile()`. It does not call a model, rewrite a payload, or pick an SDK.

```ts
import { checkRequest } from "llm-abi";

const result = checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});

result.coverage;
// "profiled"
result.compatibility;
// "unsupported"
result.effective.reasoningEffort;
// "medium"  (model default)
```

This example fails because the field was omitted. GPT-5.6 fills omitted `reasoning_effort` with `medium`.

## How to read the result

| Field           | Meaning                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| `coverage`      | `profiled` if a request profile matched; `unknown` if no shipped rule applies |
| `compatibility` | `lossless` \| `runtime-safe` \| `lossy` \| `unsupported`                      |
| `effective`     | Request after profile defaults. Omitted fields are not "unset"                |
| `fixes`         | Suggested endpoint or parameter changes. Nothing is applied automatically     |

If no profile matches, `coverage` is `unknown` and `compatibility` is `lossless`. Treat that as **unchecked**, not safe to send.

## GPT-5.6

Chat Completions plus function tools is compatible only when effective reasoning is `none`. GPT-5.6 defaults omitted `reasoning_effort` to `medium`, so omitting it is enough to fail. Responses accepts function tools with reasoning.

```bash
npx llm-abi request request.json --ci
```

```json
{
  "provider": "openai",
  "model": "gpt-5.6-terra",
  "endpoint": "chat-completions",
  "tools": true
}
```

`provider` accepts `openai`, `azure-openai`, and `azure`. `endpoint` accepts `chat-completions`, `responses`, and short aliases (`chat`, `/v1/chat/completions`).

See [API](./api.md) for the full `checkRequest()` field list.
