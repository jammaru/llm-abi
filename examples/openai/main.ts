import { compile } from "llm-abi";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", minimum: 0, maximum: 150 },
  },
  required: ["name", "age"],
} as const;

const result = compile(schema, "openai");

const responsesCreate = {
  model: "gpt-5",
  input: "Extract the user.",
  text: {
    format: {
      type: "json_schema",
      name: "user",
      strict: true,
      schema: result.schema,
    },
  },
};

console.log(result.compatibility);
console.log(result.diagnostics.map((item) => item.code));
console.log(responsesCreate.text.format);
console.log(result.validate({ name: "Ada", age: 36 }));
console.log(result.validate({ name: "", age: -1 }));
