import { LlmAbiError } from "../errors.ts";
import { MAX_ENDPOINT_LENGTH } from "./limits.ts";

export type EndpointKind = "loopback" | "remote";

export function parseBaseURL(value: string): URL {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ENDPOINT_LENGTH) {
    throw new LlmAbiError("Local endpoint URL is missing or too long.", "invalid-local-url");
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new LlmAbiError(`Invalid local endpoint URL "${value}".`, "invalid-local-url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new LlmAbiError("Local endpoint URL must be http or https.", "invalid-local-url");
  }
  return url;
}

export function endpointKindOf(url: URL): EndpointKind {
  const host = url.hostname.toLowerCase();
  if (host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1") {
    return "loopback";
  }
  return "remote";
}

export function joinURL(base: string, path: string): string {
  return new URL(path, base.endsWith("/") ? base : `${base}/`).href;
}

export function isLoopbackURL(value: string): boolean {
  return endpointKindOf(parseBaseURL(value)) === "loopback";
}
