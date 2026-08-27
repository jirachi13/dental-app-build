import { useCallback, useEffect, useState } from 'react';
import { useLoadPhase } from './useLoadPhase';
import { apiClient } from '../api/client';
import type { ApiAuditTrail, ApiUser } from '../api/types';

export interface AuditLogRow {
  id: string;
  timestamp: string; // ISO, formatted for display in the component
  user: string;
  action: string;
  module: string; // affected_model, e.g. "Student", "Appointment"
  affectedRecordId: string;
}

export function useAuditTrail() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const { loading, beginLoad, endLoad } = useLoadPhase();
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    beginLoad();
    try {
      const [entries, users] = await Promise.all([
        apiClient.get<ApiAuditTrail[]>('/audit-trails'),
        apiClient.get<ApiUser[]>('/users'),
      ]);
      const userNameById = new Map(users.map((u) => [u._id, u.full_name]));

      const rows: AuditLogRow[] = entries
        .map((e) => ({
          id: e._id,
          timestamp: e.timestamp,
          user: userNameById.get(e.user_id) ?? 'Unknown User',
          action: e.action,
          module: e.affected_model,
          affectedRecordId: e.affected_record_id,
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      setLogs(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    } finally {
      endLoad();
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { logs, loading, error, reload };
}
