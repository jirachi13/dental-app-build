import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../api/client';
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
  error?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  selectedSchool: string | null;
  setSelectedSchool: (school: string | null) => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const apiUser = await apiClient.get<ApiUser>('/auth/me');
        setUser(await resolveUser(apiUser));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const apiUser = await apiClient.post<ApiUser>('/auth/login', { email, password });
      setUser(await resolveUser(apiUser));
      setSelectedSchool(null); // reset school on login
      return { ok: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout').catch(() => {});
    setUser(null);
    setSelectedSchool(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, selectedSchool, setSelectedSchool, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
