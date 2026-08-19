import type { Compatibility } from "llm-abi";

const VENDOR_LABELS: Readonly<Record<string, string>> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Gemini",
  deepseek: "DeepSeek",
  xai: "xAI",
  alibaba: "Qwen",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  mcp: "MCP",
};

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

export function vendorLabel(vendor: string): string {
  return VENDOR_LABELS[vendor] ?? vendor;
}

export function compatibilityLabel(level: Compatibility): string {
  return level;
}

export function compatibilityHint(level: Compatibility): string {
  if (level === "lossless") {
    return "Provider schema keeps the input meaning";
  }
  if (level === "runtime-safe") {
    return "Some constraints need result.validate";
  }
  if (level === "lossy") {
    return "Meaning changed; see diagnostics";
  }
  return "Cannot represent this construct";
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
