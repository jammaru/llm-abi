import type { Compatibility } from "llm-abi";

export function formatBytes(bytes: number): string {
  if (bytes < 1000) {
    return `${String(bytes)} B`;
  }
  return `${(bytes / 1000).toFixed(1)} kB`;
}

export function formatTokens(tokens: number): string {
  return `${String(tokens)} tok`;
}

export function formatPath(path: readonly string[]): string {
  if (path.length === 0) {
    return "(root)";
  }
  return path.join(".");
}

export function compatibilityLabel(level: Compatibility): string {
  return level;
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
