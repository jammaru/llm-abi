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

const messagesCreate = {
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Extract the user." }],
  output_config: {
    format: {
      type: "json_schema",
      schema: result.schema,
    },
  },
};

console.log(result.compatibility);
console.log(result.loss);
console.log(messagesCreate.output_config);
console.log(result.validate({ name: "Ada", age: 36 }));
console.log(result.validate({ name: "Ada", age: -1 }));
