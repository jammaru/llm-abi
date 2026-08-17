import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const core = join(dirname(fileURLToPath(import.meta.url)), "../packages/core");
const existing = new Set(readdirSync(core).filter((name) => name.endsWith(".tgz")));
execSync("pnpm pack --pack-destination .", { cwd: core, stdio: "inherit" });
const packed = readdirSync(core).find((name) => name.endsWith(".tgz") && !existing.has(name));
const tarballName = packed;
if (!tarballName) {
  throw new Error("pnpm pack did not write a tarball.");
}
const tarball = join(core, tarballName);
const directory = mkdtempSync(join(tmpdir(), "llm-abi-consumer-"));

try {
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ name: "llm-abi-consumer", type: "module", private: true }, null, 2),
  );
  execSync(`npm install "${tarball}"`, { cwd: directory, stdio: "inherit" });
  writeFileSync(
    join(directory, "index.mjs"),
    `import { compile, check, listTargets } from "llm-abi";
const schema = { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] };
const result = compile(schema, "openai");
if (result.compatibility !== "lossless" && result.compatibility !== "runtime-safe") {
  throw new Error("unexpected compatibility " + result.compatibility);
}
if (check(schema).results.length !== listTargets().length) {
  throw new Error("check rows do not match listTargets");
}
console.log("consumer pack ok", result.fingerprint);
`,
  );
  execSync("node index.mjs", { cwd: directory, stdio: "inherit" });
} finally {
  rmSync(tarball, { force: true });
  rmSync(directory, { recursive: true, force: true });
}
