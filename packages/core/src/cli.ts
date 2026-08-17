import { run } from "./cli/run.ts";

const code = run(process.argv);
process.exitCode = code;
