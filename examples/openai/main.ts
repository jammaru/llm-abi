import { compile } from "sabijs";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", minimum: 0, maximum: 150 },
  },
  required: ["name", "age"],
} as const;

const result = compile(schema, "openai");

console.log(result.compatibility);
console.log(result.schema);
