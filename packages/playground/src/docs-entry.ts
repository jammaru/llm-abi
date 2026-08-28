import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";
import "./docs.css";
import { applyChrome, copyFor } from "./copy.ts";
import {
  applyStoredLocale,
  bindLocaleRadios,
  bindTheme,
  currentResolved,
  paintLocale,
  paintTheme,
} from "./chrome.ts";
import { readStoredLocale, resolveLocale, type Locale } from "./locale.ts";

function main(): void {
  let locale: Locale = resolveLocale(
    readStoredLocale(window.localStorage),
    navigator.languages.length > 0 ? [...navigator.languages] : [navigator.language],
  );
  bindTheme(() => locale);
  paintLocale(locale);
  applyChrome(copyFor(locale));
  bindLocaleRadios((next) => {
    locale = next;
    applyStoredLocale(next);
    paintTheme(currentResolved(), next);
  });
}

main();
