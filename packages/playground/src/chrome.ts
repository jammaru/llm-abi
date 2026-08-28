import { applyChrome, copyFor } from "./copy.ts";
import {
  nextResolvedTheme,
  readStoredPreference,
  resolvedTheme,
  writeStoredPreference,
  type ResolvedTheme,
} from "./theme.ts";
import { writeStoredLocale, type Locale } from "./locale.ts";

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function currentResolved(): ResolvedTheme {
  return resolvedTheme(readStoredPreference(window.localStorage), prefersDark());
}

export function paintTheme(resolved: ResolvedTheme, locale: Locale): void {
  document.documentElement.dataset.theme = resolved;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", resolved === "dark" ? "#0f1115" : "#ffffff");
  }
  const toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.setAttribute("data-mode", resolved);
  }
  const button = document.getElementById("theme-toggle");
  if (button instanceof HTMLButtonElement) {
    const dark = resolved === "dark";
    const copy = copyFor(locale);
    button.setAttribute("aria-pressed", dark ? "true" : "false");
    button.setAttribute("aria-label", dark ? copy.themeToLight : copy.themeToDark);
  }
}

export function paintLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  const en = document.getElementById("locale-en");
  const ja = document.getElementById("locale-ja");
  if (en instanceof HTMLInputElement) {
    en.checked = locale === "en";
  }
  if (ja instanceof HTMLInputElement) {
    ja.checked = locale === "ja";
  }
}

export function bindTheme(localeOf: () => Locale): void {
  paintTheme(currentResolved(), localeOf());
  const button = document.getElementById("theme-toggle");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Missing element #theme-toggle");
  }
  button.addEventListener("click", () => {
    const next = nextResolvedTheme(currentResolved());
    writeStoredPreference(window.localStorage, next);
    paintTheme(next, localeOf());
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readStoredPreference(window.localStorage) === "auto") {
      paintTheme(currentResolved(), localeOf());
    }
  });
}

export function bindLocaleRadios(setLocale: (locale: Locale) => void): void {
  const en = document.getElementById("locale-en");
  const ja = document.getElementById("locale-ja");
  if (!(en instanceof HTMLInputElement) || !(ja instanceof HTMLInputElement)) {
    throw new Error("Missing locale radios");
  }
  en.addEventListener("change", () => {
    setLocale("en");
  });
  ja.addEventListener("change", () => {
    setLocale("ja");
  });
}

export function applyStoredLocale(locale: Locale): void {
  writeStoredLocale(window.localStorage, locale);
  paintLocale(locale);
  applyChrome(copyFor(locale));
}
