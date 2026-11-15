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
    throw new ApiError("network", "Não foi possível acessar o servidor. Verifique se a API está em execução.", 0);
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
    throw new ApiError("http_" + res.status, `O servidor respondeu com erro ${res.status}.`, res.status);
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
        return "O período escolhido é longo demais para esta área. Escolha um período menor.";
      case "region_not_found":
        return "Esta região não existe. Escolha outra na lista.";
      case "pass_not_found":
        return "Esta passagem não consta no catálogo da NASA.";
      case "story_not_found":
        return "Esta história não existe.";
      case "invalid_query":
        return "O endereço contém parâmetros inválidos.";
      case "state_only":
        return "Esta informação está disponível apenas para estados.";
      case "unsupported_area":
        return "A área selecionada não está disponível no snapshot atual do IPEA.";
      case "upstream_unavailable":
        return "A fonte externa está indisponível no momento.";
      default:
        if (err.status >= 500 || err.status === 0) return "A fonte de dados não respondeu. Tente novamente em instantes.";
        return "Não foi possível consultar esta fonte. Verifique os parâmetros e tente novamente.";
    }
  }
  return "Ocorreu um erro ao carregar os dados.";
}
