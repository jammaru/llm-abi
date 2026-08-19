export type Locale = "en" | "ja";

/** Keep in sync with `public/locale-boot.js`. */
export const LOCALE_STORAGE_KEY: string = "llm-abi-locale";

export function parseLocale(value: unknown): Locale | undefined {
  return value === "en" || value === "ja" ? value : undefined;
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (language.toLowerCase().startsWith("ja")) {
      return "ja";
    }
  }
  return "en";
}

export function resolveLocale(stored: Locale | undefined, languages: readonly string[]): Locale {
  return stored ?? detectLocale(languages);
}

export function readStoredLocale(
  storage: Pick<Storage, "getItem"> | undefined,
): Locale | undefined {
  if (!storage) {
    return undefined;
  }
  try {
    return parseLocale(storage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

export function writeStoredLocale(
  storage: Pick<Storage, "setItem"> | undefined,
  locale: Locale,
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode / quota */
  }
}
