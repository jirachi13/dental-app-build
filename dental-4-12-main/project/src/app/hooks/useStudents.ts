import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { usePendingWritesFor } from './useOfflineQueue';
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
  consentStatus: 'pending' | 'complete';
  pending?: boolean;
}

function deriveOralStatus(riskLevel: string | null): string {
  if (riskLevel === 'High') return 'Needs Treatment';
  if (riskLevel === 'Medium') return 'Under Treatment';
  if (riskLevel === 'Low') return 'Orally Fit';
  return 'Not Yet Screened';
}

export function useStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [schools, setSchools] = useState<ApiSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingWrites = usePendingWritesFor('/students');

  const reload = useCallback(async () => {
    setLoading(true);
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
          consentStatus: s.consent_status,
        };
      });

      setStudents(rows);
      setSchools(schools);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // A pending write disappearing from the queue means it just synced —
  // reload so the real server record (with its real _id) replaces the
  // optimistic one instead of leaving a gap until the next natural reload.
  const prevPendingCount = useRef(pendingWrites.length);
  useEffect(() => {
    if (pendingWrites.length < prevPendingCount.current) reload();
    prevPendingCount.current = pendingWrites.length;
  }, [pendingWrites.length, reload]);

  // Merge queued (not-yet-synced) student creations in as optimistic rows,
  // so staff see what they just entered while offline instead of it
  // silently disappearing until sync completes.
  const studentsWithPending = useMemo(() => {
    const schoolNameById = new Map(schools.map((s) => [s._id, s.school_name]));
    const pendingRows: StudentRow[] = pendingWrites.map((w) => {
      const body = w.body as Partial<{ full_name: string; birthday: string; sex: string; grade_level: string; section: string; school_id: string }>;
      return {
        id: `pending-${w.id}`,
        name: body.full_name ?? '(pending sync)',
        birthdate: body.birthday?.slice(0, 10) ?? '',
        gender: body.sex ?? '',
        grade: body.grade_level ?? '',
        section: body.section ?? '',
        school: schoolNameById.get(body.school_id ?? '') ?? 'Unknown School',
        lastVisit: null,
        oralStatus: 'Not Yet Screened',
        riskLevel: null,
        consentStatus: 'pending',
        pending: true,
      };
    });
    return [...pendingRows, ...students];
  }, [students, schools, pendingWrites]);

  return { students: studentsWithPending, loading, error, reload };
}
