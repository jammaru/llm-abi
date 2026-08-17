import "./styles.css";
import { runPlayground, validateInstance } from "./compile.ts";
import { applyExample, decodeState, defaultState, encodeState, shareTooLong } from "./state.ts";
import type { PlaygroundState } from "./state.ts";
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

function main(): void {
  const els = elements();
  fillExampleSelect(els.example);
  let state = decodeState(window.location.hash) ?? defaultState();
  writeForm(els, state);
  let timer = 0;

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
