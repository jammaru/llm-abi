import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "./",
  publicDir: "public",
  resolve: {
    alias: {
      "llm-abi": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2023",
    sourcemap: true,
  },
  server: {
    port: 4177,
    strictPort: true,
  },
  preview: {
    port: 4177,
    strictPort: true,
  },
});
