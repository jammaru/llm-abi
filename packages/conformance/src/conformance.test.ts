import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compile } from "../../core/src/compile.ts";
import { listTargets } from "../../core/src/targets/registry.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("conformance fixtures", () => {
  const files = readdirSync(fixturesDir).filter((name) => name.endsWith(".json"));
  const targets = listTargets().map((target) => target.id);

  it("discovers fixtures", () => {
    expect(files.length).toBeGreaterThanOrEqual(30);
  });

  it("keeps a stable compatibility matrix", () => {
    const matrix: Record<string, Record<string, string>> = {};
    for (const file of files.toSorted()) {
      const schema = JSON.parse(readFileSync(join(fixturesDir, file), "utf8"));
      matrix[file] = {};
      for (const target of targets.toSorted()) {
        matrix[file]![target] = compile(schema, target).compatibility;
      }
    }
    expect(matrix).toMatchSnapshot();
  });

  for (const file of files) {
    for (const target of targets) {
      it(`${file} compiles for ${target}`, () => {
        const schema = JSON.parse(readFileSync(join(fixturesDir, file), "utf8"));
        const result = compile(schema, target);
        expect(result.schema === false || typeof result.schema === "object").toBe(true);
        expect(result.fingerprint.startsWith("sha256:")).toBe(true);
        expect(["lossless", "runtime-safe", "lossy", "unsupported"]).toContain(
          result.compatibility,
        );
      });
    }
  }
});
