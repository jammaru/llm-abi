import {
  assetPrefix,
  DOC_PAGES,
  docsCanonical,
  docsHomeHref,
  docHref,
  type DocLocale,
  type DocPage,
} from "./catalog.ts";
import { renderMarkdown } from "./markdown.ts";

export function renderDocPage(page: DocPage, markdown: string, locale: DocLocale): string {
  const prefix = assetPrefix(locale, page.slug);
  const body = renderMarkdown(markdown, page.slug);
  const nav = DOC_PAGES.map((item) => {
    const current = item.slug === page.slug;
    return `<a class="docs-nav-link${current ? " is-current" : ""}" href="${escapeAttr(docHref(page.slug, item.slug))}"${current ? ' aria-current="page"' : ""}>${escapeHtml(item.nav[locale])}</a>`;
  }).join("");
  const enUrl = docsCanonical("en", page.slug);
  const jaUrl = docsCanonical("ja", page.slug);
  const title = page.title[locale];
  const description = page.description[locale];
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="${escapeAttr(description)}" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="canonical" href="${escapeAttr(docsCanonical(locale, page.slug))}" />
    <link rel="alternate" hreflang="en" href="${escapeAttr(enUrl)}" />
    <link rel="alternate" hreflang="ja" href="${escapeAttr(jaUrl)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeAttr(enUrl)}" />
    <link rel="icon" href="${prefix}/favicon.svg" type="image/svg+xml" />
    <title>${escapeHtml(title)} — llm-abi</title>
    <script src="${prefix}/theme-boot.js"></script>
    <script src="${prefix}/locale-boot.js"></script>
  </head>
  <body class="docs-page" data-docs-locale="${locale}" data-docs-slug="${escapeAttr(page.slug)}">
    <a class="skip" href="#doc" data-i18n="skipDoc">Skip to documentation</a>
    <header class="site-header">
      <div class="brand">
        <a class="wordmark" href="${prefix}/">llm-abi</a>
        <p class="tagline" data-i18n="tagline">One schema. Every model.</p>
      </div>
      <div class="header-actions">
        <nav class="nav" data-i18n-aria="project" aria-label="Project">
          <a class="nav-text" href="${prefix}/" data-i18n="playground">Playground</a>
          <a class="nav-text is-current" href="${docsHomeHref(page.slug)}" aria-current="page" data-i18n="docs">Docs</a>
          <a class="icon-link" href="https://github.com/jammaru/llm-abi" data-i18n-aria="github" aria-label="GitHub repository">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.52 1.03 1.52 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.11 2.51.33 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>
            </svg>
          </a>
          <a class="icon-link" href="https://www.npmjs.com/package/llm-abi" data-i18n-aria="npm" aria-label="npm package"><span>npm</span></a>
        </nav>
        <div class="locale-toggle" data-locale-toggle>
          <div class="locale-list" role="radiogroup" data-i18n-aria="language" aria-label="Language">
            <label class="locale-option">
              <input id="locale-en" name="locale" type="radio" value="en" />
              <span>EN</span>
            </label>
            <label class="locale-option locale-option-ja">
              <input id="locale-ja" name="locale" type="radio" value="ja" />
              <span>日本語</span>
            </label>
          </div>
        </div>
        <div class="theme-toggle" data-theme-toggle>
          <button id="theme-toggle" type="button" aria-label="Switch to dark theme" aria-pressed="false">
            <span class="theme-track" aria-hidden="true">
              <span class="theme-thumb">
                <svg class="theme-icon theme-sun" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3.25" stroke="currentColor" stroke-width="1.6"></circle>
                  <path d="M12 3.5v1.6M12 18.9v1.6M3.5 12h1.6M18.9 12h1.6M6.05 6.05l1.13 1.13M16.82 16.82l1.13 1.13M6.05 17.95l1.13-1.13M16.82 7.18l1.13-1.13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path>
                </svg>
                <svg class="theme-icon theme-moon" viewBox="0 0 24 24" fill="none">
                  <path d="M16.5 14.2A6.7 6.7 0 0 1 9.8 7.5a6.2 6.2 0 1 0 6.7 6.7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path>
                </svg>
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
    <div class="docs-shell">
      <nav class="docs-nav" data-i18n-aria="documentation" aria-label="Documentation">${nav}</nav>
      <main class="docs-main">
        <p class="docs-kicker" data-i18n="documentation">Documentation</p>
        <h1 id="doc">${escapeHtml(title)}</h1>
        <p class="docs-lead">${escapeHtml(description)}</p>
        <article class="docs-article">${body}</article>
      </main>
    </div>
    <footer class="site-footer">
      <p>
        <span data-i18n="footerBefore">Compatibility is </span>
        <code>lossless</code>, <code>runtime-safe</code>, <code>lossy</code>,
        <code>unsupported</code
        ><span data-i18n="footerAfter">. llm-abi does not invent percentages. </span>
        <a href="${prefix}/" data-i18n="playground">Playground</a>
      </p>
    </footer>
    <script type="module" src="${prefix}/src/docs-entry.ts"></script>
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
