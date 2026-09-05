import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { RPCRow } from '../../../shared/rpcTracking';

export { SOUND_TEMPORARY, SOUND_PERMANENT } from '../../../shared/rpcTracking';
export type { RPCRow } from '../../../shared/rpcTracking';

// ⚠ Sprint 140 MOVED this join to the server. It used to fetch SIX whole
// collections — students, schools, IPTRs, preventive-care records, dental
// charts and tooth records — and roll them up in the browser.
//
// The logic now lives in `shared/rpcTracking.ts` and is MOVED, not copied: the
// 4-6 month window, the school-year cutoff and the tooth-count roll-ups decide
// what a DOH return reports, and a second copy would drift invisibly.
//
// ⚠ The response is still ONE ROW PER PUPIL, so it grows with the roll (#24).
export function useRPCTracking() {
  const [records, setRecords] = useState<RPCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extracted so RPCTracking can refetch after recording a visit — without it
  // the new visit would not appear until a full reload.
  const load = useCallback(async (cancelled = { current: false }) => {
    try {
      const rows = await apiClient.get<RPCRow[]>('/stats/rpc-rows');
      if (!cancelled.current) {
        setRecords(rows);
        setError(null);
      }
    } catch (err) {
      if (!cancelled.current) setError(err instanceof Error ? err.message : 'Failed to load RPC records');
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cancelled = { current: false };
    void load(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [load]);

  return { records, loading, error, reload: () => load() };
}
