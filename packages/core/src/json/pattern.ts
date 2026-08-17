import { MAX_PATTERN_LENGTH } from "../limits.ts";

export function isUnsafePattern(pattern: string): boolean {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return true;
  }
  if (/\(\?/.test(pattern) || /\\[1-9]/.test(pattern) || /\\[bB]/.test(pattern)) {
    return true;
  }
  return hasNestedQuantifiers(pattern);
}

export function tryMatchPattern(
  pattern: string,
  value: string,
): { readonly ok: boolean; readonly skipped: boolean } {
  if (isUnsafePattern(pattern)) {
    return { ok: false, skipped: true };
  }
  try {
    return { ok: new RegExp(pattern).test(value), skipped: false };
  } catch {
    return { ok: false, skipped: true };
  }
}

function hasNestedQuantifiers(pattern: string): boolean {
  const stack: Array<{ hasQuantifier: boolean }> = [];
  let inClass = false;
  let escape = false;
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (character === "\\") {
      escape = true;
      continue;
    }
    if (inClass) {
      if (character === "]") {
        inClass = false;
      }
      continue;
    }
    if (character === "[") {
      inClass = true;
      continue;
    }
    if (character === "(") {
      stack.push({ hasQuantifier: false });
      continue;
    }
    if (character === ")") {
      const group = stack.pop();
      const next = pattern[index + 1];
      const quantified = next === "*" || next === "+" || next === "?" || next === "{";
      if (group?.hasQuantifier && quantified) {
        return true;
      }
      if (group?.hasQuantifier && stack.length > 0) {
        stack[stack.length - 1]!.hasQuantifier = true;
      }
      if (quantified && stack.length > 0) {
        stack[stack.length - 1]!.hasQuantifier = true;
      }
      continue;
    }
    if ((character === "*" || character === "+" || character === "{") && stack.length > 0) {
      stack[stack.length - 1]!.hasQuantifier = true;
    }
  }
  return false;
}
