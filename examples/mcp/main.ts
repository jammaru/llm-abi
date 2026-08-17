import { compile } from "llm-abi";

const source = `
export interface GetWeather {
  location: string;
  unit?: "celsius" | "fahrenheit";
}
`;

const result = compile(source, { target: "mcp", typeName: "GetWeather" });

const tool = {
  name: "get_weather",
  description: "Look up the weather for a location.",
  inputSchema: result.schema,
};

const withDefs = compile(
  {
    type: "object",
    properties: { author: { $ref: "#/$defs/Person" } },
    required: ["author"],
    $defs: {
      Person: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  },
  "mcp",
);

const oneOf = compile(
  {
    type: "object",
    properties: {
      value: { oneOf: [{ type: "string" }, { type: "number" }] },
    },
    required: ["value"],
  },
  "mcp",
);

console.log(result.compatibility);
console.log(tool);
console.log(JSON.stringify(withDefs.schema).includes("$ref"));
console.log(oneOf.compatibility);
console.log(result.validate({ location: "Tokyo" }));
console.log(result.validate({}));
