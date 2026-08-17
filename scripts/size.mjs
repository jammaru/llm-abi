import { gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "packages/core/dist/index.js");
const raw = readFileSync(file);
const gzip = gzipSync(raw).length;
const maxGzip = 16_384;

process.stdout.write(`llm-abi index.mjs  ${statSync(file).size} bytes  (${gzip} gzip)\n`);

if (gzip > maxGzip) {
  process.stderr.write(`gzip size ${gzip} exceeds budget ${maxGzip}\n`);
  process.exit(1);
}
