import { compile } from "sabijs";

const schema = {
  "~standard": {
    version: 1 as const,
    vendor: "example",
    validate: (value: unknown) => ({ value }),
    jsonSchema: {
      input: () => ({ type: "string" }),
      output: () => ({
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      }),
    },
  },
};

const result = compile(schema, "openai");
console.log(result.compatibility);
