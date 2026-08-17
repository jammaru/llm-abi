import { compile } from "./compile.ts";
import { fingerprint } from "./fingerprint.ts";
import { listTargets } from "./targets/registry.ts";
import type { CheckOptions, CheckResult, SchemaInput } from "./types.ts";

export function check(schema: SchemaInput, options: CheckOptions = {}): CheckResult {
  const targets = options.targets ?? listTargets().map((target) => target.id);
  return {
    fingerprint: fingerprint(schema),
    results: targets.map((target) => {
      const compiled = compile(schema, { target, strict: false });
      return {
        target: compiled.target,
        compatibility: compiled.compatibility,
        diagnostics: compiled.diagnostics,
      };
    }),
  };
}
