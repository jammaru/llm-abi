import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { copyFor, localizePlaygroundError } from "../src/copy.ts";
import {
  detectLocale,
  LOCALE_STORAGE_KEY,
  parseLocale,
  readStoredLocale,
  resolveLocale,
  writeStoredLocale,
} from "../src/locale.ts";
import { EXAMPLES } from "../src/examples.ts";

describe("playground locale", () => {
  it("accepts only en and ja", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("ja")).toBe("ja");
    expect(parseLocale("fr")).toBeUndefined();
    expect(parseLocale(null)).toBeUndefined();
  });

  it("detects Japanese from navigator languages", () => {
    expect(detectLocale(["en-US", "ja"])).toBe("ja");
    expect(detectLocale(["ja-JP"])).toBe("ja");
    expect(detectLocale(["en-US", "en"])).toBe("en");
  });

  it("prefers stored locale over detection", () => {
    expect(resolveLocale("en", ["ja-JP"])).toBe("en");
    expect(resolveLocale(undefined, ["ja-JP"])).toBe("ja");
  });

  it("reads and writes the shared storage key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
    };
    expect(readStoredLocale(undefined)).toBeUndefined();
    writeStoredLocale(storage, "ja");
    expect(store.get(LOCALE_STORAGE_KEY)).toBe("ja");
    expect(readStoredLocale(storage)).toBe("ja");
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: (): string => {
        throw new Error("blocked");
      },
      setItem: (): void => {
        throw new Error("blocked");
      },
    };
    expect(readStoredLocale(broken)).toBeUndefined();
    expect(() => writeStoredLocale(broken, "ja")).not.toThrow();
  });

  it("keeps the boot script on the same storage key", () => {
    const bootPath = fileURLToPath(new URL("../public/locale-boot.js", import.meta.url));
    expect(readFileSync(bootPath, "utf8")).toContain(LOCALE_STORAGE_KEY);
  });

  it("keeps English and Japanese chrome keys aligned", () => {
    expect(Object.keys(copyFor("ja").ui).toSorted()).toEqual(
      Object.keys(copyFor("en").ui).toSorted(),
    );
  });

  it("does not invent a compatibility percentage", () => {
    for (const locale of ["en", "ja"] as const) {
      const copy = copyFor(locale);
      expect(copy.compatHint.lossless).not.toMatch(/%|percent|score|スコア/i);
      expect(copy.compatHint["runtime-safe"]).not.toMatch(/%|percent|score|スコア/i);
      expect(copy.ui.resultsLeadAfter).toMatch(/percent|パーセント/i);
    }
  });

  it("localizes playground input errors by code", () => {
    const ja = copyFor("ja");
    expect(
      localizePlaygroundError(ja, "empty-input", "Paste a TypeScript type or JSON Schema."),
    ).toBe(ja.errorEmptyInput);
    expect(
      localizePlaygroundError(
        ja,
        "invalid-json",
        "JSON Schema input is not valid JSON: Unexpected token",
      ),
    ).toBe(`${ja.errorInvalidJson}: Unexpected token`);
    expect(localizePlaygroundError(ja, "unknown-core", "Type parse failed")).toBe(
      "Type parse failed",
    );
  });

  it("gives every example English and Japanese titles", () => {
    for (const example of EXAMPLES) {
      expect(example.title.en.length).toBeGreaterThan(0);
      expect(example.title.ja.length).toBeGreaterThan(0);
      expect(example.lesson.en.length).toBeGreaterThan(0);
      expect(example.lesson.ja.length).toBeGreaterThan(0);
    }
  });
});
