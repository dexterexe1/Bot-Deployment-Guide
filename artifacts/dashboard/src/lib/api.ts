// In production the API lives on a different origin (united-bunnies-1.onrender.com).
// VITE_API_BASE_URL is set at build time on Render (e.g. https://united-bunnies-1.onrender.com).
// In dev (Replit) it is empty, so relative /api/v1 paths hit the local proxy as before.
const API_BASE = '/api/v1'

interface ApiError {
  code: string
  message: string
  requestId: string
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export async function apiRequest<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    })
    const body = await res.json()
    if (!res.ok || body.ok === false) {
      return {
        ok: false,
        error: body.error ?? {
          code: String(res.status),
          message: body.message ?? res.statusText,
          requestId: '',
        },
      }
    }
    return { ok: true, data: body.data ?? body }
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK_ERROR', message: 'Network request failed', requestId: '' },
    }
  }
}

export function isApiError<T>(
  result: ApiResult<T>,
): result is { ok: false; error: ApiError } {
  return result.ok === false
}

/** Axios-style helper used by features that expect { data } or throw on error */
async function req<T>(path: string, init?: RequestInit): Promise<{ data: T }> {
  const result = await apiRequest<T>(path, init)
  if (!result.ok) throw new Error(result.error.message)
  return { data: result.data }
}

export const api = {
  get: <T>(path: string) => req<T>(path),
  post: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    req<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => req<T>(path, { method: 'DELETE' }),
}
