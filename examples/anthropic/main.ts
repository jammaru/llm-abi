import { compile } from "llm-abi";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", minimum: 0, maximum: 150 },
  },
  required: ["name", "age"],
} as const;

const result = compile(schema, "anthropic");

console.log(result.compatibility);
console.log(result.loss);
console.log(result.validate({ name: "Ada", age: -1 }));
