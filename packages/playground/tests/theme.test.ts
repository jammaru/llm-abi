import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  nextResolvedTheme,
  parseThemePreference,
  readStoredPreference,
  resolvedTheme,
  THEME_STORAGE_KEY,
  writeStoredPreference,
} from "../src/theme.ts";

describe("playground theme", () => {
  it("treats unknown storage values as auto", () => {
    expect(parseThemePreference("sepia")).toBe("auto");
    expect(parseThemePreference(null)).toBe("auto");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("resolves auto from the platform preference", () => {
    expect(resolvedTheme("auto", true)).toBe("dark");
    expect(resolvedTheme("auto", false)).toBe("light");
    expect(resolvedTheme("light", true)).toBe("light");
  });

  it("toggles only between resolved light and dark", () => {
    expect(nextResolvedTheme("light")).toBe("dark");
    expect(nextResolvedTheme("dark")).toBe("light");
  });

  it("reads and writes the shared storage key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
    };
    expect(readStoredPreference(undefined)).toBe("auto");
    writeStoredPreference(storage, "dark");
    expect(store.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredPreference(storage)).toBe("dark");
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
    expect(readStoredPreference(broken)).toBe("auto");
    expect(() => writeStoredPreference(broken, "light")).not.toThrow();
  });

  it("keeps the boot script on the same storage key", () => {
    const bootPath = fileURLToPath(new URL("../public/theme-boot.js", import.meta.url));
    expect(readFileSync(bootPath, "utf8")).toContain(THEME_STORAGE_KEY);
  });
});
