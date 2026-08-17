const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function createRecord(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

export function setRecord(target: Record<string, unknown>, key: string, value: unknown): void {
  if (DANGEROUS_KEYS.has(key)) {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    return;
  }
  target[key] = value;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function ownKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value);
}
