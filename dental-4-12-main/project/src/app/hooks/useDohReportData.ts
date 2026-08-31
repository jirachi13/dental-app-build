import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { useLoadPhase } from './useLoadPhase';
import type {
  ApiStudent,
  ApiStudentIptr,
  ApiMedicalHistory,
  ApiDietarySocialHabits,
  ApiOralHealthCondition,
  ApiPreventiveCareRecord,
  ApiRiskStratification,
} from '../api/types';

// Fields with a direct, defensible mapping to real seeded data. Everything
// else in the DOH table (Services Rendered, and a handful of oral-health/DMF
// rows with no matching schema field) resolves to 0 in Reports.tsx — never a
// fabricated fallback number. An earlier version of this comment said those
// rows fell back to an "illustrative sparse table"; that has not been true
// since the fallback was removed, and the stale wording is misleading in a
// report that gets submitted to the City Health Office.
const REAL_MEDICAL_FIELDS: Record<string, keyof ApiMedicalHistory> = {
  allergies: 'allergies',
  hypertension: 'hypertension',
  diabetes: 'diabetes_mellitus',
  cardiovascular: 'cardiovascular_disease',
  thyroid: 'thyroid_disorders',
  hepatitis: 'hepatitis_disorders',
  malignancy: 'malignancy',
  hospitalization: 'previous_hospitalization',
  bloodTransfusion: 'blood_transfusion',
  tattoo: 'tattoo',
};

const REAL_DIETARY_FIELDS: Record<string, keyof ApiDietarySocialHabits> = {
  sugarSweetened: 'sugar_beverages',
  alcoholDrinker: 'alcohol_drinker',
  tobaccoUser: 'tobacco_user',
  betelNut: 'betel_nut_chewer',
};

const REAL_ORAL_FIELDS: Record<string, keyof ApiOralHealthCondition> = {
  gingivitis: 'gingivitis',
  debris: 'debris',
  calculus: 'calculus',
  anomaly: 'abnormal_growth',
};

function ageBracketOf(birthdate: string): string {
  const age = new Date().getFullYear() - new Date(birthdate).getFullYear();
  if (age <= 4) return '4 yrs & below';
  if (age <= 9) return '5-9 yrs';
  if (age <= 14) return '10-14 yrs';
  if (age <= 19) return '15-19 yrs';
  return '20 yrs & above';
}

// A DOH report is submitted to the City Health Office, so a stale number is
// worse than a slow one. Refreshing when the tab is refocused costs one fetch
// round and keeps the table honest without the user thinking about it.
// Throttled so alt-tabbing doesn't re-run seven collection reads repeatedly.
const REFRESH_THROTTLE_MS = 30 * 1000;

export function useDohReportData() {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const { loading, beginLoad, endLoad } = useLoadPhase();
  const [error, setError] = useState<string | null>(null);
  // Guards against two hazards at once: writing state after unmount, and a
  // slow earlier refresh landing on top of a newer one and resurrecting old
  // counts. Only the most recently started run may commit.
  const runIdRef = useRef(0);

  const load = useCallback(async () => {
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current;
    beginLoad();

    try {
      const [students, iptrs, medicals, dietaries, orals, preventives, risks] = await Promise.all([
        apiClient.get<ApiStudent[]>('/students'),
        apiClient.get<ApiStudentIptr[]>('/student-iptrs'),
        apiClient.get<ApiMedicalHistory[]>('/medical-histories'),
        apiClient.get<ApiDietarySocialHabits[]>('/dietary-social-habits'),
        apiClient.get<ApiOralHealthCondition[]>('/oral-health-conditions'),
        apiClient.get<ApiPreventiveCareRecord[]>('/preventive-care-records'),
        apiClient.get<ApiRiskStratification[]>('/risk-stratifications'),
      ]);

      const iptrsByStudent = new Map<string, string[]>();
      for (const i of iptrs) {
        const list = iptrsByStudent.get(i.student_id) ?? [];
        list.push(i._id);
        iptrsByStudent.set(i.student_id, list);
      }
      const medicalByIptr = new Map(medicals.map((m) => [m.iptr_id, m]));
      const dietaryByIptr = new Map(dietaries.map((d) => [d.iptr_id, d]));
      const oralByIptr = new Map(orals.map((o) => [o.iptr_id, o]));
      const preventiveById = new Map(preventives.map((p) => [p._id, p]));
      const riskByIptr = new Map<string, ApiRiskStratification>();
      for (const r of risks) {
        const p = preventiveById.get(r.preventive_id);
        if (p) riskByIptr.set(p.iptr_id, r);
      }

      const increment = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
      const result = new Map<string, number>();

      for (const s of students) {
        const sex = s.sex.startsWith('M') ? 'M' : 'F';
        const age = ageBracketOf(s.birthday);
        const grade = s.grade_level;
        const iptrIds = iptrsByStudent.get(s._id) ?? [];
        const medical = iptrIds.map((id) => medicalByIptr.get(id)).find(Boolean);
        const dietary = iptrIds.map((id) => dietaryByIptr.get(id)).find(Boolean);
        const oral = iptrIds.map((id) => oralByIptr.get(id)).find(Boolean);
        const risk = iptrIds.map((id) => riskByIptr.get(id)).find(Boolean);

        if (oral) {
          increment(result, `${grade}|${age}|${sex}|attended`);
          increment(result, `${grade}|${age}|${sex}|examined`);
        }

        if (medical) {
          for (const [dohField, apiField] of Object.entries(REAL_MEDICAL_FIELDS)) {
            const value = medical[apiField];
            const isTrue = apiField === 'allergies' ? !!value : value === true;
            if (isTrue) increment(result, `${grade}|${age}|${sex}|${dohField}`);
          }
        }

        if (dietary) {
          for (const [dohField, apiField] of Object.entries(REAL_DIETARY_FIELDS)) {
            if (dietary[apiField] === true) increment(result, `${grade}|${age}|${sex}|${dohField}`);
          }
        }

        if (oral) {
          for (const [dohField, apiField] of Object.entries(REAL_ORAL_FIELDS)) {
            if (oral[apiField] === true) increment(result, `${grade}|${age}|${sex}|${dohField}`);
          }
        }

      }

      // DMF/dmf totals and OFC — grouped separately since they come from
      // RiskStratification, not a per-field boolean like the sections above.
      for (const s of students) {
        const sex = s.sex.startsWith('M') ? 'M' : 'F';
        const age = ageBracketOf(s.birthday);
        const grade = s.grade_level;
        const iptrIds = iptrsByStudent.get(s._id) ?? [];
        const risk = iptrIds.map((id) => riskByIptr.get(id)).find(Boolean);
        if (risk && risk.dmf_score > 0) {
          const field = risk.dmf_index === 'DMF' ? 'DMF_total' : 'dmf_df';
          increment(result, `${grade}|${age}|${sex}|${field}`);
        }
        if (risk && risk.risk_level === 'Low') {
          increment(result, `${grade}|${age}|${sex}|ofc_exam`);
        }
      }

      if (!isStale()) {
        setCounts(result);
        // Clear a previous failure: a refresh that succeeds must not leave
        // the old error banner sitting above correct numbers.
        setError(null);
      }
    } catch (err) {
      if (!isStale()) setError(err instanceof Error ? err.message : 'Failed to load DOH report data');
    } finally {
      if (!isStale()) endLoad();
    }
  }, [beginLoad, endLoad]);

  useEffect(() => {
    void load();
    // Bump the run id on unmount so an in-flight fetch can never commit.
    return () => { runIdRef.current++; };
  }, [load]);

  // Refresh when the user comes back to the tab. Mirrors UpdateToast's
  // approach (Sprint 42): an interval is the wrong shape here — what matters
  // is that the numbers are current at the moment someone looks at them.
  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefresh < REFRESH_THROTTLE_MS) return;
      lastRefresh = Date.now();
      void load();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [load]);

  const REAL_FIELDS = new Set([
    'attended',
    'examined',
    ...Object.keys(REAL_MEDICAL_FIELDS),
    ...Object.keys(REAL_DIETARY_FIELDS),
    ...Object.keys(REAL_ORAL_FIELDS),
    'DMF_total',
    'dmf_df',
    'ofc_exam',
  ]);

  function getRealCount(grade: string, age: string, sex: 'M' | 'F', field: string): number | null {
    if (!REAL_FIELDS.has(field)) return null;
    return counts.get(`${grade}|${age}|${sex}|${field}`) ?? 0;
  }

  return { getRealCount, loading, error, reload: load };
}
