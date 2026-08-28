import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      local: "src/local.ts",
    },
    platform: "neutral",
    target: "es2023",
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    clean: true,
    sourcemap: false,
    minify: false,
  },
  {
    entry: {
      cli: "src/cli.ts",
    },
    platform: "node",
    target: "node22",
    format: ["esm"],
    dts: false,
    clean: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
