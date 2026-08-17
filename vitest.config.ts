import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const llmAbiSrc = fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "llm-abi": llmAbiSrc,
    },
  },
  test: {
    include: [
      "packages/action/tests/**/*.test.ts",
      "packages/core/tests/**/*.test.ts",
      "packages/conformance/src/**/*.test.ts",
      "packages/playground/tests/**/*.test.ts",
    ],
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
