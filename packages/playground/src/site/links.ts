import { docHref } from "./catalog.ts";

const DOC_FILES: Readonly<Record<string, string>> = {
  "guide.md": "",
  "./guide.md": "",
  "api.md": "api",
  "./api.md": "api",
  "../api.md": "api",
  "cli.md": "cli",
  "./cli.md": "cli",
  "../cli.md": "cli",
  "profiles.md": "profiles",
  "./profiles.md": "profiles",
  "../profiles.md": "profiles",
  "requests.md": "requests",
  "./requests.md": "requests",
  "requests/README.md": "requests",
  "./requests/README.md": "requests",
  "../requests/README.md": "requests",
  "local.md": "local",
  "./local.md": "local",
  "../local.md": "local",
  "guarantees.md": "guarantees",
  "./guarantees.md": "guarantees",
  "../guarantees.md": "guarantees",
  "architecture.md": "architecture",
  "./architecture.md": "architecture",
  "../architecture.md": "architecture",
  "runtime/README.md": "local",
  "./runtime/README.md": "local",
  "../runtime/README.md": "local",
  "targets/README.md": "profiles",
  "../targets/README.md": "profiles",
};

const REPO_BLOB = "https://github.com/jammaru/llm-abi/blob/main/";

export function rewriteMarkdownLinks(markdown: string, from: string): string {
  return markdown.replace(/\]\(([^)\s]+)\)/g, (match, href: string) => {
    const mapped = mapHref(href, from);
    return mapped === undefined ? match : `](${mapped})`;
  });
}

export function mapHref(href: string, from: string): string | undefined {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#")
  ) {
    return undefined;
  }
  const hashIndex = href.indexOf("#");
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const slug = DOC_FILES[path];
  if (slug !== undefined) {
    return `${docHref(from, slug)}${hash}`;
  }
  const cleaned = path.replace(/^\.\//, "").replace(/^(\.\.\/)+/, "");
  if (
    cleaned.startsWith("packages/") ||
    cleaned.startsWith("docs/") ||
    cleaned.startsWith("examples/")
  ) {
    return `${REPO_BLOB}${cleaned}${hash}`;
  }
  return undefined;
}
