import type { FamilySource } from "../types.ts";

const QWEN38_EXACT = new Set([
  "qwen3.8",
  "qwen3.8:latest",
  "qwen3.8:27b",
  "qwen/qwen3.8-27b",
  "qwen/qwen3.8-flash-next",
]);

const QWEN38_PREFIXES = [
  "qwen3.8:",
  "qwen3.8-flash-next",
  "qwen/qwen3.8-",
  "qwen3.8-",
  "ggml-org/qwen3.8-",
];

export interface InferredFamily {
  readonly family?: string;
  readonly source: FamilySource;
}

export function publicModelId(id: string): string {
  const unified = id.replace(/\\/g, "/");
  if (unified.startsWith("/") || /^[a-zA-Z]:\//.test(unified)) {
    const base = unified.slice(unified.lastIndexOf("/") + 1);
    return base === "" ? id : base;
  }
  return id;
}

export function modelMatchKeys(id: string): readonly string[] {
  const unified = id.trim().toLowerCase().replace(/\\/g, "/");
  const parts = unified.split("/").filter((part) => part.length > 0);
  const last = parts[parts.length - 1] ?? unified;
  const stem = last.replace(/\.gguf$/, "");
  const keys = new Set<string>([unified, last, stem]);
  return [...keys];
}

export function inferQwen38Family(id: string): InferredFamily {
  if (matchesQwen38(id)) {
    return { family: "qwen3.8", source: "id-pattern" };
  }
  return { source: "unknown" };
}

export function matchesQwen38(id: string): boolean {
  for (const key of modelMatchKeys(id)) {
    if (QWEN38_EXACT.has(key)) {
      return true;
    }
    for (const prefix of QWEN38_PREFIXES) {
      if (key.startsWith(prefix)) {
        return true;
      }
    }
  }
  return false;
}

export function looksLikeQwen38Family(family: string): boolean {
  const normalized = family.trim().toLowerCase();
  return normalized === "qwen3.8" || normalized.startsWith("qwen3.8-");
}
