export type ThemePreference = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

/** Keep in sync with `public/theme-boot.js`. */
export const THEME_STORAGE_KEY: string = "llm-abi-theme";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "auto" ? value : "auto";
}

export function resolvedTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return prefersDark ? "dark" : "light";
}

export function nextResolvedTheme(current: ResolvedTheme): ResolvedTheme {
  return current === "light" ? "dark" : "light";
}

export function readStoredPreference(
  storage: Pick<Storage, "getItem"> | undefined,
): ThemePreference {
  if (!storage) {
    return "auto";
  }
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "auto";
  }
}

export function writeStoredPreference(
  storage: Pick<Storage, "setItem"> | undefined,
  preference: ThemePreference,
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* private mode / quota */
  }
}
