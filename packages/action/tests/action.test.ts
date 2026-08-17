import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCheck } from "../src/cli.ts";
import {
  assertGitRef,
  isInsideWorkspace,
  matchesPatterns,
  parseDiffOutput,
  unmatchedLiteralPatterns,
  workspaceRelativeDirectory,
} from "../src/git.ts";
import { assertIssueNumber, assertRepository, resolveGithubApiUrl } from "../src/github.ts";
import { readInputs } from "../src/io.ts";
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

  it("parses copied files and ignores incomplete renames", () => {
    expect(parseDiffOutput("C80\tschemas/src.json\tschemas/copy.json\nR100\tbroken\n")).toEqual([
      {
        path: "schemas/copy.json",
        basePath: "schemas/src.json",
        status: "copied",
      },
    ]);
  });

  it("rejects a working-directory outside the workspace", () => {
    expect(() => workspaceRelativeDirectory("/workspace", "..")).toThrow(
      /working-directory must be inside/,
    );
    expect(isInsideWorkspace("/workspace", "/workspace/schemas")).toBe(true);
    expect(isInsideWorkspace("/workspace", "/workspace-other/schemas")).toBe(false);
  });

  it("rejects git refs that look like options or path traversal", () => {
    expect(() => assertGitRef("--upload-pack=evil", "base-ref")).toThrow(/Invalid base-ref/);
    expect(() => assertGitRef("abc..def", "base-ref")).toThrow(/Invalid base-ref/);
    expect(assertGitRef("origin/main", "base-ref")).toBe("origin/main");
  });

  it("treats missing literal schema paths as an error", () => {
    expect(unmatchedLiteralPatterns(["schema.json", "schemas/**/*.json"], [])).toEqual([
      "schema.json",
    ]);
    expect(unmatchedLiteralPatterns(["schema.json"], ["schema.json"])).toEqual([]);
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

  it("keeps colliding vendor labels unique", () => {
    const report = renderReport(
      buildResults([
        {
          path: "schema.json",
          current: {
            fingerprint: "fp",
            targets: [
              { id: "openai/responses/structured", compatibility: "lossless" },
              { id: "openai/chat/structured", compatibility: "lossy" },
            ],
          },
        },
      ]),
    );
    expect(report).toContain("openai/responses/structured");
    expect(report).toContain("openai/chat/structured");
    expect(report).not.toContain("| OpenAI | OpenAI |");
  });
});

describe("action inputs", () => {
  it("reads hyphenated GitHub Action inputs", () => {
    expect(
      readInputs({
        "INPUT_SCHEMA-FILES": "schemas/a.json\nschemas/b.json",
        "INPUT_CHANGED-ONLY": "false",
        "INPUT_WORKING-DIRECTORY": "schemas",
        "INPUT_BASE-REF": "abc123",
        INPUT_COMMENT: "true",
        "INPUT_GITHUB-TOKEN": "tok",
      }),
    ).toEqual({
      patterns: ["schemas/a.json", "schemas/b.json"],
      changedOnly: false,
      workingDirectory: "schemas",
      baseRef: "abc123",
      comment: true,
      githubToken: "tok",
    });
  });

  it("rejects invalid boolean inputs", () => {
    expect(() => readInputs({ "INPUT_CHANGED-ONLY": "bogus" })).toThrow(
      /changed-only must be true or false/,
    );
  });
});

describe("action GitHub client", () => {
  it("accepts only https API URLs and owner/repo names", () => {
    expect(resolveGithubApiUrl(undefined)).toBe("https://api.github.com");
    expect(resolveGithubApiUrl("https://ghe.example/api/v3/")).toBe("https://ghe.example/api/v3");
    expect(() => resolveGithubApiUrl("http://example.com")).toThrow(/https/);
    expect(() => assertRepository("../evil/repo")).toThrow(/GITHUB_REPOSITORY/);
    expect(assertRepository("jammaru/llm-abi")).toBe("jammaru/llm-abi");
    expect(() => assertIssueNumber(0)).toThrow(/pull request number/);
  });
});

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "llm-abi-action-test-"));
  temporaryDirectories.push(directory);
  return directory;
}
