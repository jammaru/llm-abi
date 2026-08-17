import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.ts";
import { compile } from "../src/compile.ts";
import { LlmAbiError } from "../src/errors.ts";

const userSource = `
export interface User {
  name: string;
  age: number;
  nickname?: string;
}
`;

describe("TypeScript type input", () => {
  it("compiles an interface through the existing IR", () => {
    const result = compile(userSource, "anthropic");
    const schema = result.schema as {
      properties: Record<string, { type?: string | string[] }>;
      required: string[];
    };
    expect(schema.required).toEqual(["name", "age"]);
    expect(schema.properties["name"]?.type).toBe("string");
    expect(schema.properties["nickname"]).toBeDefined();
  });

  it("selects a type by name when several are declared", () => {
    const source = `
      type Address = { city: string };
      type User = { name: string; address: Address };
    `;
    const user = compile(source, { target: "openai", typeName: "User" });
    expect(JSON.stringify(user.schema)).toContain("address");
    const address = compile(source, { target: "openai", typeName: "Address" });
    expect(JSON.stringify(address.schema)).toContain("city");
    expect(JSON.stringify(address.schema)).not.toContain("address");
  });

  it("supports arrays, tuples, unions, literals, and Record", () => {
    const source = `
      type Payload = {
        tags: string[];
        pair: [string, number];
        status: "on" | "off";
        value: string | number;
        bag: Record<string, number>;
        flags: Array<boolean>;
      };
    `;
    const result = compile(source, "gemini");
    const json = JSON.stringify(result.schema);
    expect(json).toContain("prefixItems");
    expect(json).toContain("anyOf");
    expect(json).toContain("additionalProperties");
    const schema = result.schema as {
      properties: { status?: { enum?: string[] }; value?: { anyOf?: unknown } };
    };
    expect(schema.properties.status?.enum).toEqual(["on", "off"]);
    expect(schema.properties.value?.anyOf).toBeDefined();
  });

  it("compiles string literal unions to enum so MCP hosts stay on the object subset", () => {
    const result = compile(
      `
        export interface GetWeather {
          location: string;
          unit?: "celsius" | "fahrenheit";
        }
      `,
      { target: "mcp", typeName: "GetWeather" },
    );
    const schema = result.schema as {
      required: string[];
      properties: { unit?: { enum?: string[]; anyOf?: unknown } };
    };
    expect(result.compatibility).toBe("lossless");
    expect(schema.required).toEqual(["location"]);
    expect(schema.properties.unit?.enum).toEqual(["celsius", "fahrenheit"]);
    expect(schema.properties.unit?.anyOf).toBeUndefined();
    expect(JSON.stringify(result.schema)).not.toContain("$ref");
  });

  it("treats T | undefined as an optional property", () => {
    const result = compile("type Box = { value: string | undefined }", "anthropic");
    const schema = result.schema as { required: string[] };
    expect(schema.required).toEqual([]);
  });

  it("rejects imports instead of resolving modules", () => {
    expect(() =>
      compile('import { User } from "./user.ts"; export type Out = User;', "openai"),
    ).toThrow(LlmAbiError);
    expect(() =>
      compile('import { User } from "./user.ts"; export type Out = User;', "openai"),
    ).toThrow(/cannot import/);
  });

  it("rejects generic declarations, mapped types, keyof, and enums", () => {
    expect(() => compile("type Box<T> = { value: T }", "openai")).toThrow(/Generic/);
    expect(() => compile("type Mapped = { [K in string]: number }", "openai")).toThrow(/Mapped/);
    expect(() => compile("type Keys = keyof { a: string }", "openai")).toThrow(/keyof/);
    expect(() => compile("enum Color { Red }", "openai")).toThrow(/enum/);
  });

  it("compiles an anonymous object type string", () => {
    const result = compile("{ name: string; age: number }", "openai");
    const schema = result.schema as { required: string[] };
    expect(schema.required).toContain("name");
  });

  it("keeps analyze working on TypeScript input", () => {
    const result = analyze(userSource);
    expect(result.stats.properties).toBeGreaterThan(0);
    expect(result.fingerprint.startsWith("sha256:")).toBe(true);
  });

  it("compiles a recursive type through $defs", () => {
    const result = compile("type Node = { value: string; child?: Node }", "openai");
    expect(JSON.stringify(result.schema)).toContain("$ref");
  });

  it("does not pollute Object.prototype from TypeScript property names", () => {
    const result = compile("type Evil = { __proto__: string; constructor: number }", "openai");
    expect(Object.prototype).not.toHaveProperty("type");
    expect(JSON.stringify(result.schema)).toContain("constructor");
  });
});
