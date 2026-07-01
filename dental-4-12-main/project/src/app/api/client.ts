import { enqueueWrite } from '../offline/db';
import { notifyQueueChange } from '../offline/queueEvents';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Access tokens expire after 15 minutes (see server/utils/jwt.ts). Once
// requireAuth is enforced on every route, a 401 mid-session is expected
// behavior, not an error — transparently refresh once and retry rather than
// breaking the app or forcing a re-login every 15 minutes.
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 401 && !isRetry && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Writes (POST/PUT/PATCH) queue to IndexedDB instead of failing when
// there's no network — per CLAUDE.md's PWA/OFFLINE spec (FIFO, synced when
// back online via queueProcessor.ts / Sprint 20's Workbox background sync).
// GET is never queued: there's nothing to sync, and a failed read should
// just fail so the UI can show cached/stale data as appropriate.
// /auth/* is never queued either — logging in/out/refreshing requires a
// real synchronous round trip (a JWT cookie can't be "synced later"); a
// queued login would look like it succeeded without ever authenticating
// anything. These just fail normally when offline, like a GET does.
function isAuthPath(path: string): boolean {
  return path.startsWith('/auth/');
}

async function writeRequest<T>(path: string, method: 'POST' | 'PUT' | 'PATCH', body?: unknown): Promise<T> {
  if (isAuthPath(path)) {
    return request<T>(path, { method, body: body ? JSON.stringify(body) : undefined });
  }
  if (!navigator.onLine) {
    return queueWrite<T>(path, method, body);
  }
  try {
    return await request<T>(path, { method, body: body ? JSON.stringify(body) : undefined });
  } catch (err) {
    // A real server rejection (validation error, 403, etc.) reached the
    // server and should surface normally — only an actual network failure
    // (fetch couldn't even complete) gets queued.
    if (err instanceof ApiError) throw err;
    return queueWrite<T>(path, method, body);
  }
}

async function queueWrite<T>(path: string, method: 'POST' | 'PUT' | 'PATCH', body: unknown): Promise<T> {
  const queued = await enqueueWrite({ endpoint: path, method, body });
  notifyQueueChange();
  // Synthetic optimistic response so calling code (which expects the
  // created/updated record back) can proceed normally. Real hooks merge
  // pending queue items into their lists using this same shape — see
  // hooks/useOfflineQueue.ts.
  return {
    ...(typeof body === 'object' && body ? body : {}),
    _id: `pending-${queued.id}`,
    _pending: true,
  } as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => writeRequest<T>(path, "POST", body),
  put: <T>(path: string, body?: unknown) => writeRequest<T>(path, "PUT", body),
  patch: <T>(path: string, body?: unknown) => writeRequest<T>(path, "PATCH", body),
};
