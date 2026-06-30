import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { ApiUser, ApiSchool, ApiRole } from '../api/types';

export const ROLE_LABELS: Record<ApiRole, string> = {
  system_admin: 'System Admin',
  dentist: 'Dentist',
  dental_aide: 'Dental Aide',
  school_admin: 'School Admin',
  bho_staff: 'Barangay Health',
};

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  roleLabel: string;
  school: string;
  status: 'Active' | 'Inactive';
}

export function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [schools, setSchools] = useState<ApiSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [apiUsers, apiSchools] = await Promise.all([
        apiClient.get<ApiUser[]>('/users'),
        apiClient.get<ApiSchool[]>('/schools'),
      ]);
      const schoolNameById = new Map(apiSchools.map((s) => [s._id, s.school_name]));
      setUsers(
        apiUsers.map((u) => ({
          id: u._id,
          name: u.full_name,
          email: u.email,
          role: u.role,
          roleLabel: ROLE_LABELS[u.role] ?? u.role,
          school: u.school_id ? (schoolNameById.get(u.school_id) ?? 'Unknown School') : 'All Schools',
          status: u.isArchived ? 'Inactive' : 'Active',
        })),
      );
      setSchools(apiSchools);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { users, schools, loading, error, reload };
}
