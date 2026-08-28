export type DocLocale = "en" | "ja";

export interface LocalizedText {
  readonly en: string;
  readonly ja: string;
}

export interface DocPage {
  readonly slug: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly nav: LocalizedText;
  readonly source: LocalizedText;
}

export const DOC_LOCALES: readonly DocLocale[] = ["en", "ja"];

export const SITE_ORIGIN: string = "https://llm-abi.pages.dev";

export const DOC_PAGES: readonly DocPage[] = [
  {
    slug: "",
    title: { en: "Guide", ja: "ガイド" },
    description: {
      en: "Give llm-abi one type or schema. Get the provider-safe schema back. Four labels, no percentage.",
      ja: "型かスキーマを1つ渡すと、各プロバイダが受け取れる形が返ります。結果は4種類だけ。パーセントはありません。",
    },
    nav: { en: "Guide", ja: "ガイド" },
    source: { en: "guide.md", ja: "ja/guide.md" },
  },
  {
    slug: "api",
    title: { en: "API", ja: "API" },
    description: {
      en: "compile, check, checkRequest, checkDeployment, and llm-abi/local.",
      ja: "compile、check、checkRequest、checkDeployment、および llm-abi/local。",
    },
    nav: { en: "API", ja: "API" },
    source: { en: "api.md", ja: "ja/api.md" },
  },
  {
    slug: "cli",
    title: { en: "CLI", ja: "CLI" },
    description: {
      en: "npx llm-abi check, compile, request, and local doctor / matrix / lock.",
      ja: "npx llm-abi check、compile、request、local doctor / matrix / lock。",
    },
    nav: { en: "CLI", ja: "CLI" },
    source: { en: "cli.md", ja: "ja/cli.md" },
  },
  {
    slug: "profiles",
    title: { en: "Profiles", ja: "プロファイル" },
    description: {
      en: "Built-in provider and runtime targets, evidence, and the qwen Model Studio alias.",
      ja: "組み込みのプロバイダ／ランタイム、証拠の種類、qwen が Model Studio であること。",
    },
    nav: { en: "Profiles", ja: "プロファイル" },
    source: { en: "profiles.md", ja: "ja/profiles.md" },
  },
  {
    slug: "requests",
    title: { en: "Requests", ja: "リクエスト" },
    description: {
      en: "checkRequest for model, endpoint, tools, and reasoning combinations.",
      ja: "モデル・エンドポイント・tools・reasoning の組み合わせを checkRequest で見る。",
    },
    nav: { en: "Requests", ja: "リクエスト" },
    source: { en: "requests.md", ja: "ja/requests.md" },
  },
  {
    slug: "local",
    title: { en: "Local", ja: "ローカル" },
    description: {
      en: "checkDeployment and llm-abi local for LM Studio, Ollama, llama.cpp, vLLM, and SGLang.",
      ja: "LM Studio、Ollama、llama.cpp、vLLM、SGLang 向けの checkDeployment と local CLI。",
    },
    nav: { en: "Local", ja: "ローカル" },
    source: { en: "local.md", ja: "ja/local.md" },
  },
  {
    slug: "guarantees",
    title: { en: "Guarantees", ja: "保証" },
    description: {
      en: "What compile, checkRequest, and checkDeployment guarantee — and what they do not.",
      ja: "compile、checkRequest、checkDeployment が保証すること／しないこと。",
    },
    nav: { en: "Guarantees", ja: "保証" },
    source: { en: "guarantees.md", ja: "ja/guarantees.md" },
  },
  {
    slug: "architecture",
    title: { en: "Architecture", ja: "アーキテクチャ" },
    description: {
      en: "Schema ABI, Request ABI, and Runtime ABI as separate compilers.",
      ja: "Schema ABI、Request ABI、Runtime ABI は別のコンパイラです。",
    },
    nav: { en: "Architecture", ja: "構成" },
    source: { en: "architecture.md", ja: "ja/architecture.md" },
  },
];

export function docHref(from: string, to: string): string {
  if (from === to) {
    return "./";
  }
  if (from === "") {
    return to === "" ? "./" : `./${to}/`;
  }
  if (to === "") {
    return "../";
  }
  return `../${to}/`;
}

export function assetPrefix(locale: DocLocale, slug: string): string {
  if (locale === "en") {
    return slug === "" ? ".." : "../..";
  }
  return slug === "" ? "../.." : "../../..";
}

export function docsHomeHref(slug: string): string {
  return slug === "" ? "./" : "../";
}

export function localeSwitchHref(from: DocLocale, slug: string, to: DocLocale): string {
  if (from === to) {
    return "./";
  }
  if (from === "en" && to === "ja") {
    return slug === "" ? "./ja/" : `../ja/${slug}/`;
  }
  return slug === "" ? "../" : `../../${slug}/`;
}

export function docsCanonical(locale: DocLocale, slug: string): string {
  const root = locale === "ja" ? `${SITE_ORIGIN}/docs/ja` : `${SITE_ORIGIN}/docs`;
  return slug === "" ? `${root}/` : `${root}/${slug}/`;
}

export function parseDocLocale(value: string | undefined): DocLocale | undefined {
  return value === "en" || value === "ja" ? value : undefined;
}
