import type { LiveHttpResult, LiveOutcome } from "./types.ts";

export function classifyLiveHttp(result: LiveHttpResult): {
  readonly live: LiveOutcome;
  readonly reason: string;
} {
  if (result.status >= 200 && result.status < 300) {
    return { live: "accepted", reason: `HTTP ${String(result.status)}` };
  }
  if (result.status === 401 || result.status === 403) {
    return { live: "skipped", reason: `unauthorized (${String(result.status)})` };
  }
  if (result.status === 404) {
    return { live: "skipped", reason: `provider-error (${String(result.status)})` };
  }
  if (result.status === 429) {
    return { live: "skipped", reason: "rate-limited" };
  }
  if (result.status >= 500) {
    return { live: "skipped", reason: `provider-error (${String(result.status)})` };
  }
  if (result.status >= 400) {
    return {
      live: "rejected",
      reason: `HTTP ${String(result.status)}: ${truncate(result.body)}`,
    };
  }
  return { live: "skipped", reason: `unexpected status ${String(result.status)}` };
}

export function truncate(text: string, max = 180): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) {
    return compact;
  }
  return `${compact.slice(0, max)}…`;
}

export function redact(text: string, secrets: readonly string[]): string {
  let result = text;
  for (const secret of secrets) {
    if (secret.length > 0) {
      result = result.split(secret).join("[redacted]");
    }
  }
  return result;
}
