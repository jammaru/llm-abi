import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DOC_LOCALES, DOC_PAGES, docHref, localeSwitchHref } from "../src/site/catalog.ts";
import { mapHref } from "../src/site/links.ts";
import { renderMarkdown } from "../src/site/markdown.ts";
import { renderDocPage } from "../src/site/page.ts";

const docsRoot = fileURLToPath(new URL("../../../docs", import.meta.url));

describe("published docs", () => {
  it("has English and Japanese markdown for every site page", () => {
    for (const page of DOC_PAGES) {
      for (const locale of DOC_LOCALES) {
        const source = join(docsRoot, page.source[locale]);
        expect(existsSync(source), source).toBe(true);
        const markdown = readFileSync(source, "utf8");
        expect(markdown, source).toMatch(/^# /);
        expect(markdown).toMatch(/lossless|runtime-safe|lossy|unsupported/);
        expect(markdown).not.toMatch(/\d+\s*%\s*(compatible|compatibility|互換)/i);
      }
    }
  });

  it("maps every relative link in published markdown", () => {
    const link = /\]\(([^)\s]+)\)/g;
    for (const page of DOC_PAGES) {
      for (const locale of DOC_LOCALES) {
        const markdown = readFileSync(join(docsRoot, page.source[locale]), "utf8");
        for (const match of markdown.matchAll(link)) {
          const href = match[1];
          if (
            href === undefined ||
            href.startsWith("http://") ||
            href.startsWith("https://") ||
            href.startsWith("#")
          ) {
            continue;
          }
          expect(mapHref(href, page.slug), `${page.source[locale]} -> ${href}`).toBeDefined();
        }
      }
    }
  });

  it("rewrites in-repo doc links to site hrefs", () => {
    expect(mapHref("./api.md", "")).toBe("./api/");
    expect(mapHref("./api.md", "cli")).toBe("../api/");
    expect(mapHref("./guide.md", "api")).toBe("../");
    expect(mapHref("./requests/README.md", "architecture")).toBe("../requests/");
    expect(mapHref("https://llm-abi.pages.dev/", "")).toBeUndefined();
    expect(mapHref("#compatibility", "")).toBeUndefined();
  });

  it("switches English and Japanese docs with relative hrefs", () => {
    expect(localeSwitchHref("en", "", "ja")).toBe("./ja/");
    expect(localeSwitchHref("en", "api", "ja")).toBe("../ja/api/");
    expect(localeSwitchHref("ja", "", "en")).toBe("../");
    expect(localeSwitchHref("ja", "local", "en")).toBe("../../local/");
  });

  it("renders GFM tables and keeps relative .md links off the page", () => {
    const guide = DOC_PAGES.find((page) => page.slug === "");
    expect(guide).toBeDefined();
    if (!guide) {
      return;
    }
    const markdown = readFileSync(join(docsRoot, guide.source.en), "utf8");
    const article = renderMarkdown(markdown, guide.slug);
    expect(article).toContain("<table>");
    expect(article).toContain("compile");
    expect(article).not.toMatch(/^<h1/u);
    expect(article).not.toMatch(/href="(?:\.\/|\.\.\/)[^"]+\.md"/);

    const html = renderDocPage(guide, markdown, "en");
    expect(html).toContain('href="./api/"');
    expect(html).toContain('href="./local/"');
    expect(html).toContain('class="docs-page"');
    expect(html).toContain('lang="en"');
    expect(html).toContain('hreflang="ja"');
    expect(html).not.toContain("compatibility percentage");
    const playground = readFileSync(
      fileURLToPath(new URL("../index.html", import.meta.url)),
      "utf8",
    );
    const icon = /d="(M12 2a10[^"]+)"/.exec(playground)?.[1];
    expect(icon).toBeDefined();
    expect(html).toContain(`d="${icon}"`);
  });

  it("keeps qwen as Alibaba Model Studio in both languages", () => {
    const profiles = DOC_PAGES.find((page) => page.slug === "profiles");
    expect(profiles).toBeDefined();
    if (!profiles) {
      return;
    }
    const en = renderMarkdown(
      readFileSync(join(docsRoot, profiles.source.en), "utf8"),
      profiles.slug,
    );
    const ja = renderMarkdown(
      readFileSync(join(docsRoot, profiles.source.ja), "utf8"),
      profiles.slug,
    );
    expect(en).toContain("Alibaba Model Studio");
    expect(en).toContain("not local Qwen");
    expect(ja).toContain("Alibaba Model Studio");
    expect(ja).toContain("ローカルの Qwen ではありません");
    expect(docHref("profiles", "local")).toBe("../local/");

    const jaHtml = renderDocPage(
      profiles,
      readFileSync(join(docsRoot, profiles.source.ja), "utf8"),
      "ja",
    );
    expect(jaHtml).toContain('lang="ja"');
    expect(jaHtml).toContain("プロファイル");
    expect(jaHtml).toContain('href="../local/"');
  });
});
