# 0008 — Mistral closes objects without requiring every field

Date: 2026-08-18

## Decision

The Mistral structured profile is not an OpenAI copy. Official custom structured-output docs accept a JSON Schema. The official Python client's `rec_strict_json_schema` helper only forces `additionalProperties: false` on every object. It does not add every property to `required` and does not rewrite optionals as nullable unions.

Constraint keywords such as `minLength` are left in the schema. This profile does not invent an unsupported-keyword list that Mistral has not published.

README status is **Experimental** because the distinctive object policy is `sdk-observed`.

## Evidence

`sdk-observed` against https://github.com/mistralai/client-python `rec_strict_json_schema` and https://docs.mistral.ai/capabilities/structured-output/custom_structured_output/ (revision 2026-08).
