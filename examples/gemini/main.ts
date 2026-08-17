import { compile } from "llm-abi";

const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    score: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["title", "score"],
} as const;

const result = compile(schema, "gemini");

const interactionsCreate = {
  model: "gemini-3-flash",
  input: "Score this title.",
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: result.schema,
  },
};

console.log(result.compatibility);
console.log(result.diagnostics.map((item) => item.code));
console.log(interactionsCreate.response_format);
console.log(result.validate({ title: "Ada", score: 0.9 }));
console.log(result.validate({ title: "Ada", score: 2 }));
