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

export async function upsertComment(options: UpsertCommentOptions): Promise<string> {
  const apiUrl = options.apiUrl ?? "https://api.github.com";
  const comments: IssueComment[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await request<IssueComment[]>(
      `${apiUrl}/repos/${options.repository}/issues/${String(options.issueNumber)}/comments?per_page=100&page=${String(page)}`,
      options.token,
    );
    comments.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }
  const existing = comments.find(
    (comment) => comment.user?.type === "Bot" && comment.body?.includes(COMMENT_MARKER),
  );
  const url = existing
    ? `${apiUrl}/repos/${options.repository}/issues/comments/${String(existing.id)}`
    : `${apiUrl}/repos/${options.repository}/issues/${String(options.issueNumber)}/comments`;
  const response = await request<IssueComment>(url, options.token, {
    method: existing ? "PATCH" : "POST",
    body: JSON.stringify({ body: options.body }),
  });
  return response.html_url ?? "";
}

async function request<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "llm-abi-action",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new OperationalError(
      `GitHub comment request failed with ${String(response.status)} ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
}
