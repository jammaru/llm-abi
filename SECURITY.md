# Security Policy

## Supported versions

Security fixes are accepted against the latest published `sabijs` release.

## Reporting a vulnerability

Please email **jammaru.lab@gmail.com** with:

- Sabi / `sabijs` version
- A minimal schema that triggers the issue
- Impact (crash, unbounded memory, prototype pollution, etc.)

Do not open a public GitHub issue for unfixed vulnerabilities.

## Scope

Sabi compiles untrusted JSON Schema-like input. The following are in scope:

- Unbounded recursion or memory growth
- Prototype pollution through property names
- ReDoS via attacker-controlled `pattern` values during `validate()`
- Pathological `$ref` graphs

The compiler must fail with `SchemaLimitError` rather than hang or exhaust memory.
