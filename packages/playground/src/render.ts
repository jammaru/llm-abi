import type { Diagnostic } from "llm-abi";
import { diagnosticMatrix, diffSchemas } from "./compare.ts";
import type { InstanceCheck, PlaygroundResult, PlaygroundTargetView } from "./compile.ts";
import { EXAMPLES } from "./examples.ts";
import {
  compatibilityHint,
  compatibilityLabel,
  formatBytes,
  formatPath,
  formatTokens,
  prettyJson,
  vendorLabel,
} from "./format.ts";
import type { PlaygroundState } from "./state.ts";
import { shareTooLong } from "./state.ts";

export interface PlaygroundElements {
  readonly source: HTMLTextAreaElement;
  readonly typeName: HTMLInputElement;
  readonly optimize: HTMLInputElement;
  readonly fallback: HTMLSelectElement;
  readonly example: HTMLSelectElement;
  readonly kindJson: HTMLInputElement;
  readonly kindTypescript: HTMLInputElement;
  readonly error: HTMLElement;
  readonly lesson: HTMLElement;
  readonly analysis: HTMLElement;
  readonly targets: HTMLElement;
  readonly matrix: HTMLElement;
  readonly diff: HTMLElement;
  readonly compareLeft: HTMLSelectElement;
  readonly compareRight: HTMLSelectElement;
  readonly instance: HTMLTextAreaElement;
  readonly validateOut: HTMLElement;
  readonly shareStatus: HTMLElement;
  readonly fingerprint: HTMLElement;
}

export function fillExampleSelect(select: HTMLSelectElement): void {
  select.replaceChildren();
  for (const example of EXAMPLES) {
    const option = document.createElement("option");
    option.value = example.id;
    option.textContent = example.title;
    select.append(option);
  }
}

export function fillCompareSelects(
  left: HTMLSelectElement,
  right: HTMLSelectElement,
  targets: readonly PlaygroundTargetView[],
  state: PlaygroundState,
): void {
  fillTargetSelect(left, targets, state.compareLeft);
  fillTargetSelect(right, targets, state.compareRight);
}

export function readForm(els: PlaygroundElements, previous: PlaygroundState): PlaygroundState {
  return {
    ...previous,
    source: els.source.value,
    kind: els.kindTypescript.checked ? "typescript" : "json",
    typeName: els.typeName.value,
    optimize: els.optimize.checked,
    constraintFallback: els.fallback.value === "strip" ? "strip" : "description",
    exampleId: els.example.value,
    instance: els.instance.value,
    compareLeft: els.compareLeft.value || previous.compareLeft,
    compareRight: els.compareRight.value || previous.compareRight,
  };
}

export function writeForm(els: PlaygroundElements, state: PlaygroundState): void {
  els.source.value = state.source;
  els.typeName.value = state.typeName;
  els.optimize.checked = state.optimize;
  els.fallback.value = state.constraintFallback;
  els.example.value = state.exampleId;
  els.kindTypescript.checked = state.kind === "typescript";
  els.kindJson.checked = state.kind === "json";
  els.instance.value = state.instance;
}

export function renderResult(
  els: PlaygroundElements,
  result: PlaygroundResult,
  state: PlaygroundState,
): void {
  if (!result.ok) {
    els.error.hidden = false;
    els.error.textContent = result.message;
    els.lesson.hidden = true;
    els.lesson.textContent = "";
    els.analysis.replaceChildren();
    els.targets.replaceChildren();
    els.matrix.replaceChildren();
    els.diff.replaceChildren();
    els.fingerprint.textContent = "";
    return;
  }
  els.error.hidden = true;
  els.error.textContent = "";
  els.fingerprint.textContent = result.inputFingerprint;
  renderLesson(els.lesson, state);
  renderTargets(els.targets, result.targets);
  renderAnalysis(els.analysis, result);
  fillCompareSelects(els.compareLeft, els.compareRight, result.targets, state);
  renderMatrix(els.matrix, result.targets);
  renderDiff(els.diff, result.targets, state.compareLeft, state.compareRight);
}

export function renderValidation(els: PlaygroundElements, value: InstanceCheck): void {
  els.validateOut.replaceChildren();
  if (value.status === "error") {
    const p = document.createElement("p");
    p.className = "status status-error";
    p.textContent = value.message;
    els.validateOut.append(p);
    return;
  }
  const result = value.result;
  const p = document.createElement("p");
  p.className = result.ok ? "status status-ok" : "status status-error";
  p.textContent = result.ok
    ? "Instance is valid against the original schema."
    : "Instance failed original-schema validation.";
  els.validateOut.append(p);
  if (result.issues.length === 0) {
    return;
  }
  const list = document.createElement("ul");
  list.className = "issue-list";
  for (const issue of result.issues) {
    const item = document.createElement("li");
    item.textContent = `${formatPath(issue.path)}: ${issue.message}`;
    list.append(item);
  }
  els.validateOut.append(list);
}

export function renderShareStatus(els: PlaygroundElements, encoded: string, copied: boolean): void {
  if (shareTooLong(encoded)) {
    els.shareStatus.textContent =
      "This schema is too large for a URL. Compilation still runs in the browser; copy the source instead.";
    return;
  }
  els.shareStatus.textContent = copied ? "Share URL copied." : "";
}

function renderLesson(root: HTMLElement, state: PlaygroundState): void {
  const example = EXAMPLES.find((item) => item.id === state.exampleId);
  if (!example) {
    root.hidden = true;
    root.textContent = "";
    return;
  }
  root.hidden = false;
  root.textContent = example.lesson;
}

function renderAnalysis(root: HTMLElement, result: Extract<PlaygroundResult, { ok: true }>): void {
  const stats = result.analysis.stats;
  root.replaceChildren();
  const dl = document.createElement("dl");
  dl.className = "stats";
  addStat(dl, "Nodes", String(stats.nodes));
  addStat(dl, "Depth", String(stats.depth));
  addStat(dl, "Properties", String(stats.properties));
  addStat(dl, "$defs", String(stats.defs));
  addStat(dl, "Unused $defs", String(stats.unusedDefs));
  addStat(dl, "Constraints", String(stats.constraints));
  addStat(dl, "Input size", `${formatBytes(stats.bytes)} · ${formatTokens(stats.tokens)}`);
  root.append(dl);
}

function renderTargets(root: HTMLElement, targets: readonly PlaygroundTargetView[]): void {
  root.replaceChildren();
  const overview = document.createElement("section");
  overview.className = "target-overview";
  overview.setAttribute("aria-label", "Compatibility overview");
  const cards = document.createElement("div");
  cards.className = "target-cards";
  for (const target of targets) {
    overview.append(renderOverviewItem(target));
    cards.append(renderCard(target));
  }
  root.append(overview, cards);
}

function renderOverviewItem(target: PlaygroundTargetView): HTMLElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "overview-item";
  item.dataset["jumpTarget"] = `target-${target.target.vendor}`;
  item.setAttribute(
    "aria-label",
    `${vendorLabel(target.target.vendor)} ${compatibilityLabel(target.compatibility)}`,
  );
  item.dataset["compatibility"] = target.compatibility;
  const vendor = document.createElement("span");
  vendor.className = "overview-vendor";
  vendor.textContent = vendorLabel(target.target.vendor);
  const result = document.createElement("strong");
  result.className = `overview-result compat-${target.compatibility}`;
  result.textContent = compatibilityLabel(target.compatibility);
  const count = document.createElement("span");
  count.className = "overview-count";
  const first = target.diagnostics[0];
  count.textContent = first
    ? first.code
    : `${String(target.diagnostics.length)} diagnostic${
        target.diagnostics.length === 1 ? "" : "s"
      }`;
  item.append(vendor, result, count);
  return item;
}

function renderCard(target: PlaygroundTargetView): HTMLElement {
  const article = document.createElement("article");
  article.className = "card";
  article.id = `target-${target.target.vendor}`;
  article.dataset["compatibility"] = target.compatibility;

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = vendorLabel(target.target.vendor);
  const id = document.createElement("p");
  id.className = "muted";
  id.textContent = `${target.target.id} · ${target.target.revision}`;
  header.append(title, id);

  const badge = document.createElement("p");
  badge.className = `compat compat-${target.compatibility}`;
  badge.textContent = compatibilityLabel(target.compatibility);

  const meta = document.createElement("p");
  meta.className = "muted card-meta";
  meta.textContent = `${formatBytes(target.size.bytes)} · ${formatTokens(target.size.tokens)} · ${target.fingerprint}`;

  const evidence = document.createElement("p");
  evidence.className = "evidence-line";
  const evidenceUrl = target.target.evidence.source;
  const source = evidenceUrl.startsWith("https://")
    ? document.createElement("a")
    : document.createElement("span");
  if (source instanceof HTMLAnchorElement) {
    source.href = evidenceUrl;
    source.target = "_blank";
    source.rel = "noreferrer";
  }
  source.textContent = target.target.evidence.kind;
  const live = target.target.evidence.live === "nightly" ? " · nightly adapter" : "";
  evidence.append(
    source,
    ` · ${target.target.evidence.lastVerified}${live} · ${target.target.maturity}`,
  );

  const hint = document.createElement("p");
  hint.className = "compat-hint";
  hint.textContent = compatibilityHint(target.compatibility);

  article.append(
    header,
    badge,
    hint,
    evidence,
    meta,
    renderDiagnostics(target.diagnostics),
    renderLoss(target),
  );

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Provider schema";
  const pre = document.createElement("pre");
  pre.textContent = prettyJson(target.schema);
  details.append(summary, pre);
  article.append(details);
  return article;
}

function renderDiagnostics(diagnostics: readonly Diagnostic[]): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  heading.textContent = "Diagnostics";
  section.append(heading);
  if (diagnostics.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "None. The provider schema keeps the input meaning.";
    section.append(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.className = "diag-list";
  for (const diagnostic of diagnostics) {
    const item = document.createElement("li");
    const code = document.createElement("code");
    code.textContent = diagnostic.code;
    const text = document.createElement("span");
    const keyword = diagnostic.keyword ? ` ${diagnostic.keyword}` : "";
    text.textContent = ` ${formatPath(diagnostic.path)}${keyword}: ${diagnostic.message}`;
    item.append(code, text);
    list.append(item);
  }
  section.append(list);
  return section;
}

function renderLoss(target: PlaygroundTargetView): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  heading.textContent = "Loss";
  section.append(heading);
  const level = document.createElement("p");
  level.textContent = `level: ${target.loss.level}`;
  section.append(level);
  if (target.loss.removed.length === 0) {
    return section;
  }
  const list = document.createElement("ul");
  for (const item of target.loss.removed) {
    const li = document.createElement("li");
    li.textContent = `${formatPath(item.path)} ${item.keyword} → ${item.fallback}`;
    list.append(li);
  }
  section.append(list);
  return section;
}

function renderMatrix(root: HTMLElement, targets: readonly PlaygroundTargetView[]): void {
  root.replaceChildren();
  const rows = diagnosticMatrix(targets);
  if (rows.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No diagnostics on any target.";
    root.append(p);
    return;
  }
  const table = document.createElement("table");
  table.className = "matrix";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  appendCell(headRow, "th", "Code");
  appendCell(headRow, "th", "Path");
  for (const target of targets) {
    appendCell(headRow, "th", vendorLabel(target.target.vendor));
  }
  head.append(headRow);
  const body = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    appendCell(tr, "td", row.code);
    appendCell(tr, "td", row.path);
    for (const target of targets) {
      const td = document.createElement("td");
      td.textContent = row.byTarget.get(target.target.id) ? "yes" : "—";
      tr.append(td);
    }
    body.append(tr);
  }
  table.append(head, body);
  root.append(table);
}

function renderDiff(
  root: HTMLElement,
  targets: readonly PlaygroundTargetView[],
  leftId: string,
  rightId: string,
): void {
  root.replaceChildren();
  const left = targets.find((item) => item.target.id === leftId) ?? targets[0];
  const right = targets.find((item) => item.target.id === rightId) ?? targets[1] ?? targets[0];
  if (!left || !right) {
    return;
  }
  if (left.target.id === right.target.id) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Pick two different targets to diff emitted JSON.";
    root.append(p);
    return;
  }
  const diffs = diffSchemas(left.schema, right.schema);
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent = `${left.target.id} vs ${right.target.id}`;
  root.append(intro);
  if (diffs.length === 0) {
    const p = document.createElement("p");
    p.textContent = "Emitted JSON is identical.";
    root.append(p);
    return;
  }
  const table = document.createElement("table");
  table.className = "matrix";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  appendCell(headRow, "th", "Path");
  appendCell(headRow, "th", vendorLabel(left.target.vendor));
  appendCell(headRow, "th", vendorLabel(right.target.vendor));
  head.append(headRow);
  const body = document.createElement("tbody");
  for (const diff of diffs) {
    const tr = document.createElement("tr");
    appendCell(tr, "td", diff.path);
    appendCell(tr, "td", stringifyDiff(diff.left));
    appendCell(tr, "td", stringifyDiff(diff.right));
    body.append(tr);
  }
  table.append(head, body);
  root.append(table);
}

function fillTargetSelect(
  select: HTMLSelectElement,
  targets: readonly PlaygroundTargetView[],
  selected: string,
): void {
  const previous = select.value || selected;
  select.replaceChildren();
  for (const target of targets) {
    const option = document.createElement("option");
    option.value = target.target.id;
    option.textContent = `${vendorLabel(target.target.vendor)} (${compatibilityLabel(target.compatibility)})`;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function addStat(dl: HTMLDListElement, label: string, value: string): void {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  dl.append(dt, dd);
}

function appendCell(row: HTMLTableRowElement, kind: "th" | "td", text: string): void {
  const cell = document.createElement(kind);
  cell.textContent = text;
  row.append(cell);
}

function stringifyDiff(value: unknown): string {
  if (value === undefined) {
    return "∅";
  }
  return JSON.stringify(value);
}
