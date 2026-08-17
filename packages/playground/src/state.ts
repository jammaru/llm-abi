import type { ConstraintFallback, InputKind, PlaygroundOptions } from "./compile.ts";
import { DEFAULT_EXAMPLE_ID, defaultExample, exampleById } from "./examples.ts";

export const STATE_VERSION: number = 1;
export const MAX_SHARE_CHARS: number = 6000;

export interface PlaygroundState extends PlaygroundOptions {
  readonly version: number;
  readonly source: string;
  readonly exampleId: string;
  readonly instance: string;
  readonly compareLeft: string;
  readonly compareRight: string;
}

export function defaultState(): PlaygroundState {
  const example = defaultExample();
  return {
    version: STATE_VERSION,
    source: example.source,
    kind: example.kind,
    typeName: example.typeName,
    optimize: false,
    constraintFallback: "description",
    exampleId: example.id,
    instance: example.instance,
    compareLeft: "openai/responses/structured",
    compareRight: "anthropic/messages/structured",
  };
}

export function encodeState(state: PlaygroundState): string {
  const json = JSON.stringify(toWire(state));
  return toBase64Url(json);
}

export function decodeState(hash: string): PlaygroundState | undefined {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw.length === 0) {
    return undefined;
  }
  try {
    const json = fromBase64Url(raw);
    const parsed: unknown = JSON.parse(json);
    return fromWire(parsed);
  } catch {
    return undefined;
  }
}

export function applyExample(state: PlaygroundState, exampleId: string): PlaygroundState {
  const example = exampleById(exampleId);
  if (!example) {
    return state;
  }
  return {
    ...state,
    exampleId: example.id,
    kind: example.kind,
    typeName: example.typeName,
    source: example.source,
    instance: example.instance,
  };
}

export function shareTooLong(encoded: string): boolean {
  return encoded.length > MAX_SHARE_CHARS;
}

interface WireState {
  readonly v: number;
  readonly s: string;
  readonly k: InputKind;
  readonly n: string;
  readonly o: boolean;
  readonly f: ConstraintFallback;
  readonly e: string;
  readonly i: string;
  readonly l: string;
  readonly r: string;
}

function toWire(state: PlaygroundState): WireState {
  return {
    v: STATE_VERSION,
    s: state.source,
    k: state.kind,
    n: state.typeName,
    o: state.optimize,
    f: state.constraintFallback,
    e: state.exampleId,
    i: state.instance,
    l: state.compareLeft,
    r: state.compareRight,
  };
}

function fromWire(value: unknown): PlaygroundState | undefined {
  if (!isRecord(value) || value["v"] !== STATE_VERSION) {
    return undefined;
  }
  const kind = value["k"];
  const fallback = value["f"];
  if (kind !== "typescript" && kind !== "json") {
    return undefined;
  }
  if (fallback !== "description" && fallback !== "strip") {
    return undefined;
  }
  const source = stringField(value, "s");
  if (source === undefined) {
    return undefined;
  }
  const exampleId = stringField(value, "e") ?? DEFAULT_EXAMPLE_ID;
  return {
    version: STATE_VERSION,
    source,
    kind,
    typeName: stringField(value, "n") ?? "",
    optimize: value["o"] === true,
    constraintFallback: fallback,
    exampleId,
    instance: stringField(value, "i") ?? "",
    compareLeft: stringField(value, "l") ?? "openai/responses/structured",
    compareRight: stringField(value, "r") ?? "anthropic/messages/structured",
  };
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(text: string): string {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}
