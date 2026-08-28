import { MAX_RESPONSE_BYTES } from "./limits.ts";

export interface RuntimeTransport {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export function createFetchTransport(): RuntimeTransport {
  return {
    async fetch(input: string, init?: RequestInit): Promise<Response> {
      return await fetch(input, { ...init, redirect: "error" });
    },
  };
}

export async function readBoundedJSON(
  response: Response,
  maxBytes: number = MAX_RESPONSE_BYTES,
): Promise<unknown> {
  const raw = await response.arrayBuffer();
  if (raw.byteLength > maxBytes) {
    throw new Error(`Response exceeded ${String(maxBytes)} bytes.`);
  }
  const text = new TextDecoder().decode(raw);
  if (text.trim() === "") {
    return undefined;
  }
  return JSON.parse(text) as unknown;
}

export function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}
