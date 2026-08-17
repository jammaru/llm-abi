export type Compatibility = "lossless" | "runtime-safe" | "lossy" | "unsupported";

export interface GithubEvent {
  readonly pull_request?: {
    readonly number: number;
    readonly base: { readonly sha: string };
    readonly head: { readonly sha: string };
  };
}

export interface ActionInputs {
  readonly patterns: readonly string[];
  readonly changedOnly: boolean;
  readonly workingDirectory: string;
  readonly baseRef?: string;
  readonly comment: boolean;
  readonly githubToken?: string;
}

export type FileStatus = "added" | "copied" | "existing" | "modified" | "renamed";

export interface SelectedFile {
  readonly path: string;
  readonly basePath?: string;
  readonly status: FileStatus;
}

export interface SelectionResult {
  readonly files: readonly SelectedFile[];
  readonly baseRef?: string;
}

export interface TargetCheck {
  readonly id: string;
  readonly compatibility: Compatibility;
  readonly tokens?: number;
}

export interface NormalizedCheck {
  readonly fingerprint: string;
  readonly targets: readonly TargetCheck[];
}

export interface FileReport {
  readonly path: string;
  readonly current: NormalizedCheck;
  readonly base?: NormalizedCheck;
}

export interface ResultsOutput {
  readonly files: readonly FileReport[];
  readonly unsupportedCount: number;
}

export class OperationalError extends Error {
  override readonly name = "OperationalError";
}
