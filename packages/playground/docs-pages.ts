import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOC_PAGES } from "./src/site/catalog.ts";
import { renderDocPage } from "./src/site/page.ts";

export function repoDocsRoot(): string {
  return fileURLToPath(new URL("../../docs", import.meta.url));
}

export function generatedDocsRoot(): string {
  return fileURLToPath(new URL("./docs", import.meta.url));
}

export function playgroundHtmlInputs(): Record<string, string> {
  const docsRoot = repoDocsRoot();
  const outRoot = generatedDocsRoot();
  const inputs: Record<string, string> = {
    playground: fileURLToPath(new URL("./index.html", import.meta.url)),
  };
  for (const page of DOC_PAGES) {
    const markdown = readFileSync(join(docsRoot, page.source), "utf8");
    const outDir = page.slug === "" ? outRoot : join(outRoot, page.slug);
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, "index.html");
    writeFileSync(file, renderDocPage(page, markdown), "utf8");
    inputs[page.slug === "" ? "docs" : `docs-${page.slug}`] = file;
  }
  return inputs;
}
