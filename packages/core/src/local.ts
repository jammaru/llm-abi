export { discoverLocalDeployments } from "./local/discover.ts";
export { probeDeployment } from "./local/probe.ts";
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
