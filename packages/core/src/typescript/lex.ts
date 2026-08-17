import { LlmAbiError } from "../errors.ts";

export type TsTokenKind =
  | "eof"
  | "ident"
  | "string"
  | "number"
  | "true"
  | "false"
  | "{"
  | "}"
  | "["
  | "]"
  | "("
  | ")"
  | "<"
  | ">"
  | ","
  | ";"
  | ":"
  | "?"
  | "|"
  | "&"
  | "="
  | "*"
  | "..."
  | "readonly"
  | "type"
  | "interface"
  | "export"
  | "extends"
  | "import"
  | "from"
  | "enum"
  | "class"
  | "function"
  | "keyof"
  | "typeof"
  | "infer"
  | "in"
  | "as";

export interface TsToken {
  readonly kind: TsTokenKind;
  readonly value: string;
  readonly line: number;
  readonly column: number;
}

const KEYWORDS = new Map<string, TsTokenKind>([
  ["readonly", "readonly"],
  ["type", "type"],
  ["interface", "interface"],
  ["export", "export"],
  ["extends", "extends"],
  ["import", "import"],
  ["from", "from"],
  ["enum", "enum"],
  ["class", "class"],
  ["function", "function"],
  ["keyof", "keyof"],
  ["typeof", "typeof"],
  ["infer", "infer"],
  ["in", "in"],
  ["as", "as"],
  ["true", "true"],
  ["false", "false"],
]);

export function tokenize(source: string): TsToken[] {
  const tokens: TsToken[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const peek = (offset = 0): string => source[index + offset] ?? "";
  const advance = (): string => {
    const char = source[index] ?? "";
    index += 1;
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return char;
  };

  while (index < source.length) {
    const startLine = line;
    const startColumn = column;
    const char = peek();

    if (char === " " || char === "\t" || char === "\r" || char === "\n") {
      advance();
      continue;
    }
    if (char === "/" && peek(1) === "/") {
      while (index < source.length && peek() !== "\n") {
        advance();
      }
      continue;
    }
    if (char === "/" && peek(1) === "*") {
      advance();
      advance();
      while (index < source.length && !(peek() === "*" && peek(1) === "/")) {
        advance();
      }
      if (index >= source.length) {
        throw syntaxError("Unterminated block comment", startLine, startColumn);
      }
      advance();
      advance();
      continue;
    }
    if (char === "'" || char === '"') {
      tokens.push(readString(char, startLine, startColumn));
      continue;
    }
    if (char === "`") {
      throw syntaxError("Template literal types are not supported", startLine, startColumn);
    }
    if (isDigit(char) || (char === "-" && isDigit(peek(1)))) {
      tokens.push(readNumber(startLine, startColumn));
      continue;
    }
    if (char === "." && peek(1) === "." && peek(2) === ".") {
      advance();
      advance();
      advance();
      tokens.push({ kind: "...", value: "...", line: startLine, column: startColumn });
      continue;
    }
    if (isIdentStart(char)) {
      let value = "";
      while (isIdentPart(peek())) {
        value += advance();
      }
      const kind = KEYWORDS.get(value) ?? "ident";
      tokens.push({ kind, value, line: startLine, column: startColumn });
      continue;
    }

    const single = char as TsTokenKind;
    if ("{}[]()<>,;:?|&=*".includes(char)) {
      advance();
      tokens.push({ kind: single, value: char, line: startLine, column: startColumn });
      continue;
    }
    throw syntaxError(`Unexpected character ${JSON.stringify(char)}`, startLine, startColumn);
  }

  tokens.push({ kind: "eof", value: "", line, column });
  return tokens;

  function readString(quote: string, startLine: number, startColumn: number): TsToken {
    advance();
    let value = "";
    while (index < source.length && peek() !== quote) {
      const current = advance();
      if (current === "\\") {
        const escaped = advance();
        value += unescape(escaped, startLine, startColumn);
      } else if (current === "\n") {
        throw syntaxError("Unterminated string literal", startLine, startColumn);
      } else {
        value += current;
      }
    }
    if (peek() !== quote) {
      throw syntaxError("Unterminated string literal", startLine, startColumn);
    }
    advance();
    return { kind: "string", value, line: startLine, column: startColumn };
  }

  function readNumber(startLine: number, startColumn: number): TsToken {
    let value = "";
    if (peek() === "-") {
      value += advance();
    }
    while (isDigit(peek())) {
      value += advance();
    }
    if (peek() === ".") {
      value += advance();
      while (isDigit(peek())) {
        value += advance();
      }
    }
    return { kind: "number", value, line: startLine, column: startColumn };
  }
}

function unescape(char: string, line: number, column: number): string {
  switch (char) {
    case "n":
      return "\n";
    case "t":
      return "\t";
    case "r":
      return "\r";
    case "\\":
    case '"':
    case "'":
      return char;
    default:
      throw syntaxError(`Unsupported string escape \\${char}`, line, column);
  }
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentStart(char: string): boolean {
  return (
    (char >= "A" && char <= "Z") || (char >= "a" && char <= "z") || char === "_" || char === "$"
  );
}

function isIdentPart(char: string): boolean {
  return isIdentStart(char) || isDigit(char);
}

export function syntaxError(message: string, line: number, column: number): LlmAbiError {
  return new LlmAbiError(
    `TypeScript type syntax error at ${String(line)}:${String(column)}: ${message}`,
    "typescript-syntax",
  );
}
