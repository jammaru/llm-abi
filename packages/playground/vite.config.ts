import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { playgroundHtmlInputs, repoDocsRoot } from "./docs-pages.ts";

function docsPagesPlugin(): Plugin {
  const docsRoot = repoDocsRoot().replaceAll("\\", "/");
  return {
    name: "llm-abi-docs-pages",
    configureServer(server) {
      server.watcher.add(docsRoot);
      server.watcher.on("change", (file) => {
        const normalized = file.replaceAll("\\", "/");
        if (!normalized.startsWith(docsRoot) || !normalized.endsWith(".md")) {
          return;
        }
        playgroundHtmlInputs();
        server.ws.send({ type: "full-reload" });
      });
    },
  };
}

const input = playgroundHtmlInputs();

export default defineConfig({
  root: ".",
  base: "./",
  publicDir: "public",
  plugins: [docsPagesPlugin()],
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
    rollupOptions: {
      input,
    },
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
