import { checkDeployment } from "../deployment/check.ts";
import type { CheckDeploymentResult, DeploymentRequest } from "../deployment/types.ts";
import type { SchemaInput } from "../types.ts";
import { descriptorForModel } from "./discover.ts";
import { probeDeployment } from "./probe.ts";
import type { RuntimeTransport } from "./transport.ts";
import type { DiscoveredDeployment, ProbeDeploymentResult } from "./types.ts";

export interface MatrixRow {
  readonly baseURL: string;
  readonly endpointKind: string;
  readonly runtime: string;
  readonly model: string;
  readonly format?: string;
  readonly schemaTarget?: string;
  readonly staticCompatibility: string;
  readonly coverage: string;
  readonly probe?: ProbeDeploymentResult;
  readonly check: CheckDeploymentResult;
}

export interface MatrixResult {
  readonly schemaVersion: 1;
  readonly command: "local-matrix";
  readonly rows: readonly MatrixRow[];
}

export async function matrixLocalDeployments(options: {
  readonly discovered: readonly DiscoveredDeployment[];
  readonly schema?: SchemaInput;
  readonly typeName?: string;
  readonly request?: DeploymentRequest;
  readonly probe?: boolean;
  readonly transport?: RuntimeTransport;
}): Promise<MatrixResult> {
  const request: DeploymentRequest = options.request ?? {
    endpoint: "chat-completions",
    structuredOutput: true,
    tools: true,
  };
  const rows: MatrixRow[] = [];
  for (const item of options.discovered) {
    if (!item.detection.runtime) {
      continue;
    }
    for (const model of item.models) {
      const descriptor = descriptorForModel(item.detection.runtime, model);
      const check = checkDeployment({
        schema: options.schema,
        typeName: options.typeName,
        deployment: descriptor,
        request,
      });
      let probe: ProbeDeploymentResult | undefined;
      if (options.probe) {
        // oxlint-disable-next-line no-await-in-loop -- matrix probes stay serial to avoid evicting models
        probe = await probeDeployment({
          baseURL: item.baseURL,
          model: model.id,
          input: {
            schema: options.schema,
            typeName: options.typeName,
            deployment: descriptor,
            request,
          },
          transport: options.transport,
        });
      }
      rows.push({
        baseURL: item.baseURL,
        endpointKind: item.endpointKind,
        runtime: item.detection.runtime,
        model: model.id,
        format: model.format,
        schemaTarget: check.deployment.schemaTarget,
        staticCompatibility: check.compatibility,
        coverage: check.coverage,
        probe,
        check,
      });
    }
  }
  return { schemaVersion: 1, command: "local-matrix", rows };
}
