import { describe, expect, it } from "vitest";
import { firstSecret } from "./live/adapters.ts";
import { classifyLiveHttp, redact } from "./live/classify.ts";
import { renderLiveReport } from "./live/report.ts";
import { runLive } from "./live/run.ts";
import type { LiveHttpResult, LiveTransport } from "./live/types.ts";

const objectBasic = {
  type: "object",
  properties: {
    id: { type: "string" },
    count: { type: "integer", minimum: 0 },
  },
  required: ["id", "count"],
  additionalProperties: false,
};

const oneOf = {
  type: "object",
  properties: {
    value: { oneOf: [{ type: "string" }, { type: "number" }] },
  },
  required: ["value"],
};

function transport(options: {
  readonly eventName?: string;
  readonly env?: Record<string, string | undefined>;
  readonly fixtures?: Record<string, unknown>;
  readonly http?: LiveHttpResult | ((input: string) => LiveHttpResult | Promise<LiveHttpResult>);
  readonly onFetch?: (
    input: string,
    init: {
      readonly method: string;
      readonly headers: Record<string, string>;
      readonly body: string;
    },
  ) => void;
}): LiveTransport {
  const fixtures = options.fixtures ?? { "object-basic.json": objectBasic };
  return {
    env: options.env ?? {},
    eventName: options.eventName ?? "schedule",
    fixtureNames: Object.keys(fixtures).toSorted(),
    readFixture(name) {
      return fixtures[name];
    },
    async fetch(input, init): Promise<LiveHttpResult> {
      options.onFetch?.(input, init);
      const http =
        typeof options.http === "function"
          ? await options.http(input)
          : (options.http ?? { status: 200, body: "{}" });
      return http;
    },
  };
}

describe("live conformance", () => {
  it("never calls a provider on pull requests", async () => {
    let called = 0;
    const result = await runLive(
      transport({
        eventName: "pull_request",
        env: { OPENAI_API_KEY: "sk-test" },
        onFetch() {
          called += 1;
        },
      }),
    );
    expect(called).toBe(0);
    expect(result.rows[0]?.reason).toContain("pull requests");
    expect(result.rejected).toBe(0);
  });

  it("skips a target when its secret is missing", async () => {
    let called = 0;
    const result = await runLive(
      transport({
        env: {},
        onFetch() {
          called += 1;
        },
      }),
    );
    expect(called).toBe(0);
    expect(result.rows.every((row) => row.live === "skipped")).toBe(true);
    expect(result.rows.some((row) => row.reason.includes("missing secret"))).toBe(true);
    expect(result.rejected).toBe(0);
  });

  it("skips live calls when compile is unsupported", async () => {
    let called = 0;
    const result = await runLive(
      transport({
        env: {},
        fixtures: { "one-of.json": oneOf },
        onFetch() {
          called += 1;
        },
      }),
    );
    const gemini = result.rows.find((row) => row.target === "google/gemini/structured");
    expect(called).toBe(0);
    expect(gemini?.compile).toBe("unsupported");
    expect(gemini?.live).toBe("skipped");
    expect(gemini?.reason).toBe("compile unsupported");
  });

  it("records accepted when the API returns 2xx", async () => {
    const urls: string[] = [];
    const result = await runLive(
      transport({
        env: { OPENAI_API_KEY: "sk-test" },
        http: { status: 200, body: "{}" },
        onFetch(input) {
          urls.push(input);
        },
      }),
    );
    const openai = result.rows.find((row) => row.target === "openai/responses/structured");
    expect(openai?.live).toBe("accepted");
    expect(result.accepted).toBe(1);
    expect(urls.some((url) => url.includes("api.openai.com"))).toBe(true);
  });

  it("records rejected when the API returns 400 for a compiled schema", async () => {
    const result = await runLive(
      transport({
        env: { OPENAI_API_KEY: "sk-test" },
        http: { status: 400, body: "invalid schema sk-test" },
      }),
    );
    const openai = result.rows.find((row) => row.target === "openai/responses/structured");
    expect(openai?.live).toBe("rejected");
    expect(openai?.reason).not.toContain("sk-test");
    expect(openai?.reason).toContain("[redacted]");
    expect(result.rejected).toBe(1);
  });

  it("skips rate limits instead of treating them as schema rejection", async () => {
    const result = await runLive(
      transport({
        env: { ANTHROPIC_API_KEY: "ant-test" },
        http: { status: 429, body: "slow down" },
      }),
    );
    const anthropic = result.rows.find((row) => row.target === "anthropic/messages/structured");
    expect(anthropic?.live).toBe("skipped");
    expect(anthropic?.reason).toBe("rate-limited");
    expect(result.rejected).toBe(0);
  });

  it("sends the compiled schema in the OpenAI Responses field", async () => {
    let body = "";
    await runLive(
      transport({
        env: { OPENAI_API_KEY: "sk-test" },
        http: { status: 200, body: "{}" },
        onFetch(_input, init) {
          body = init.body;
        },
      }),
    );
    expect(body).toContain("json_schema");
    expect(body).toContain("strict");
    const payload = JSON.parse(body) as { text: { format: { schema: { type?: string } } } };
    expect(payload.text.format.schema.type).toBe("object");
  });

  it("renders counts without a percentage", () => {
    const report = renderLiveReport({
      rows: [
        {
          fixture: "object-basic.json",
          target: "openai/responses/structured",
          compile: "lossless",
          live: "accepted",
          reason: "HTTP 200",
        },
      ],
      accepted: 1,
      rejected: 0,
      skipped: 0,
    });
    expect(report).toContain("accepted 1");
    expect(report).not.toContain("%");
  });

  it("reads the first configured secret name", () => {
    expect(firstSecret({ GOOGLE_API_KEY: "g" }, ["GEMINI_API_KEY", "GOOGLE_API_KEY"])).toBe("g");
    expect(firstSecret({}, ["OPENAI_API_KEY"])).toBeUndefined();
  });

  it("classifies unauthorized and server errors as skipped", () => {
    expect(classifyLiveHttp({ status: 401, body: "no" }).live).toBe("skipped");
    expect(classifyLiveHttp({ status: 503, body: "down" }).live).toBe("skipped");
    expect(classifyLiveHttp({ status: 400, body: "bad schema" }).live).toBe("rejected");
  });

  it("redacts secrets in error text", () => {
    expect(redact("token sk-secret leaked", ["sk-secret"])).toBe("token [redacted] leaked");
  });
});
