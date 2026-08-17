import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/core/tests/**/*.test.ts", "packages/conformance/src/**/*.test.ts"],
    benchmark: {
      include: ["benchmarks/**/*.bench.ts"],
    },
    exclude: ["**/dist/**", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["packages/core/src/**/*.ts"],
      exclude: ["packages/core/src/cli/**", "packages/core/src/cli.ts"],
      thresholds: {
        lines: 80,
        functions: 85,
        statements: 80,
        branches: 70,
      },
    },
  },
});
