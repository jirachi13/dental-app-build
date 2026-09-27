import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export interface TreatmentCategoryRow {
  code: string;
  studentIds: string[];
}

/** Which students have each of the 10 treatment codes, from REAL structured
 *  data (ToothRecord + PreventiveCareRecord) aggregated server-side -- see
 *  /stats/treatment-categories. Labels/local terms come from the shared
 *  `treatmentCodes` vocabulary (dentalChartCodes.ts); this hook only carries
 *  the id lists. */
export function useTreatmentCategories() {
  const [rows, setRows] = useState<TreatmentCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get<TreatmentCategoryRow[]>('/stats/treatment-categories');
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { rows, loading };
}
