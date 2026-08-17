import { bench } from "vitest";
import { compile } from "../packages/core/src/compile.ts";

const schema = {
  type: "object",
  properties: Object.fromEntries(
    Array.from({ length: 50 }, (_, index) => [
      `field${index}`,
      {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          age: { type: "number", minimum: 0, maximum: 150 },
        },
        required: ["name"],
      },
    ]),
  ),
};

bench("compile 50 nested objects × openai", () => {
  compile(schema, "openai");
});

bench("compile 50 nested objects × anthropic", () => {
  compile(schema, "anthropic");
});
