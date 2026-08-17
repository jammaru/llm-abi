export { typeScriptToJsonSchema } from "./to-json-schema.ts";
export type { TypeScriptInputOptions } from "./to-json-schema.ts";

export function looksLikeJsonDocument(text: string): boolean {
  const trimmed = text.trimStart();
  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("true") ||
    trimmed.startsWith("false") ||
    trimmed.startsWith("null") ||
    trimmed.startsWith('"')
  );
}

export function isTypeScriptSource(text: string): boolean {
  const trimmed = text.trimStart();
  if (looksLikeJsonDocument(trimmed) && !trimmed.startsWith("{")) {
    return false;
  }
  return /^(?:export\s+)?(?:type|interface)\b/.test(trimmed) || /^\/\/|^\/\*/.test(trimmed);
}
