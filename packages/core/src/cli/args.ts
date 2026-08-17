export interface CliArgs {
  readonly command: string;
  readonly file?: string;
  readonly target?: string;
  readonly json: boolean;
  readonly ci: boolean;
  readonly strict: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const rest = argv.slice(2);
  let command = "help";
  let file: string | undefined;
  let target: string | undefined;
  let json = false;
  let ci = false;
  let strict = false;
  let help = false;
  let version = false;

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]!;
    if (token === "--help" || token === "-h") {
      help = true;
      continue;
    }
    if (token === "--version" || token === "-v") {
      version = true;
      continue;
    }
    if (token === "--json") {
      json = true;
      continue;
    }
    if (token === "--ci") {
      ci = true;
      continue;
    }
    if (token === "--strict") {
      strict = true;
      continue;
    }
    if (token === "--target" || token === "-t") {
      target = rest[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--target=")) {
      target = token.slice("--target=".length);
      continue;
    }
    if (token === "--") {
      file = rest[index + 1];
      break;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown option ${token}`);
    }
    if (
      command === "help" &&
      ["check", "compile", "explain", "doctor", "help", "version"].includes(token)
    ) {
      command = token;
      continue;
    }
    file = token;
  }

  if (version) {
    command = "version";
  }
  if (help) {
    command = "help";
  }
  return { command, file, target, json, ci, strict, help, version };
}
