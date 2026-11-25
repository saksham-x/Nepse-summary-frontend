import { config } from '@/config/env';
import type { ApiErrorBody } from '@/types/api';

/** Error codes produced by this client rather than the backend. */
export const CLIENT_ERROR = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

/** Any failed API call. `code` is the backend's stable error code when available. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: ApiErrorBody['error']['details'],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export function buildUrl(path: string, params: QueryParams = {}, base = config.apiBaseUrl): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

const isErrorBody = (body: unknown): body is ApiErrorBody =>
  typeof body === 'object' && body !== null && 'error' in body &&
  typeof (body as ApiErrorBody).error?.code === 'string';

export interface RequestOptions {
  params?: QueryParams;
  signal?: AbortSignal;
  /** Non-2xx statuses whose body should still be returned as data (e.g. 503 from /health). */
  acceptStatuses?: number[];
  fetchImpl?: typeof fetch;
}

/** GET a JSON endpoint of nepse-api. Throws ApiError for every failure mode. */
export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(buildUrl(path, options.params), {
      headers: { Accept: 'application/json' },
      credentials: 'include',
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new ApiError(0, CLIENT_ERROR.NETWORK_ERROR, 'Could not reach the API server');
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, CLIENT_ERROR.INVALID_RESPONSE, `The API returned a non-JSON response (HTTP ${res.status})`);
  }

  if (res.ok || options.acceptStatuses?.includes(res.status)) return body as T;

  if (isErrorBody(body)) {
    const { code, message, requestId, details } = body.error;
    throw new ApiError(res.status, code, message, requestId, details);
  }
  throw new ApiError(res.status, CLIENT_ERROR.INVALID_RESPONSE, `Unexpected API response (HTTP ${res.status})`);
}

/** Path segment for a symbol; NEPSE symbols may contain '/' (e.g. NICD83/84). */
export const symbolPath = (symbol: string) => encodeURIComponent(symbol);

/**
 * Sends a write (POST/PATCH/DELETE) to nepse-api. The session cookie goes along
 * because the API is on this site's origin (directly or through the dev proxy).
 * Returns the response's `data`, or undefined for 204.
 */
export async function apiSend<T = unknown>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method,
      credentials: 'include',
      headers: { Accept: 'application/json', ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}) },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, CLIENT_ERROR.NETWORK_ERROR, 'Could not reach the API server');
  }
  if (res.status === 204) return undefined as T;
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, CLIENT_ERROR.INVALID_RESPONSE, `The API returned a non-JSON response (HTTP ${res.status})`);
  }
  if (res.ok) return (json as { data: T }).data;
  if (isErrorBody(json)) {
    const { code, message, requestId, details } = json.error;
    throw new ApiError(res.status, code, message, requestId, details);
  }
  throw new ApiError(res.status, CLIENT_ERROR.INVALID_RESPONSE, `Unexpected API response (HTTP ${res.status})`);
}

/** GET returning just `data`. */
export const apiData = async <T>(path: string, options: RequestOptions = {}): Promise<T> => (await apiGet<{ data: T }>(path, options)).data;
