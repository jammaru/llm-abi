import { compile } from "sabijs";

const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    score: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["title", "score"],
} as const;

const result = compile(schema, "gemini");

console.log(result.compatibility);
console.log(result.schema);
