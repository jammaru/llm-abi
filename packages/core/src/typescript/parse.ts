import { LlmAbiError } from "../errors.ts";
import { syntaxError, tokenize } from "./lex.ts";
import type { TsToken, TsTokenKind } from "./lex.ts";

export type TsType =
  | { readonly kind: "primitive"; readonly name: PrimitiveName }
  | { readonly kind: "literal"; readonly value: string | number | boolean }
  | { readonly kind: "ident"; readonly name: string; readonly args: readonly TsType[] }
  | { readonly kind: "object"; readonly members: readonly TsMember[]; readonly index?: TsIndex }
  | { readonly kind: "array"; readonly items: TsType }
  | { readonly kind: "tuple"; readonly elements: readonly TsType[]; readonly rest?: TsType }
  | { readonly kind: "union"; readonly variants: readonly TsType[] }
  | { readonly kind: "intersection"; readonly parts: readonly TsType[] }
  | { readonly kind: "unsupported"; readonly keyword: string; readonly message: string };

export type PrimitiveName =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined"
  | "any"
  | "unknown"
  | "never"
  | "object"
  | "bigint"
  | "symbol";

export interface TsMember {
  readonly name: string;
  readonly optional: boolean;
  readonly readonly: boolean;
  readonly type: TsType;
}

export interface TsIndex {
  readonly key: "string" | "number";
  readonly type: TsType;
}

export interface TsDecl {
  readonly name: string;
  readonly exported: boolean;
  readonly kind: "type" | "interface";
  readonly type: TsType;
}

const PRIMITIVES = new Set<string>([
  "string",
  "number",
  "boolean",
  "null",
  "undefined",
  "any",
  "unknown",
  "never",
  "object",
  "bigint",
  "symbol",
]);

export function parseTypeScript(source: string): readonly TsDecl[] {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parseSource();
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: readonly TsToken[]) {}

  parseSource(): TsDecl[] {
    const decls: TsDecl[] = [];
    while (!this.check("eof")) {
      decls.push(this.parseDeclaration());
    }
    if (decls.length === 0) {
      throw new LlmAbiError(
        "TypeScript input must declare at least one type or interface.",
        "typescript-syntax",
      );
    }
    return decls;
  }

  private parseDeclaration(): TsDecl {
    const exported = this.match("export");
    if (this.check("import")) {
      throw this.error("TypeScript input cannot import modules. Inline the types.");
    }
    if (this.check("enum") || this.check("class") || this.check("function")) {
      throw this.error(`${this.peek().value} declarations are not supported.`);
    }
    if (this.match("type")) {
      return this.parseTypeAlias(exported);
    }
    if (this.match("interface")) {
      return this.parseInterface(exported);
    }
    throw this.error("Expected a type or interface declaration.");
  }

  private parseTypeAlias(exported: boolean): TsDecl {
    const name = this.expectIdent("type name");
    if (this.match("<")) {
      throw this.error(`Generic type declarations are not supported (${name}).`);
    }
    this.expect("=");
    const type = this.parseType();
    this.optional(";");
    return { name, exported, kind: "type", type };
  }

  private parseInterface(exported: boolean): TsDecl {
    const name = this.expectIdent("interface name");
    if (this.match("<")) {
      throw this.error(`Generic interface declarations are not supported (${name}).`);
    }
    if (this.match("extends")) {
      throw this.error(`Interface extends is not supported (${name}).`);
    }
    const type = this.parseObjectType();
    this.optional(";");
    return { name, exported, kind: "interface", type };
  }

  private parseType(): TsType {
    const left = this.parseIntersection();
    if (!this.check("|")) {
      return left;
    }
    const variants = [left];
    while (this.match("|")) {
      variants.push(this.parseIntersection());
    }
    return { kind: "union", variants };
  }

  private parseIntersection(): TsType {
    const left = this.parseArray();
    if (!this.check("&")) {
      return left;
    }
    const parts = [left];
    while (this.match("&")) {
      parts.push(this.parseArray());
    }
    return { kind: "intersection", parts };
  }

  private parseArray(): TsType {
    let type = this.parsePrimary();
    while (this.match("[")) {
      this.expect("]");
      type = { kind: "array", items: type };
    }
    return type;
  }

  private parsePrimary(): TsType {
    if (this.match("keyof") || this.match("typeof") || this.match("infer")) {
      throw this.error(
        `${this.previous().value} types are not supported in this TypeScript subset.`,
      );
    }
    if (this.match("(")) {
      const type = this.parseType();
      this.expect(")");
      return type;
    }
    if (this.check("{")) {
      return this.parseObjectType();
    }
    if (this.check("[")) {
      return this.parseTuple();
    }
    if (this.check("string")) {
      return { kind: "literal", value: this.advance().value };
    }
    if (this.check("number")) {
      return { kind: "literal", value: Number(this.advance().value) };
    }
    if (this.match("true")) {
      return { kind: "literal", value: true };
    }
    if (this.match("false")) {
      return { kind: "literal", value: false };
    }
    if (this.check("ident")) {
      return this.parseIdentOrPrimitive();
    }
    throw this.error("Expected a type.");
  }

  private parseIdentOrPrimitive(): TsType {
    const name = this.expectIdent("type name");
    if (PRIMITIVES.has(name)) {
      if (this.check("<")) {
        throw this.error(`${name} is not generic in this subset.`);
      }
      return { kind: "primitive", name: name as PrimitiveName };
    }
    const args: TsType[] = [];
    if (this.match("<")) {
      args.push(this.parseType());
      while (this.match(",")) {
        args.push(this.parseType());
      }
      this.expect(">");
    }
    return { kind: "ident", name, args };
  }

  private parseObjectType(): TsType {
    this.expect("{");
    const members: TsMember[] = [];
    let index: TsIndex | undefined;
    while (!this.check("}") && !this.check("eof")) {
      if (this.check("[")) {
        if (this.lookaheadIsMapped()) {
          throw this.error("Mapped types are not supported in this TypeScript subset.");
        }
        index = this.parseIndex();
        this.eatSeparator();
        continue;
      }
      members.push(this.parseMember());
      this.eatSeparator();
    }
    this.expect("}");
    return { kind: "object", members, index };
  }

  private lookaheadIsMapped(): boolean {
    const second = this.tokens[this.index + 1];
    const third = this.tokens[this.index + 2];
    return second?.kind === "ident" && third?.kind === "in";
  }

  private parseIndex(): TsIndex {
    this.expect("[");
    this.expectIdent("index name");
    this.expect(":");
    const keyToken = this.advance();
    if (keyToken.value !== "string" && keyToken.value !== "number") {
      throw this.error("Index signatures must use string or number keys.");
    }
    this.expect("]");
    this.expect(":");
    const type = this.parseType();
    return { key: keyToken.value as "string" | "number", type };
  }

  private parseMember(): TsMember {
    const readonly = this.match("readonly");
    let name: string;
    if (this.check("string")) {
      name = this.advance().value;
    } else if (this.check("ident") || this.check("type") || this.check("interface")) {
      name = this.advance().value;
    } else {
      throw this.error("Expected a property name.");
    }
    const optional = this.match("?");
    this.expect(":");
    const type = this.parseType();
    return { name, optional, readonly, type };
  }

  private parseTuple(): TsType {
    this.expect("[");
    const elements: TsType[] = [];
    let rest: TsType | undefined;
    while (!this.check("]") && !this.check("eof")) {
      if (this.match("...")) {
        rest = this.parseType();
        this.optional(",");
        break;
      }
      elements.push(this.parseType());
      if (!this.match(",")) {
        break;
      }
    }
    this.expect("]");
    return { kind: "tuple", elements, rest };
  }

  private check(kind: TsTokenKind): boolean {
    return this.peek().kind === kind;
  }

  private match(kind: TsTokenKind): boolean {
    if (this.check(kind)) {
      this.advance();
      return true;
    }
    return false;
  }

  private eatSeparator(): void {
    if (!this.match(",") && !this.match(";")) {
      return;
    }
  }

  private optional(kind: TsTokenKind): boolean {
    return this.match(kind);
  }

  private expect(kind: TsTokenKind): TsToken {
    if (this.check(kind)) {
      return this.advance();
    }
    throw this.error(`Expected ${kind}.`);
  }

  private expectIdent(label: string): string {
    if (this.check("ident")) {
      return this.advance().value;
    }
    throw this.error(`Expected ${label}.`);
  }

  private peek(): TsToken {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]!;
  }

  private previous(): TsToken {
    return this.tokens[this.index - 1]!;
  }

  private advance(): TsToken {
    const token = this.peek();
    if (token.kind !== "eof") {
      this.index += 1;
    }
    return token;
  }

  private error(message: string): LlmAbiError {
    const token = this.peek();
    return syntaxError(message, token.line, token.column);
  }
}
