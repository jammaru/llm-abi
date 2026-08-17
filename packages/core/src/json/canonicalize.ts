import { createRecord, isPlainObject, setRecord } from "./safe-record.ts";

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const sorted = createRecord();
  const keys = Object.keys(value).toSorted();
  for (const key of keys) {
    setRecord(sorted, key, sortValue(value[key]));
  }
  return sorted;
}
