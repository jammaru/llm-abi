import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCheck } from "../src/cli.ts";
import { matchesPatterns, parseDiffOutput } from "../src/git.ts";
import { buildResults, COMMENT_MARKER, exitCodeFor, renderReport } from "../src/render.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("action file selection", () => {
  it("matches positive and negative schema patterns", () => {
    const patterns = ["schemas/**/*.json", "!schemas/generated/**"];
    expect(matchesPatterns("schemas/user.json", patterns)).toBe(true);
    expect(matchesPatterns("schemas/generated/user.json", patterns)).toBe(false);
    expect(matchesPatterns("package.json", patterns)).toBe(false);
  });

  it("preserves the old path for renamed schemas", () => {
    expect(parseDiffOutput("R100\tschemas/old.json\tschemas/new.json\n")).toEqual([
      {
        path: "schemas/new.json",
        basePath: "schemas/old.json",
        status: "renamed",
      },
    ]);
  });
});

describe("action CLI wrapper", () => {
  it("accepts exit one only for a valid unsupported result", () => {
    const directory = createTemporaryDirectory();
    const cli = join(directory, "cli.mjs");
    writeFileSync(
      cli,
      `process.stdout.write(JSON.stringify({ fingerprint: "abc", results: [{ target: { id: "provider/mode" }, compatibility: "unsupported" }] })); process.exitCode = 1;`,
      "utf8",
    );
    expect(runCheck(cli, "schema.json", directory)).toEqual({
      fingerprint: "abc",
      targets: [{ id: "provider/mode", compatibility: "unsupported" }],
    });
  });

  it("treats an unparseable CLI failure as an operational error", () => {
    const directory = createTemporaryDirectory();
    const cli = join(directory, "cli.mjs");
    writeFileSync(cli, `process.stderr.write("invalid schema"); process.exitCode = 1;`, "utf8");
    expect(() => runCheck(cli, "schema.json", directory)).toThrow("invalid schema");
  });
});

describe("action report", () => {
  it("fails only when a current target is unsupported", () => {
    const supported = buildResults([
      {
        path: "schema.json",
        current: {
          fingerprint: "new",
          targets: [
            { id: "a", compatibility: "runtime-safe" },
            { id: "b", compatibility: "lossy" },
          ],
        },
      },
    ]);
    expect(exitCodeFor(supported)).toBe(0);

    const unsupported = buildResults([
      ...supported.files,
      {
        path: "other.json",
        current: {
          fingerprint: "other",
          targets: [{ id: "c", compatibility: "unsupported" }],
        },
      },
    ]);
    expect(exitCodeFor(unsupported)).toBe(1);
  });

  it("renders discrete compatibility and an idempotent comment marker", () => {
    const report = renderReport(
      buildResults([
        {
          path: "schemas/user.json",
          base: {
            fingerprint: "old",
            targets: [{ id: "openai/responses/structured", compatibility: "lossless" }],
          },
          current: {
            fingerprint: "new",
            targets: [{ id: "openai/responses/structured", compatibility: "lossy" }],
          },
        },
      ]),
      true,
    );
    expect(report).toContain(COMMENT_MARKER);
    expect(report).toContain("lossless → lossy");
    expect(report).toContain("`old` → `new`");
    expect(report).not.toContain("%");
  });
});

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "llm-abi-action-test-"));
  temporaryDirectories.push(directory);
  return directory;
}
