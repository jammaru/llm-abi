import { COMMENT_MARKER } from "./render.ts";
import { OperationalError } from "./types.ts";

interface UpsertCommentOptions {
  readonly token: string;
  readonly repository: string;
  readonly issueNumber: number;
  readonly body: string;
  readonly apiUrl?: string;
}

interface IssueComment {
  readonly id: number;
  readonly body?: string | null;
  readonly html_url?: string;
  readonly user?: { readonly type?: string } | null;
}

export function resolveGithubApiUrl(apiUrl: string | undefined): string {
  const resolved = apiUrl || "https://api.github.com";
  let parsed: URL;
  try {
    parsed = new URL(resolved);
  } catch {
    throw new OperationalError("Invalid GITHUB_API_URL");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new OperationalError("GITHUB_API_URL must be https");
  }
  return parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/u, ""));
}

export function assertRepository(repository: string): string {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) {
    throw new OperationalError("Invalid GITHUB_REPOSITORY");
  }
  return repository;
}

export function assertIssueNumber(issueNumber: number): number {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new OperationalError("Invalid pull request number");
  }
  return issueNumber;
}

export async function upsertComment(options: UpsertCommentOptions): Promise<string> {
  const apiUrl = resolveGithubApiUrl(options.apiUrl);
  const repository = assertRepository(options.repository);
  const issueNumber = assertIssueNumber(options.issueNumber);
  const comments = await listIssueComments(apiUrl, repository, issueNumber, options.token, 1, []);
  const existing = comments.find(
    (comment) => comment.user?.type === "Bot" && comment.body?.includes(COMMENT_MARKER),
  );
  const url = existing
    ? `${apiUrl}/repos/${repository}/issues/comments/${String(existing.id)}`
    : `${apiUrl}/repos/${repository}/issues/${String(issueNumber)}/comments`;
  const response = await request(url, options.token, {
    method: existing ? "PATCH" : "POST",
    body: JSON.stringify({ body: options.body }),
  });
  if (
    !isRecord(response) ||
    (response.html_url !== undefined && typeof response.html_url !== "string")
  ) {
    throw new OperationalError("GitHub comment response was invalid");
  }
  return typeof response.html_url === "string" ? response.html_url : "";
}

async function listIssueComments(
  apiUrl: string,
  repository: string,
  issueNumber: number,
  token: string,
  page: number,
  comments: readonly IssueComment[],
): Promise<readonly IssueComment[]> {
  const batch = await requestCommentPage(apiUrl, repository, issueNumber, token, page);
  const next = [...comments, ...batch];
  if (batch.length < 100 || page >= 10) {
    return next;
  }
  return listIssueComments(apiUrl, repository, issueNumber, token, page + 1, next);
}

async function requestCommentPage(
  apiUrl: string,
  repository: string,
  issueNumber: number,
  token: string,
  page: number,
): Promise<readonly IssueComment[]> {
  const batch = await request(
    `${apiUrl}/repos/${repository}/issues/${String(issueNumber)}/comments?per_page=100&page=${String(page)}`,
    token,
  );
  if (!Array.isArray(batch)) {
    throw new OperationalError("GitHub comment list was not an array");
  }
  return batch.map(toIssueComment);
}

function toIssueComment(value: unknown): IssueComment {
  if (!isRecord(value) || typeof value.id !== "number") {
    throw new OperationalError("GitHub comment response was invalid");
  }
  const user = value.user;
  return {
    id: value.id,
    body: typeof value.body === "string" ? value.body : undefined,
    html_url: typeof value.html_url === "string" ? value.html_url : undefined,
    user: isRecord(user) && typeof user.type === "string" ? { type: user.type } : undefined,
  };
}

async function request(url: string, token: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    redirect: "error",
    headers: {
      ...init.headers,
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "llm-abi-action",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new OperationalError(
      `GitHub comment request failed with ${String(response.status)} ${response.statusText}`,
    );
  }
  return (await response.json()) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
