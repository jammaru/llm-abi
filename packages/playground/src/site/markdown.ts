import { marked } from "marked";
import { rewriteMarkdownLinks } from "./links.ts";

marked.use({ gfm: true });

export function renderMarkdown(markdown: string, from: string): string {
  const rewritten = rewriteMarkdownLinks(stripTitle(markdown), from);
  const html = marked.parse(rewritten, { async: false });
  if (typeof html !== "string") {
    throw new Error("marked returned a non-string.");
  }
  return html;
}

function stripTitle(markdown: string): string {
  return markdown.replace(/^# [^\n]+\n+/, "");
}
