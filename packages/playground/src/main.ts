import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";
import { runPlayground, validateInstance } from "./compile.ts";
import { bindLocaleRadios, bindTheme, currentResolved, paintLocale, paintTheme } from "./chrome.ts";
import { applyChrome, copyFor } from "./copy.ts";
import { applyExample, decodeState, defaultState, encodeState, shareTooLong } from "./state.ts";
import type { PlaygroundState } from "./state.ts";
import { readStoredLocale, resolveLocale, writeStoredLocale, type Locale } from "./locale.ts";
import {
  fillExampleSelect,
  readForm,
  renderResult,
  renderShareStatus,
  renderValidation,
  writeForm,
  type PlaygroundElements,
} from "./render.ts";

const DEBOUNCE_MS: number = 80;

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

function elements(): PlaygroundElements {
  return {
    source: requiredElement("source"),
    typeName: requiredElement("type-name"),
    optimize: requiredElement("optimize"),
    fallback: requiredElement("fallback"),
    example: requiredElement("example"),
    kindJson: requiredElement("kind-json"),
    kindTypescript: requiredElement("kind-ts"),
    error: requiredElement("error"),
    lesson: requiredElement("lesson"),
    analysis: requiredElement("analysis"),
    targets: requiredElement("targets"),
    matrix: requiredElement("matrix"),
    diff: requiredElement("diff"),
    compareLeft: requiredElement("compare-left"),
    compareRight: requiredElement("compare-right"),
    instance: requiredElement("instance"),
    validateOut: requiredElement("validate-out"),
    shareStatus: requiredElement("share-status"),
    fingerprint: requiredElement("fingerprint"),
    localDoctor: requiredElement("local-doctor"),
    localImport: requiredElement("local-import"),
  };
}

function compileOptions(
  state: PlaygroundState,
): Pick<PlaygroundState, "kind" | "typeName" | "optimize" | "constraintFallback"> {
  return {
    kind: state.kind,
    typeName: state.typeName,
    optimize: state.optimize,
    constraintFallback: state.constraintFallback,
  };
}

function syncHash(state: PlaygroundState): void {
  const encoded = encodeState(state);
  if (shareTooLong(encoded)) {
    return;
  }
  const next = `#${encoded}`;
  if (window.location.hash !== next) {
    history.replaceState(null, "", next);
  }
}

function applyDemoMode(): boolean {
  const scene = new URLSearchParams(window.location.search).get("demo");
  if (!scene) {
    return false;
  }
  document.body.classList.add("demo-mode");
  document.body.dataset["demo"] = scene;
  document.documentElement.dataset.theme = "light";
  const caption = document.getElementById("demo-caption");
  if (caption) {
    caption.hidden = false;
    caption.textContent =
      scene === "schema"
        ? "1. One schema with oneOf"
        : scene === "diag"
          ? "3. Every rewrite is diagnosed"
          : "2. OpenAI: lossy. Gemini: unsupported.";
  }
  return true;
}

function syncDetailsForViewport(): void {
  const compact = window.matchMedia("(max-width: 700px), (max-height: 740px)").matches;
  const demo = document.body.classList.contains("demo-mode");
  const advanced = document.getElementById("advanced-input");
  if (advanced instanceof HTMLDetailsElement) {
    advanced.open = !compact && !demo;
  }
  for (const id of ["matrix-details", "diff-details", "validate-details"]) {
    const details = document.getElementById(id);
    if (details instanceof HTMLDetailsElement) {
      details.open = false;
    }
  }
}

function main(): void {
  const demo = applyDemoMode();
  const els = elements();
  let locale: Locale = resolveLocale(
    readStoredLocale(window.localStorage),
    navigator.languages.length > 0 ? [...navigator.languages] : [navigator.language],
  );
  if (demo) {
    locale = "en";
  } else {
    bindTheme(() => locale);
  }
  paintLocale(locale);
  applyChrome(copyFor(locale));
  fillExampleSelect(els.example, locale);
  let state = decodeState(window.location.hash) ?? defaultState();
  writeForm(els, state);
  let timer = 0;
  syncDetailsForViewport();
  window.matchMedia("(max-width: 700px)").addEventListener("change", syncDetailsForViewport);
  window.matchMedia("(max-height: 740px)").addEventListener("change", syncDetailsForViewport);

  const refresh = (next: PlaygroundState): void => {
    state = next;
    const copy = copyFor(locale);
    const result = runPlayground(state.source, compileOptions(state));
    renderResult(els, result, state, copy, locale);
    syncHash(state);
  };

  const setLocale = (next: Locale): void => {
    locale = next;
    writeStoredLocale(window.localStorage, next);
    paintLocale(next);
    applyChrome(copyFor(next));
    fillExampleSelect(els.example, next);
    els.example.value = state.exampleId;
    if (!demo) {
      paintTheme(currentResolved(), next);
    }
    refresh(state);
  };

  if (!demo) {
    bindLocaleRadios(setLocale);
  }

  const schedule = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      refresh(readForm(els, state));
    }, DEBOUNCE_MS);
  };

  els.source.addEventListener("input", schedule);
  els.localDoctor.addEventListener("input", schedule);
  els.typeName.addEventListener("input", schedule);
  els.optimize.addEventListener("change", schedule);
  els.fallback.addEventListener("change", schedule);
  els.kindJson.addEventListener("change", schedule);
  els.kindTypescript.addEventListener("change", schedule);
  els.compareLeft.addEventListener("change", schedule);
  els.compareRight.addEventListener("change", schedule);
  els.instance.addEventListener("input", () => {
    state = readForm(els, state);
    syncHash(state);
  });
  els.example.addEventListener("change", () => {
    const selected = applyExample(readForm(els, state), els.example.value);
    writeForm(els, selected);
    refresh(selected);
  });
  els.targets.addEventListener("click", (event) => {
    const item =
      event.target instanceof Element ? event.target.closest("[data-jump-target]") : null;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    const jumpTarget = item.dataset["jumpTarget"];
    if (!jumpTarget) {
      return;
    }
    document.getElementById(jumpTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  requiredElement<HTMLButtonElement>("validate").addEventListener("click", () => {
    const current = readForm(els, state);
    state = current;
    renderValidation(
      els,
      validateInstance(current.source, compileOptions(current), current.instance),
      copyFor(locale),
    );
  });
  requiredElement<HTMLButtonElement>("share").addEventListener("click", async () => {
    const current = readForm(els, state);
    state = current;
    const encoded = encodeState(current);
    renderShareStatus(els, encoded, false, copyFor(locale));
    if (shareTooLong(encoded)) {
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      renderShareStatus(els, encoded, true, copyFor(locale));
    } catch {
      els.shareStatus.textContent = url;
    }
  });

  refresh(state);
}

main();
