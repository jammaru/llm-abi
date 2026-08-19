import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles.css";
import { runPlayground, validateInstance } from "./compile.ts";
import { applyExample, decodeState, defaultState, encodeState, shareTooLong } from "./state.ts";
import type { PlaygroundState } from "./state.ts";
import {
  nextResolvedTheme,
  readStoredPreference,
  resolvedTheme,
  writeStoredPreference,
  type ResolvedTheme,
} from "./theme.ts";
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

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function currentResolved(): ResolvedTheme {
  return resolvedTheme(readStoredPreference(window.localStorage), prefersDark());
}

function paintTheme(resolved: ResolvedTheme): void {
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
    button.setAttribute("aria-pressed", dark ? "true" : "false");
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
}

function bindTheme(): void {
  paintTheme(currentResolved());
  requiredElement<HTMLButtonElement>("theme-toggle").addEventListener("click", () => {
    const next = nextResolvedTheme(currentResolved());
    writeStoredPreference(window.localStorage, next);
    paintTheme(next);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readStoredPreference(window.localStorage) === "auto") {
      paintTheme(currentResolved());
    }
  });
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
        ? "1. Paste one JSON Schema"
        : scene === "diag"
          ? "3. Diagnostics explain the rewrite"
          : "2. Compare every provider";
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
  if (!demo) {
    bindTheme();
  }
  const els = elements();
  fillExampleSelect(els.example);
  let state = decodeState(window.location.hash) ?? defaultState();
  writeForm(els, state);
  let timer = 0;
  syncDetailsForViewport();
  window.matchMedia("(max-width: 700px)").addEventListener("change", syncDetailsForViewport);
  window.matchMedia("(max-height: 740px)").addEventListener("change", syncDetailsForViewport);

  const refresh = (next: PlaygroundState): void => {
    state = next;
    const result = runPlayground(state.source, compileOptions(state));
    renderResult(els, result, state);
    syncHash(state);
  };

  const schedule = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      refresh(readForm(els, state));
    }, DEBOUNCE_MS);
  };

  els.source.addEventListener("input", schedule);
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
    );
  });
  requiredElement<HTMLButtonElement>("share").addEventListener("click", async () => {
    const current = readForm(els, state);
    state = current;
    const encoded = encodeState(current);
    renderShareStatus(els, encoded, false);
    if (shareTooLong(encoded)) {
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      renderShareStatus(els, encoded, true);
    } catch {
      els.shareStatus.textContent = url;
    }
  });

  refresh(state);
}

main();
