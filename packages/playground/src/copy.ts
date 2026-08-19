import type { Compatibility, Evidence, TargetMaturity } from "llm-abi";
import type { Locale } from "./locale.ts";

export type UiKey =
  | "skip"
  | "tagline"
  | "taglineSub"
  | "inputHeading"
  | "inputLead"
  | "example"
  | "kind"
  | "source"
  | "advanced"
  | "typeName"
  | "optimize"
  | "fallback"
  | "privacy"
  | "resultsHeading"
  | "resultsLeadBefore"
  | "resultsLeadAfter"
  | "legendLossless"
  | "legendRuntime"
  | "legendLossy"
  | "legendUnsupported"
  | "fingerprint"
  | "matrixSummary"
  | "diffSummary"
  | "compareLeft"
  | "compareRight"
  | "validateSummary"
  | "instance"
  | "validate"
  | "shareHeading"
  | "shareButton"
  | "footerBefore"
  | "footerAfter"
  | "documentation"
  | "project"
  | "github"
  | "npm"
  | "language";

export interface Copy {
  readonly documentTitle: string;
  readonly metaDescription: string;
  readonly ui: Record<UiKey, string>;
  readonly themeToLight: string;
  readonly themeToDark: string;
  readonly overviewAria: string;
  readonly compatHint: Record<Compatibility, string>;
  readonly evidenceKind: Record<Evidence, string>;
  readonly maturity: Record<TargetMaturity, string>;
  readonly errorEmptyInput: string;
  readonly errorInvalidJson: string;
  readonly errorInvalidInstance: string;
  readonly errorNoTargets: string;
  readonly instanceValid: string;
  readonly instanceInvalid: string;
  readonly shareTooLong: string;
  readonly shareCopied: string;
  readonly statsNodes: string;
  readonly statsDepth: string;
  readonly statsProperties: string;
  readonly statsDefs: string;
  readonly statsUnusedDefs: string;
  readonly statsConstraints: string;
  readonly statsInputSize: string;
  readonly diagnostics: string;
  readonly diagnosticsEmpty: string;
  readonly loss: string;
  readonly lossLevel: string;
  readonly providerSchema: string;
  readonly matrixEmpty: string;
  readonly matrixCode: string;
  readonly matrixPath: string;
  readonly matrixYes: string;
  readonly diffPick: string;
  readonly diffIdentical: string;
  readonly overviewNoDiagnostics: string;
  readonly evidenceNightly: string;
  readonly rootPath: string;
}

const EN: Copy = {
  documentTitle: "llm-abi playground",
  metaDescription:
    "Paste a TypeScript type or JSON Schema. Compare OpenAI, Anthropic, Gemini, and more as lossless, runtime-safe, lossy, or unsupported — not a compatibility percentage.",
  ui: {
    skip: "Skip to results",
    tagline: "One schema. Every model.",
    taglineSub:
      "Paste a TypeScript type or JSON Schema. See what OpenAI, Claude, Gemini, DeepSeek, and others actually accept.",
    inputHeading: "Input",
    inputLead: "Results update as you type. The schema never leaves this browser.",
    example: "Example",
    kind: "Kind",
    source: "Source",
    advanced: "Type name and options",
    typeName: "Type name (TypeScript)",
    optimize: "Optimize redundant titles",
    fallback: "Constraint fallback",
    privacy:
      "Compilation uses profiles shipped in llm-abi. Tokens are ceil(UTF-8 bytes / 3), a conservative overhead hint, not billing and not a score.",
    resultsHeading: "Results",
    resultsLeadBefore: "Each provider is ",
    resultsLeadAfter: ". There is no compatibility percentage.",
    legendLossless: "kept",
    legendRuntime: "validate()",
    legendLossy: "rewritten",
    legendUnsupported: "cannot represent",
    fingerprint: "Input fingerprint",
    matrixSummary: "Diagnostic matrix",
    diffSummary: "Emitted JSON diff",
    compareLeft: "Left",
    compareRight: "Right",
    validateSummary: "Validate original schema",
    instance: "JSON instance",
    validate: "Validate",
    shareHeading: "Share",
    shareButton: "Copy share URL",
    footerBefore: "Compatibility is ",
    footerAfter: ". llm-abi does not invent percentages. ",
    documentation: "Documentation",
    project: "Project",
    github: "GitHub repository",
    npm: "npm package",
    language: "Language",
  },
  themeToLight: "Switch to light theme",
  themeToDark: "Switch to dark theme",
  overviewAria: "Compatibility overview",
  compatHint: {
    lossless: "Provider schema keeps the input meaning",
    "runtime-safe": "Some constraints need result.validate",
    lossy: "Meaning changed; see diagnostics",
    unsupported: "Cannot represent this construct",
  },
  evidenceKind: {
    documented: "documented",
    "sdk-observed": "sdk-observed",
    empirical: "empirical",
  },
  maturity: {
    supported: "supported",
    partial: "partial",
    experimental: "experimental",
  },
  errorEmptyInput: "Paste a TypeScript type or JSON Schema.",
  errorInvalidJson: "JSON Schema input is not valid JSON",
  errorInvalidInstance: "Instance must be JSON.",
  errorNoTargets: "No compile targets are registered.",
  instanceValid: "Instance is valid against the original schema.",
  instanceInvalid: "Instance failed original-schema validation.",
  shareTooLong:
    "This schema is too large for a URL. Compilation still runs in the browser; copy the source instead.",
  shareCopied: "Share URL copied.",
  statsNodes: "Nodes",
  statsDepth: "Depth",
  statsProperties: "Properties",
  statsDefs: "$defs",
  statsUnusedDefs: "Unused $defs",
  statsConstraints: "Constraints",
  statsInputSize: "Input size",
  diagnostics: "Diagnostics",
  diagnosticsEmpty: "None. The provider schema keeps the input meaning.",
  loss: "Loss",
  lossLevel: "level",
  providerSchema: "Provider schema",
  matrixEmpty: "No diagnostics on any target.",
  matrixCode: "Code",
  matrixPath: "Path",
  matrixYes: "yes",
  diffPick: "Pick two different targets to diff emitted JSON.",
  diffIdentical: "Emitted JSON is identical.",
  overviewNoDiagnostics: "0 diagnostics",
  evidenceNightly: "nightly adapter",
  rootPath: "(root)",
};

const JA: Copy = {
  documentTitle: "llm-abi playground",
  metaDescription:
    "TypeScript の型か JSON Schema を貼ると、OpenAI、Anthropic、Gemini などを lossless / runtime-safe / lossy / unsupported で比較できます。互換性のパーセントはありません。",
  ui: {
    skip: "結果へスキップ",
    tagline: "ひとつのスキーマ。すべてのモデルに。",
    taglineSub:
      "TypeScript の型か JSON Schema を貼ると、OpenAI、Claude、Gemini、DeepSeek などが実際に受け付ける形を確認できます。",
    inputHeading: "入力",
    inputLead: "入力すると結果が更新されます。スキーマがこのブラウザの外に出ることはありません。",
    example: "例",
    kind: "種類",
    source: "ソース",
    advanced: "型名とオプション",
    typeName: "型名（TypeScript）",
    optimize: "冗長な title を最適化する",
    fallback: "制約のフォールバック",
    privacy:
      "コンパイルは llm-abi に同梱されたプロファイルを使います。トークン数は ceil(UTF-8 バイト数 / 3) で、請求用ではなく余裕を見た目安であり、スコアではありません。",
    resultsHeading: "結果",
    resultsLeadBefore: "各プロバイダは ",
    resultsLeadAfter: " のいずれかです。互換性のパーセントはありません。",
    legendLossless: "そのまま",
    legendRuntime: "validate()",
    legendLossy: "書き換え",
    legendUnsupported: "表現できない",
    fingerprint: "入力フィンガープリント",
    matrixSummary: "診断マトリクス",
    diffSummary: "出力 JSON の差分",
    compareLeft: "左",
    compareRight: "右",
    validateSummary: "元スキーマで検証",
    instance: "JSON インスタンス",
    validate: "検証",
    shareHeading: "共有",
    shareButton: "共有 URL をコピー",
    footerBefore: "互換性は ",
    footerAfter: " です。llm-abi はパーセントを作りません。 ",
    documentation: "ドキュメント",
    project: "プロジェクト",
    github: "GitHub リポジトリ",
    npm: "npm パッケージ",
    language: "言語",
  },
  themeToLight: "ライトテーマに切り替え",
  themeToDark: "ダークテーマに切り替え",
  overviewAria: "互換性の一覧",
  compatHint: {
    lossless: "プロバイダスキーマは入力の意味を保っています",
    "runtime-safe": "一部の制約は result.validate が必要です",
    lossy: "意味が変わりました。診断を見てください",
    unsupported: "この構文は表現できません",
  },
  evidenceKind: {
    documented: "ドキュメント",
    "sdk-observed": "SDK観測",
    empirical: "実測",
  },
  maturity: {
    supported: "対応",
    partial: "部分的",
    experimental: "実験的",
  },
  errorEmptyInput: "TypeScript の型か JSON Schema を貼ってください。",
  errorInvalidJson: "JSON Schema の入力が正しい JSON ではありません",
  errorInvalidInstance: "インスタンスは JSON である必要があります。",
  errorNoTargets: "コンパイル対象が登録されていません。",
  instanceValid: "インスタンスは元スキーマに対して妥当です。",
  instanceInvalid: "インスタンスは元スキーマの検証に失敗しました。",
  shareTooLong:
    "このスキーマは URL に入りません。コンパイルはブラウザ内で動きます。ソースをコピーしてください。",
  shareCopied: "共有 URL をコピーしました。",
  statsNodes: "ノード",
  statsDepth: "深さ",
  statsProperties: "プロパティ",
  statsDefs: "$defs",
  statsUnusedDefs: "未使用の $defs",
  statsConstraints: "制約",
  statsInputSize: "入力サイズ",
  diagnostics: "診断",
  diagnosticsEmpty: "なし。プロバイダスキーマは入力の意味を保っています。",
  loss: "損失",
  lossLevel: "レベル",
  providerSchema: "プロバイダスキーマ",
  matrixEmpty: "どのターゲットにも診断はありません。",
  matrixCode: "コード",
  matrixPath: "パス",
  matrixYes: "あり",
  diffPick: "比較するターゲットを2つ選んでください。",
  diffIdentical: "出力された JSON は同一です。",
  overviewNoDiagnostics: "診断なし",
  evidenceNightly: "夜間アダプタ",
  rootPath: "(ルート)",
};

const COPY: Record<Locale, Copy> = { en: EN, ja: JA };

export function copyFor(locale: Locale): Copy {
  return COPY[locale];
}

export function localizePlaygroundError(copy: Copy, code: string, message: string): string {
  if (code === "empty-input") {
    return copy.errorEmptyInput;
  }
  if (code === "invalid-instance") {
    return copy.errorInvalidInstance;
  }
  if (code === "no-targets") {
    return copy.errorNoTargets;
  }
  if (code === "invalid-json") {
    const separator = message.indexOf(": ");
    const detail = separator >= 0 ? message.slice(separator + 2) : "";
    return detail.length > 0 ? `${copy.errorInvalidJson}: ${detail}` : copy.errorInvalidJson;
  }
  return message;
}

export function applyChrome(copy: Copy): void {
  document.title = copy.documentTitle;
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute("content", copy.metaDescription);
  }
  for (const node of document.querySelectorAll("[data-i18n]")) {
    const key = node.getAttribute("data-i18n");
    if (key && isUiKey(key)) {
      node.textContent = copy.ui[key];
    }
  }
  for (const node of document.querySelectorAll("[data-i18n-aria]")) {
    const key = node.getAttribute("data-i18n-aria");
    if (key && isUiKey(key)) {
      node.setAttribute("aria-label", copy.ui[key]);
    }
  }
}

function isUiKey(value: string): value is UiKey {
  return value in EN.ui;
}
