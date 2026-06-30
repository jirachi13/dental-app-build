import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type {
  ApiStudent,
  ApiSchool,
  ApiStudentIptr,
  ApiDentalChart,
  ApiPreventiveCareRecord,
  ApiRiskStratification,
} from '../api/types';

export interface StudentRow {
  id: string;
  name: string;
  birthdate: string;
  gender: string;
  grade: string;
  section: string;
  school: string;
  lastVisit: string | null;
  oralStatus: string;
  riskLevel: 'High' | 'Medium' | 'Low' | null;
}

function deriveOralStatus(riskLevel: string | null): string {
  if (riskLevel === 'High') return 'Needs Treatment';
  if (riskLevel === 'Medium') return 'Under Treatment';
  if (riskLevel === 'Low') return 'Orally Fit';
  return 'Not Yet Screened';
}

export function useStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [apiStudents, schools, iptrs, charts, preventives, riskStrats] = await Promise.all([
          apiClient.get<ApiStudent[]>('/students'),
          apiClient.get<ApiSchool[]>('/schools'),
          apiClient.get<ApiStudentIptr[]>('/student-iptrs'),
          apiClient.get<ApiDentalChart[]>('/dental-charts'),
          apiClient.get<ApiPreventiveCareRecord[]>('/preventive-care-records'),
          apiClient.get<ApiRiskStratification[]>('/risk-stratifications'),
        ]);

        const schoolNameById = new Map(schools.map((s) => [s._id, s.school_name]));
        const iptrsByStudent = new Map<string, ApiStudentIptr[]>();
        for (const iptr of iptrs) {
          const list = iptrsByStudent.get(iptr.student_id) ?? [];
          list.push(iptr);
          iptrsByStudent.set(iptr.student_id, list);
        }
        const chartsByIptr = new Map<string, ApiDentalChart[]>();
        for (const c of charts) {
          const list = chartsByIptr.get(c.iptr_id) ?? [];
          list.push(c);
          chartsByIptr.set(c.iptr_id, list);
        }
        const preventiveById = new Map(preventives.map((p) => [p._id, p]));
        const riskByPreventiveId = new Map(riskStrats.map((r) => [r.preventive_id, r]));
        const riskByIptr = new Map<string, ApiRiskStratification>();
        for (const r of riskStrats) {
          const preventive = preventiveById.get(r.preventive_id);
          if (preventive) riskByIptr.set(preventive.iptr_id, r);
        }

        const rows: StudentRow[] = apiStudents.map((s) => {
          const studentIptrs = iptrsByStudent.get(s._id) ?? [];
          const allCharts = studentIptrs.flatMap((iptr) => chartsByIptr.get(iptr._id) ?? []);
          const lastVisit = allCharts.length
            ? allCharts.reduce((latest, c) => (c.date_charted > latest ? c.date_charted : latest), allCharts[0].date_charted)
            : null;
          const riskLevel = studentIptrs.map((iptr) => riskByIptr.get(iptr._id)).find(Boolean)?.risk_level ?? null;

          return {
            id: s._id,
            name: s.full_name,
            birthdate: s.birthday.slice(0, 10),
            gender: s.sex,
            grade: s.grade_level,
            section: s.section,
            school: schoolNameById.get(s.school_id) ?? 'Unknown School',
            lastVisit,
            oralStatus: deriveOralStatus(riskLevel),
            riskLevel,
          };
        });

        if (!cancelled) setStudents(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load students');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { students, loading, error };
}
