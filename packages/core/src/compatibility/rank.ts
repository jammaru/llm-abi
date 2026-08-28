import type { Compatibility } from "../types.ts";

export const COMPATIBILITY_RANK: Record<Compatibility, number> = {
  lossless: 0,
  "runtime-safe": 1,
  lossy: 2,
  unsupported: 3,
};

export function worstCompatibility(levels: readonly Compatibility[]): Compatibility {
  let level: Compatibility = "lossless";
  for (const item of levels) {
    if (COMPATIBILITY_RANK[item] > COMPATIBILITY_RANK[level]) {
      level = item;
    }
  }
  return level;
}

export function worseCompatibility(current: Compatibility, next: Compatibility): Compatibility {
  return COMPATIBILITY_RANK[next] > COMPATIBILITY_RANK[current] ? next : current;
}
