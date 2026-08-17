import { compile } from "llm-abi";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", minimum: 0, maximum: 150 },
  },
  required: ["name", "age"],
} as const;

const openai = compile(schema, "openai");
const anthropic = compile(schema, "anthropic");

const generateObject = {
  model: "openai/gpt-5",
  schema: openai.schema,
  prompt: "Extract the user.",
};

const weather = compile(
  {
    type: "object",
    properties: {
      location: { type: "string" },
      unit: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["location"],
  },
  "openai",
);

const tools = {
  get_weather: {
    description: "Look up the weather for a location.",
    inputSchema: weather.schema,
  },
};

console.log(openai.compatibility);
console.log(anthropic.compatibility);
console.log(generateObject.schema);
console.log(tools.get_weather.inputSchema);
console.log(openai.validate({ name: "Ada", age: 36 }));
console.log(openai.validate({ name: "", age: -1 }));
