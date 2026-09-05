import { useCallback, useEffect, useState } from 'react';
import { useLoadPhase } from './useLoadPhase';
import { apiClient } from '../api/client';
import type { RiskCandidate } from '../../../shared/riskCandidates';

export type {
  RiskCandidate,
  RiskHistoryEntry,
  StudentMlFeatures,
} from '../../../shared/riskCandidates';

// ⚠ Sprint 139 MOVED this join to the server. It used to fetch NINE whole
// collections — students, schools, IPTRs, charts, tooth records, oral-health
// conditions, dietary habits, preventive-care records and risk
// stratifications — and assemble the ML features in the browser.
//
// The logic now lives in `shared/riskCandidates.ts` and is MOVED, not copied:
// these features are what the ML service is asked to classify, and two
// implementations would eventually disagree about a pupil's DMF score.
//
// ⚠ The response is still ONE ROW PER PUPIL, so it grows with the roll. Paging
// it is separate, still-open work (#24).
export function useRiskClassification() {
  const [candidates, setCandidates] = useState<RiskCandidate[]>([]);
  const { loading, beginLoad, endLoad } = useLoadPhase();
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    beginLoad();
    try {
      const rows = await apiClient.get<RiskCandidate[]>('/stats/risk-candidates');
      setCandidates(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student data');
    } finally {
      endLoad();
    }
  }, [beginLoad, endLoad]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { candidates, loading, error, reload };
}
