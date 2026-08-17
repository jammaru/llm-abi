import type { Compatibility } from "../../../core/src/types.ts";

export type LiveOutcome = "accepted" | "rejected" | "skipped";

export interface LiveRow {
  readonly fixture: string;
  readonly target: string;
  readonly compile: Compatibility | "n/a";
  readonly live: LiveOutcome;
  readonly reason: string;
}

export interface LiveRunResult {
  readonly rows: readonly LiveRow[];
  readonly rejected: number;
  readonly skipped: number;
  readonly accepted: number;
}

export interface LiveEnv {
  readonly [name: string]: string | undefined;
}

export interface LiveHttpResult {
  readonly status: number;
  readonly body: string;
}

export interface LiveTransport {
  readonly env: LiveEnv;
  readonly eventName: string;
  readonly fetch: (
    input: string,
    init: {
      readonly method: string;
      readonly headers: Record<string, string>;
      readonly body: string;
    },
  ) => Promise<LiveHttpResult>;
  readonly readFixture: (name: string) => unknown;
  readonly fixtureNames: readonly string[];
}

export const LIVE_FIXTURES: readonly string[] = [
  "object-basic.json",
  "optional.json",
  "enum.json",
  "min-length.json",
  "one-of.json",
  "defs-ref.json",
];
