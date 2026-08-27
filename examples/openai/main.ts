import { checkRequest, compile } from "llm-abi";

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

const request = checkRequest({
  provider: "openai",
  model: "gpt-5.6-terra",
  endpoint: "chat-completions",
  tools: true,
});

console.log(result.compatibility);
console.log(result.diagnostics.map((item) => item.code));
console.log(responsesCreate.text.format);
console.log(result.validate({ name: "Ada", age: 36 }));
console.log(result.validate({ name: "", age: -1 }));
console.log(request.compatibility);
console.log(request.effective.reasoningEffort);
console.log(request.fixes.map((fix) => fix.endpoint ?? fix.reasoningEffort));
