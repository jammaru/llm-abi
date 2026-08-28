import { run } from "./cli/run.ts";

const code = run(process.argv);
if (typeof code === "number") {
  process.exitCode = code;
} else {
  process.exitCode = await code;
}
