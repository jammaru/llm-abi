import { isPlainObject } from "../../json/safe-record.ts";

export function asRecord(value: unknown): { readonly [key: string]: unknown } | undefined {
  return isPlainObject(value) ? value : undefined;
}

export function asArray(value: unknown): readonly unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
