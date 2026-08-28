export type CliArgs =
  | { readonly kind: "help" }
  | { readonly kind: "version" }
  | { readonly kind: "doctor"; readonly json: boolean }
  | {
      readonly kind: "check";
      readonly file?: string;
      readonly json: boolean;
      readonly ci: boolean;
      readonly optimize: boolean;
      readonly typeName?: string;
    }
  | {
      readonly kind: "compile";
      readonly file?: string;
      readonly target?: string;
      readonly json: boolean;
      readonly ci: boolean;
      readonly strict: boolean;
      readonly optimize: boolean;
      readonly typeName?: string;
    }
  | {
      readonly kind: "explain";
      readonly file?: string;
      readonly target?: string;
      readonly json: boolean;
      readonly optimize: boolean;
      readonly typeName?: string;
    }
  | {
      readonly kind: "analyze";
      readonly file?: string;
      readonly json: boolean;
      readonly typeName?: string;
    }
  | {
      readonly kind: "request";
      readonly file?: string;
      readonly json: boolean;
      readonly ci: boolean;
    }
  | {
      readonly kind: "local-doctor";
      readonly json: boolean;
      readonly url?: string;
    }
  | {
      readonly kind: "local-probe";
      readonly json: boolean;
      readonly url?: string;
      readonly runtime?: string;
      readonly model?: string;
      readonly schema?: string;
      readonly suite: "smoke" | "full";
    };

const ROOT_COMMANDS = new Set([
  "check",
  "compile",
  "explain",
  "analyze",
  "request",
  "doctor",
  "help",
  "version",
  "local",
]);

export function parseArgs(argv: readonly string[]): CliArgs {
  const rest = argv.slice(2);
  let command = "help";
  let localSub: string | undefined;
  let file: string | undefined;
  let target: string | undefined;
  let json = false;
  let ci = false;
  let strict = false;
  let optimize = false;
  let typeName: string | undefined;
  let help = false;
  let version = false;
  let url: string | undefined;
  let runtime: string | undefined;
  let model: string | undefined;
  let suite: "smoke" | "full" = "smoke";

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
    if (token === "--optimize") {
      optimize = true;
      continue;
    }
    if (token === "--type") {
      typeName = rest[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--type=")) {
      typeName = token.slice("--type=".length);
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
    if (token === "--url") {
      url = rest[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--url=")) {
      url = token.slice("--url=".length);
      continue;
    }
    if (token === "--runtime") {
      runtime = rest[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--runtime=")) {
      runtime = token.slice("--runtime=".length);
      continue;
    }
    if (token === "--model") {
      model = rest[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--model=")) {
      model = token.slice("--model=".length);
      continue;
    }
    if (token === "--suite") {
      suite = readSuite(rest[index + 1]);
      index += 1;
      continue;
    }
    if (token.startsWith("--suite=")) {
      suite = readSuite(token.slice("--suite=".length));
      continue;
    }
    if (token === "--") {
      file = rest[index + 1];
      break;
    }
    if (token.startsWith("-")) {
      throw new Error(`Unknown option ${token}`);
    }
    if (command === "help" && ROOT_COMMANDS.has(token)) {
      command = token;
      continue;
    }
    if (command === "local" && localSub === undefined) {
      if (token !== "doctor" && token !== "probe") {
        throw new Error(`Unknown local command ${token}. Use: local doctor, local probe.`);
      }
      localSub = token;
      continue;
    }
    file = token;
  }

  if (version) {
    return { kind: "version" };
  }
  if (help) {
    return { kind: "help" };
  }
  if (command === "local") {
    if (localSub === "probe") {
      return { kind: "local-probe", json, url, runtime, model, schema: file, suite };
    }
    if (localSub === "doctor") {
      return { kind: "local-doctor", json, url };
    }
    throw new Error("Missing local command. Use: local doctor, local probe.");
  }
  if (command === "doctor") {
    return { kind: "doctor", json };
  }
  if (command === "check") {
    return { kind: "check", file, json, ci, optimize, typeName };
  }
  if (command === "compile") {
    return { kind: "compile", file, target, json, ci, strict, optimize, typeName };
  }
  if (command === "explain") {
    return { kind: "explain", file, target, json, optimize, typeName };
  }
  if (command === "analyze") {
    return { kind: "analyze", file, json, typeName };
  }
  if (command === "request") {
    return { kind: "request", file, json, ci };
  }
  return { kind: "help" };
}

function readSuite(value: string | undefined): "smoke" | "full" {
  if (value !== "smoke" && value !== "full") {
    throw new Error('Unknown suite. Use "smoke" or "full".');
  }
  return value;
}
