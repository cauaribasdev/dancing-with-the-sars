import type { ApiErrorBody } from "./types";

/**
 * API base. In dev, "/api" goes through the Vite proxy to http://localhost:8787.
 * For deployed builds, set VITE_API_BASE (e.g. https://api.example.com/api).
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/+$/, "");

/** Typed error: `code` comes from the API's `{error:{code,message}}` body, or is a local code. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly issues?: ApiErrorBody["error"]["issues"];

  constructor(code: string, message: string, status: number, issues?: ApiErrorBody["error"]["issues"]) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.issues = issues;
  }
}

export type QueryParams = Record<string, string | number | null | undefined>;

export function buildUrl(path: string, params?: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiErrorBody).error?.code === "string"
  );
}

export async function apiGet<T>(path: string, params?: QueryParams, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), { signal, headers: { Accept: "application/json" } });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError("network", "Could not reach the server. Check that the API is running.", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // empty or non-JSON body (e.g. the proxy answered while the API is down)
  }

  if (!res.ok || isErrorBody(body)) {
    if (isErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message, res.status, body.error.issues);
    }
    throw new ApiError("http_" + res.status, `The server answered ${res.status}.`, res.status);
  }
  return body as T;
}

/** Message to show to people. Known codes get their own sentence. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "network":
        return err.message;
      case "window_too_large":
        return "The chosen period is too long for this area. Pick a shorter period.";
      case "region_not_found":
        return "This region does not exist. Pick another one from the list.";
      case "pass_not_found":
        return "This pass is not in the NASA catalog.";
      case "story_not_found":
        return "This story does not exist.";
      case "invalid_query":
        return "The address has invalid parameters.";
      default:
        if (err.status >= 500 || err.status === 0) return "The NASA catalog did not answer. Try again in a moment.";
        return err.message;
    }
  }
  return "Something went wrong while loading the data.";
}
