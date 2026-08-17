# Target evidence

Profiles record **how we know** a capability, not just the capability.

| Evidence       | Meaning                                |
| -------------- | -------------------------------------- |
| `documented`   | Stated in official provider docs       |
| `sdk-observed` | Visible in an official SDK transformer |
| `empirical`    | Observed against a live API            |

v0.1 OpenAI, Anthropic, and Gemini profiles are `documented` against public structured-output references dated 2026-08.

When a doc and a live API disagree, prefer the live API, mark `empirical`, and keep a fixture.
