/**
 * Axios client — the single HTTP boundary (PART 11).
 *
 * - Attaches the access token; on 401 performs ONE single-flight refresh
 *   (rotating refresh tokens, matching backend SEC-JWT-2) then retries once.
 * - Normalizes every failure into the backend's problem envelope (ApiError)
 *   so forms get field errors and toasts get stable codes + traceId.
 * - 429 honors Retry-After with a single jittered retry (rate-limit etiquette).
 *
 * Token storage: in-memory first (XSS-hardening), mirrored to sessionStorage
 * for reload survival. The refresh token never leaves this module.
 */
import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import type { ApiProblem, TokenPair } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

// ── Token store ───────────────────────────────────────────────────────────────
let accessToken: string | null = sessionStorage.getItem("tc-at");
let refreshToken: string | null = sessionStorage.getItem("tc-rt");

export function setTokens(pair: TokenPair | null): void {
  accessToken = pair?.access_token ?? null;
  refreshToken = pair?.refresh_token ?? null;
  if (pair) {
    sessionStorage.setItem("tc-at", pair.access_token);
    sessionStorage.setItem("tc-rt", pair.refresh_token);
  } else {
    sessionStorage.removeItem("tc-at");
    sessionStorage.removeItem("tc-rt");
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Typed API error carrying the backend problem document. */
export class ApiError extends Error {
  constructor(public readonly problem: ApiProblem) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
  }
  get code(): string {
    return this.problem.code;
  }
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.problem.errors ?? []) out[e.field] = e.messages.join(" ");
    return out;
  }
}

export const http = axios.create({ baseURL: BASE_URL, timeout: 20_000 });

http.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Single-flight refresh ─────────────────────────────────────────────────────
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  refreshing ??= axios
    .post<TokenPair>(`${BASE_URL}/auth/token/refresh`, null, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    })
    .then((res) => {
      setTokens(res.data);
      return true;
    })
    .catch(() => {
      setTokens(null); // family revoked / expired → session over
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function toProblem(error: AxiosError): ApiProblem {
  const data = error.response?.data as Partial<ApiProblem> | undefined;
  if (data?.code) return data as ApiProblem;
  // Network / non-envelope failure → synthesize a consistent shape.
  return {
    status: error.response?.status ?? 0,
    code: error.response ? "UNEXPECTED_RESPONSE" : "NETWORK_ERROR",
    title: error.response ? "Unexpected server response" : "You appear to be offline",
    detail: error.response ? error.message : "Check your connection and try again.",
    errors: [],
    traceId: (error.response?.headers?.["x-request-id"] as string) ?? "",
  };
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { _retried?: boolean; _rlRetried?: boolean };

    // 401 → one refresh + one retry (skip for the auth endpoints themselves).
    const isAuthCall = (config.url ?? "").startsWith("/auth/");
    if (error.response?.status === 401 && !config._retried && !isAuthCall) {
      config._retried = true;
      if (await tryRefresh()) {
        config.headers = { ...config.headers, Authorization: `Bearer ${accessToken}` };
        return http.request(config);
      }
      window.dispatchEvent(new CustomEvent("tc:session-expired"));
    }

    // 429 → single retry after Retry-After (+ jitter).
    if (error.response?.status === 429 && !config._rlRetried) {
      config._rlRetried = true;
      const wait = Number(error.response.headers["retry-after"] ?? 1) * 1000 + Math.random() * 250;
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
      return http.request(config);
    }

    throw new ApiError(toProblem(error));
  },
);
