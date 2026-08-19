import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = 4177;
const origin = `http://localhost:${String(port)}`;
const frames = join(tmpdir(), "llm-abi-playground-demo");
const out = join(root, "docs/assets/playground-demo.gif");

const chromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

function chromeBin() {
  const found = chromeCandidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Google Chrome or Chromium is required to capture the playground demo.");
  }
  return found;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited ${String(code ?? 1)}`));
    });
  });
}

async function waitForServer(deadline = Date.now() + 30_000) {
  try {
    const response = await fetch(origin);
    if (response.ok) {
      return;
    }
  } catch {
    // The playground is still starting.
  }
  if (Date.now() > deadline) {
    throw new Error(`Playground did not start on ${origin}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  return waitForServer(deadline);
}

async function screenshot(scene, file) {
  await run(chromeBin(), [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1280,720",
    `--screenshot=${file}`,
    "--virtual-time-budget=8000",
    "--run-all-compositor-stages-before-draw",
    `${origin}/?demo=${scene}`,
  ]);
}

mkdirSync(frames, { recursive: true });

const playground = spawn("pnpm", ["--filter", "@llm-abi/playground", "dev"], {
  cwd: root,
  stdio: "inherit",
  detached: true,
});

try {
  await waitForServer();
  await screenshot("schema", join(frames, "01.png"));
  await screenshot("grid", join(frames, "02.png"));
  await screenshot("diag", join(frames, "03.png"));
  await run("ffmpeg", [
    "-y",
    "-framerate",
    "1/4",
    "-i",
    join(frames, "%02d.png"),
    "-vf",
    "fps=8,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    "-loop",
    "0",
    out,
  ]);
  process.stdout.write(`Wrote ${out}\n`);
} finally {
  if (playground.pid) {
    try {
      process.kill(-playground.pid, "SIGTERM");
    } catch {
      playground.kill("SIGTERM");
    }
  }
}
