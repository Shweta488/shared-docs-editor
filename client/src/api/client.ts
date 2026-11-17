import type { ApiErrorBody } from '../../../shared/types';

const TOKEN_KEY = 'docs.token';

// localStorage can throw in private mode or when storage is blocked.
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do: the user just stays signed in for this tab only.
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Calls the API with the stored token and turns error responses into ApiError. */
export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach the server. Check your connection.');
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null;

  if (!res.ok) {
    const error = (data as ApiErrorBody | null)?.error;
    // An expired or bad session sends the user back to login. The login call
    // itself is excluded so a wrong email shows its own message instead.
    if (res.status === 401 && path !== '/auth/login') {
      setToken(null);
      window.location.assign('/login?expired=1');
    }
    throw new ApiError(res.status, error?.code ?? 'INTERNAL', error?.message ?? 'Something went wrong.');
  }
  return data as T;
}
