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

export async function readBoundedBytes(
  response: Response,
  maxBytes: number = MAX_RESPONSE_BYTES,
): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new Error(`Response exceeded ${String(maxBytes)} bytes.`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array();
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- stream chunks must be read sequentially
    const next = await reader.read();
    if (next.done) {
      break;
    }
    const value = next.value;
    total += value.byteLength;
    if (total > maxBytes) {
      // oxlint-disable-next-line no-await-in-loop -- stop reading as soon as the bound is exceeded
      await reader.cancel();
      throw new Error(`Response exceeded ${String(maxBytes)} bytes.`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function readBoundedJSON(
  response: Response,
  maxBytes: number = MAX_RESPONSE_BYTES,
): Promise<unknown> {
  const raw = await readBoundedBytes(response, maxBytes);
  if (raw.byteLength === 0) {
    return undefined;
  }
  const text = new TextDecoder().decode(raw);
  if (text.trim() === "") {
    return undefined;
  }
  return JSON.parse(text) as unknown;
}

export async function readBoundedText(
  response: Response,
  maxBytes: number = MAX_RESPONSE_BYTES,
): Promise<string> {
  const raw = await readBoundedBytes(response, maxBytes);
  return new TextDecoder().decode(raw);
}

export function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}
