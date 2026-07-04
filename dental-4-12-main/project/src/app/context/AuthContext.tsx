import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../api/client';
import { saveUserCache, loadUserCache, clearUserCache } from '../offline/authCache';
import type { ApiUser, ApiRole, ApiSchool } from '../api/types';

interface User {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  schools: string[]; // assigned schools (resolved school names)
}

interface LoginResult {
  ok: boolean;
  // Password was correct but the account requires an emailed code —
  // the UI must show the OTP step; no session exists yet.
  twofaRequired?: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  selectedSchool: string | null;
  setSelectedSchool: (school: string | null) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyOtp: (email: string, code: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Survives reloads/deep-links (school choice used to live only in memory, so
// every refresh bounced users back to the select-school screen).
const SCHOOL_KEY = 'selected-school';
// Set after a successful login/restore. When absent we skip the /auth/me
// probe entirely — an unauthenticated probe just 401s and litters the console.
const SESSION_HINT_KEY = 'has-session';

function loadStoredSchool(userId: string, schools: string[]): string | null {
  try {
    const raw = window.localStorage.getItem(SCHOOL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only honor a value stored by this same user that still names one of
    // their schools (guards against shared machines and renamed schools).
    return parsed && parsed.userId === userId && schools.includes(parsed.school) ? parsed.school : null;
  } catch {
    return null;
  }
}

function storeSchool(userId: string, school: string | null) {
  try {
    if (school === null) window.localStorage.removeItem(SCHOOL_KEY);
    else window.localStorage.setItem(SCHOOL_KEY, JSON.stringify({ userId, school }));
  } catch {
    // storage unavailable (private mode etc.) — selection just won't persist
  }
}

// Restore the stored choice, or auto-select for single-school accounts so
// they never have to click through a one-card selection screen.
function initialSchoolFor(user: User): string | null {
  const stored = loadStoredSchool(user.id, user.schools);
  if (stored) return stored;
  if (user.schools.length === 1) {
    storeSchool(user.id, user.schools[0]);
    return user.schools[0];
  }
  return null;
}

async function resolveUser(apiUser: ApiUser): Promise<User> {
  const allSchools = await apiClient.get<ApiSchool[]>('/schools');
  const schools = apiUser.school_id
    ? allSchools.filter((s) => s._id === apiUser.school_id).map((s) => s.school_name)
    : allSchools.map((s) => s.school_name);

  return {
    id: apiUser._id,
    name: apiUser.full_name,
    email: apiUser.email,
    role: apiUser.role,
    schools,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchoolState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!window.localStorage.getItem(SESSION_HINT_KEY)) {
        // Never logged in from this browser (or logged out) — don't probe
        // /auth/me just to receive a 401.
        setLoading(false);
        return;
      }
      try {
        const apiUser = await apiClient.get<ApiUser>('/auth/me');
        const resolved = await resolveUser(apiUser);
        setUser(resolved);
        saveUserCache(resolved);
        setSelectedSchoolState(initialSchoolFor(resolved));
      } catch (err) {
        // A real 401 means the server checked and said you're logged out —
        // trust it. A network error just means we couldn't ask, which isn't
        // the same thing: if you were validly logged in before losing
        // connectivity, don't lock you out of the app you were just using.
        if (err instanceof ApiError) {
          setUser(null);
          clearUserCache();
          window.localStorage.removeItem(SESSION_HINT_KEY);
        } else {
          const cached = loadUserCache();
          setUser(cached);
          if (cached) setSelectedSchoolState(initialSchoolFor(cached));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setSelectedSchool = useCallback(
    (school: string | null) => {
      setSelectedSchoolState(school);
      if (user) storeSchool(user.id, school);
    },
    [user],
  );

  const completeLogin = useCallback(async (apiUser: ApiUser) => {
    const resolved = await resolveUser(apiUser);
    setUser(resolved);
    saveUserCache(resolved);
    window.localStorage.setItem(SESSION_HINT_KEY, '1');
    setSelectedSchoolState(initialSchoolFor(resolved));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const data = await apiClient.post<ApiUser | { twofa_required: true }>('/auth/login', { email, password });
      if ('twofa_required' in data) {
        return { ok: false, twofaRequired: true };
      }
      await completeLogin(data);
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No connection — can\'t log in while offline. If you were logged in before, reopen the app without reloading.';
      return { ok: false, error: message };
    }
  }, [completeLogin]);

  const verifyOtp = useCallback(async (email: string, code: string): Promise<LoginResult> => {
    try {
      const apiUser = await apiClient.post<ApiUser>('/auth/verify-otp', { email, code });
      await completeLogin(apiUser);
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No connection — try again when back online.';
      return { ok: false, error: message };
    }
  }, [completeLogin]);

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout').catch(() => {});
    setUser(null);
    clearUserCache();
    window.localStorage.removeItem(SESSION_HINT_KEY);
    setSelectedSchoolState(null);
    // deliberately keep SCHOOL_KEY: logging back in on the same machine
    // shouldn't re-ask a question the user already answered
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, selectedSchool, setSelectedSchool, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
