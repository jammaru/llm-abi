import { compile } from "llm-abi";

const schema = {
  "~standard": {
    version: 1 as const,
    vendor: "example",
    validate: (value: unknown) => {
      if (typeof value === "object" && value !== null && "id" in value) {
        return { value };
      }
      return { issues: [{ message: "Expected an object with id." }] };
    },
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
const responsesCreate = {
  model: "gpt-5",
  input: "Return an id.",
  text: {
    format: {
      type: "json_schema",
      name: "id",
      strict: true,
      schema: result.schema,
    },
  },
};

console.log(result.compatibility);
console.log(responsesCreate.text.format.schema);
console.log(result.validate({ id: "user_1" }));
console.log(result.validate({}));
