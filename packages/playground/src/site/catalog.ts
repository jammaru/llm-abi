export interface DocPage {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly nav: string;
  readonly source: string;
}

export const DOC_PAGES: readonly DocPage[] = [
  {
    slug: "",
    title: "Guide",
    description:
      "Compile one TypeScript type or JSON Schema into provider-safe schemas. Discrete compatibility, no percentage.",
    nav: "Guide",
    source: "guide.md",
  },
  {
    slug: "api",
    title: "API",
    description: "compile, check, checkRequest, checkDeployment, and llm-abi/local.",
    nav: "API",
    source: "api.md",
  },
  {
    slug: "cli",
    title: "CLI",
    description: "npx llm-abi check, compile, request, and local doctor / matrix / lock.",
    nav: "CLI",
    source: "cli.md",
  },
  {
    slug: "profiles",
    title: "Profiles",
    description:
      "Built-in provider and runtime targets, evidence, and the qwen Model Studio alias.",
    nav: "Profiles",
    source: "profiles.md",
  },
  {
    slug: "requests",
    title: "Requests",
    description: "checkRequest for model, endpoint, tools, and reasoning combinations.",
    nav: "Requests",
    source: "requests.md",
  },
  {
    slug: "local",
    title: "Local",
    description:
      "checkDeployment and llm-abi local for LM Studio, Ollama, llama.cpp, vLLM, and SGLang.",
    nav: "Local",
    source: "local.md",
  },
  {
    slug: "guarantees",
    title: "Guarantees",
    description:
      "What compile, checkRequest, and checkDeployment guarantee — and what they do not.",
    nav: "Guarantees",
    source: "guarantees.md",
  },
  {
    slug: "architecture",
    title: "Architecture",
    description: "Schema ABI, Request ABI, and Runtime ABI as separate compilers.",
    nav: "Architecture",
    source: "architecture.md",
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

export function assetPrefix(slug: string): string {
  return slug === "" ? ".." : "../..";
}
