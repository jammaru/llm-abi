import { checkDeployment } from "llm-abi";
import type { CheckDeploymentResult, DeploymentDescriptor } from "llm-abi";
import type { SchemaInput } from "llm-abi";

export interface LocalImportRow {
  readonly model: string;
  readonly runtime: string;
  readonly format?: string;
  readonly compatibility: string;
  readonly coverage: string;
  readonly schemaTarget?: string;
}

export type LocalImportResult =
  | { readonly ok: true; readonly rows: readonly LocalImportRow[] }
  | { readonly ok: false; readonly message: string };

export function importLocalDoctor(
  raw: string,
  schema: SchemaInput,
  typeName?: string,
): LocalImportResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, rows: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, message: "local doctor JSON is not valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, message: "local doctor JSON must be an object." };
  }
  const record = parsed as { schemaVersion?: unknown; deployments?: unknown };
  if (record.schemaVersion !== 1 || !Array.isArray(record.deployments)) {
    return { ok: false, message: "Paste output from llm-abi local doctor --json." };
  }
  const rows: LocalImportRow[] = [];
  for (const item of record.deployments.slice(0, 64)) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    for (const deployment of descriptorsFromDoctor(item)) {
      if (rows.length >= 64) {
        return { ok: true, rows };
      }
      try {
        const result: CheckDeploymentResult = checkDeployment({
          schema,
          typeName,
          deployment,
          request: { endpoint: "chat-completions", structuredOutput: true, tools: true },
        });
        rows.push({
          model: result.deployment.model.id,
          runtime: result.deployment.runtime.kind,
          format: result.deployment.model.format,
          compatibility: result.compatibility,
          coverage: result.coverage,
          schemaTarget: result.deployment.schemaTarget,
        });
      } catch {
        continue;
      }
    }
  }
  return { ok: true, rows };
}

function descriptorsFromDoctor(item: object): readonly DeploymentDescriptor[] {
  const record = item as {
    detection?: { runtime?: DeploymentDescriptor["runtime"]["kind"] };
    models?: readonly {
      id?: string;
      format?: DeploymentDescriptor["model"]["format"];
      engine?: string;
    }[];
    deployment?: DeploymentDescriptor;
  };
  const runtime = record.detection?.runtime ?? record.deployment?.runtime.kind;
  if (runtime && record.models && record.models.length > 0) {
    return record.models
      .flatMap((model): readonly DeploymentDescriptor[] => {
        const id = model.id;
        if (typeof id !== "string" || id.length === 0) {
          return [];
        }
        return [
          {
            runtime: {
              kind: runtime,
              apiSurface: runtime === "ollama" ? "mixed" : "openai",
              engine: engineFromDoctor(model.engine, record.deployment?.runtime.engine),
            },
            model: {
              id,
              format: model.format,
            },
          },
        ];
      })
      .slice(0, 64);
  }
  return record.deployment ? [record.deployment] : [];
}

function engineFromDoctor(
  engine: string | undefined,
  fallback: DeploymentDescriptor["runtime"]["engine"],
): DeploymentDescriptor["runtime"]["engine"] {
  if (engine === "llamacpp" || engine === "mlx" || engine === "outlines" || engine === "ollama") {
    return { kind: engine };
  }
  return fallback;
}
