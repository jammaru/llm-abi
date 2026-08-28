import { fingerprint, fingerprintJson } from "../fingerprint.ts";
import { publicModelId } from "../deployment/model/identity.ts";
import type { CheckDeploymentResult, DeploymentRequest } from "../deployment/types.ts";
import type { SchemaInput } from "../types.ts";
import type { ProbeDeploymentResult } from "./types.ts";

export type LockDriftKind = "contract" | "deployment" | "profile";

export interface DeploymentLock {
  readonly lockVersion: 1;
  readonly schemaVersion: 1;
  readonly generatedBy: {
    readonly name: "llm-abi";
    readonly version: string;
  };
  readonly fingerprints: {
    readonly contract: string;
    readonly deployment: string;
    readonly evaluation: string;
  };
  readonly contract: {
    readonly fingerprint: string;
    readonly request: DeploymentRequest;
  };
  readonly deployment: {
    readonly fingerprint: string;
    readonly runtime: {
      readonly kind: string;
      readonly version: string | null;
      readonly apiSurface: string;
      readonly engine: string | null;
    };
    readonly model: {
      readonly id: string;
      readonly family: string | null;
      readonly format: string | null;
      readonly quantization: string | null;
      readonly digest: string | null;
      readonly contextLength: number | null;
    };
  };
  readonly profiles: {
    readonly schema: { readonly id: string; readonly revision: string } | null;
    readonly runtime: { readonly id: string; readonly revision: string } | null;
    readonly model: { readonly id: string; readonly revision: string } | null;
  };
  readonly evaluation: {
    readonly compatibility: string;
    readonly coverage: string;
  };
  readonly probe: {
    readonly suite: string | null;
    readonly observations: readonly { readonly id: string; readonly status: string }[];
  } | null;
}

export interface LockDiff {
  readonly schemaVersion: 1;
  readonly drifts: readonly LockDriftKind[];
  readonly contract: boolean;
  readonly deployment: boolean;
  readonly profile: boolean;
  readonly left: DeploymentLock["fingerprints"];
  readonly right: DeploymentLock["fingerprints"];
}

export function createDeploymentLock(input: {
  readonly schema?: SchemaInput;
  readonly typeName?: string;
  readonly request: DeploymentRequest;
  readonly check: CheckDeploymentResult;
  readonly probe?: ProbeDeploymentResult;
  readonly packageVersion: string;
}): DeploymentLock {
  const deployment = redactDeployment(input.check.deployment);
  const contractFingerprint = fingerprintJson({
    schema:
      input.schema === undefined ? null : fingerprint(input.schema, { typeName: input.typeName }),
    request: input.request,
  });
  const deploymentFingerprint = fingerprintJson(deployment);
  const profiles = {
    schema: input.check.schema
      ? { id: input.check.schema.target.id, revision: input.check.schema.target.revision }
      : null,
    runtime: input.check.runtime.profile
      ? { id: input.check.runtime.profile.id, revision: input.check.runtime.profile.revision }
      : null,
    model: input.check.model.profile
      ? { id: input.check.model.profile.id, revision: input.check.model.profile.revision }
      : null,
  };
  const evaluationFingerprint = fingerprintJson({
    contract: contractFingerprint,
    deployment: deploymentFingerprint,
    profiles,
    evaluation: {
      compatibility: input.check.compatibility,
      coverage: input.check.coverage,
    },
  });
  return {
    lockVersion: 1,
    schemaVersion: 1,
    generatedBy: { name: "llm-abi", version: input.packageVersion },
    fingerprints: {
      contract: contractFingerprint,
      deployment: deploymentFingerprint,
      evaluation: evaluationFingerprint,
    },
    contract: {
      fingerprint: contractFingerprint,
      request: input.request,
    },
    deployment: {
      fingerprint: deploymentFingerprint,
      runtime: deployment.runtime,
      model: deployment.model,
    },
    profiles,
    evaluation: {
      compatibility: input.check.compatibility,
      coverage: input.check.coverage,
    },
    probe: input.probe
      ? {
          suite: input.probe.observations.some((item) => item.id.startsWith("F-"))
            ? "full"
            : "smoke",
          observations: input.probe.observations.map((item) => ({
            id: item.id,
            status: item.status,
          })),
        }
      : null,
  };
}

export function diffDeploymentLocks(left: DeploymentLock, right: DeploymentLock): LockDiff {
  const contract = left.fingerprints.contract !== right.fingerprints.contract;
  const deployment = left.fingerprints.deployment !== right.fingerprints.deployment;
  const profile =
    JSON.stringify(left.profiles) !== JSON.stringify(right.profiles) ||
    left.generatedBy.version !== right.generatedBy.version;
  const drifts: LockDriftKind[] = [];
  if (contract) {
    drifts.push("contract");
  }
  if (deployment) {
    drifts.push("deployment");
  }
  if (profile) {
    drifts.push("profile");
  }
  return {
    schemaVersion: 1,
    drifts,
    contract,
    deployment,
    profile,
    left: left.fingerprints,
    right: right.fingerprints,
  };
}

export function parseDeploymentLock(value: unknown): DeploymentLock | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as DeploymentLock;
  if (record.lockVersion !== 1 || record.schemaVersion !== 1) {
    return undefined;
  }
  if (typeof record.fingerprints?.contract !== "string") {
    return undefined;
  }
  return record;
}

function redactDeployment(
  deployment: CheckDeploymentResult["deployment"],
): DeploymentLock["deployment"] {
  return {
    fingerprint: "",
    runtime: {
      kind: deployment.runtime.kind,
      version: deployment.runtime.version ?? null,
      apiSurface: deployment.runtime.apiSurface,
      engine: deployment.runtime.engine?.kind ?? null,
    },
    model: {
      id: publicModelId(deployment.model.id),
      family: deployment.model.family ?? null,
      format: deployment.model.format ?? null,
      quantization: deployment.model.quantization ?? null,
      digest: deployment.model.digest ?? null,
      contextLength: deployment.model.contextLength ?? null,
    },
  };
}

export function lockHasSecrets(lock: DeploymentLock): boolean {
  const blob = JSON.stringify(lock).toLowerCase();
  return (
    blob.includes("authorization") ||
    blob.includes("api_key") ||
    blob.includes("api-key") ||
    blob.includes("bearer ") ||
    /[a-z]:\\/i.test(blob) ||
    blob.includes("/users/") ||
    blob.includes("/home/")
  );
}
