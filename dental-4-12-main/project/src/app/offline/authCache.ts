// Lets a previously-valid session survive a page reload while offline.
// Auth itself is never queued (see api/client.ts) — logging in requires a
// real round trip — but if you were already validly logged in and simply
// lose connectivity, you shouldn't be locked out of the app you were just
// using. Only used as a fallback when /api/auth/me fails due to a network
// error, never when the server actually says 401 (real logout).
import type { ApiRole } from '../api/types';

const KEY = 'floral_cached_user';

export interface CachedUser {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  schools: string[];
}

export function saveUserCache(user: CachedUser): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable (private browsing, quota) — offline session
    // restore just won't work this time, not worth failing the login over.
  }
}

export function loadUserCache(): CachedUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUserCache(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
