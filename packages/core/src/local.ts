export {
  DEFAULT_LOCAL_ENDPOINTS,
  discoverLocalDeployments,
  pickLoadedDeployment,
  selectProbeDeployment,
} from "./local/discover.ts";
export type { ProbeSelection } from "./local/discover.ts";
export { probeDeployment } from "./local/probe.ts";
export {
  createDeploymentLock,
  deploymentDiff,
  diffDeploymentLocks,
  parseDeploymentLock,
} from "./local/lock.ts";
export type { DeploymentLock, LockDiff, LockDriftKind } from "./local/lock.ts";
export { matrixLocalDeployments } from "./local/matrix.ts";
export type { MatrixResult, MatrixRow } from "./local/matrix.ts";
export { descriptorForModel } from "./local/discover.ts";
export { createFetchTransport } from "./local/transport.ts";
export type { RuntimeTransport } from "./local/transport.ts";
export type {
  DetectionConfidence,
  DetectionEvidence,
  DetectionResult,
  DiscoverOptions,
  DiscoveredDeployment,
  DiscoveredModel,
  ProbeDeploymentResult,
  ProbeMechanism,
  ProbeObservation,
  ProbeStatus,
} from "./local/types.ts";
export type { ProbeDeploymentOptions } from "./local/probe.ts";
