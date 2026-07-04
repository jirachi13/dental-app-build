import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { ApiStudent, ApiSchool, ApiStudentIptr, ApiPreventiveCareRecord } from '../api/types';

// "4-6 month interval" per the RPC module description — 150 days is the midpoint.
const RPC_INTERVAL_DAYS = 150;
// Lower bound of the 4–6 month window (~4 months). Visit 2 done sooner than this
// is flagged as early — done before the recommended minimum spacing.
const RPC_MIN_INTERVAL_DAYS = 120;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RPCRow {
  id: string;
  studentName: string;
  birthdate: string;
  gender: string;
  school: string;
  grade: string;
  section: string;
  visit1Date: string | null;
  visit1Status: 'Completed' | 'Pending';
  visit2Date: string | null;
  visit2Status: 'Completed' | 'Pending';
  daysUntilDue: number;
  status: 'complete' | 'pending' | 'overdue' | 'not-started';
  earlyVisit2: boolean;
}

export function useRPCTracking() {
  const [records, setRecords] = useState<RPCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [students, schools, iptrs, preventives] = await Promise.all([
          apiClient.get<ApiStudent[]>('/students'),
          apiClient.get<ApiSchool[]>('/schools'),
          apiClient.get<ApiStudentIptr[]>('/student-iptrs'),
          apiClient.get<ApiPreventiveCareRecord[]>('/preventive-care-records'),
        ]);

        const schoolNameById = new Map(schools.map((s) => [s._id, s.school_name]));
        const iptrsByStudent = new Map<string, ApiStudentIptr[]>();
        for (const iptr of iptrs) {
          const list = iptrsByStudent.get(iptr.student_id) ?? [];
          list.push(iptr);
          iptrsByStudent.set(iptr.student_id, list);
        }
        const preventivesByIptr = new Map<string, ApiPreventiveCareRecord[]>();
        for (const p of preventives) {
          const list = preventivesByIptr.get(p.iptr_id) ?? [];
          list.push(p);
          preventivesByIptr.set(p.iptr_id, list);
        }

        const now = Date.now();

        const rows: RPCRow[] = students.map((s) => {
          const studentIptrs = iptrsByStudent.get(s._id) ?? [];
          const allVisits = studentIptrs.flatMap((iptr) => preventivesByIptr.get(iptr._id) ?? []);
          const visit1 = allVisits.find((v) => v.visit_number === 1) ?? null;
          const visit2 = allVisits.find((v) => v.visit_number === 2) ?? null;

          let status: RPCRow['status'] = 'not-started';
          let daysUntilDue = 0;
          let earlyVisit2 = false;
          if (visit1 && visit2) {
            status = 'complete';
            const gapDays = Math.floor(
              (new Date(visit2.visit_date).getTime() - new Date(visit1.visit_date).getTime()) / MS_PER_DAY,
            );
            earlyVisit2 = gapDays >= 0 && gapDays < RPC_MIN_INTERVAL_DAYS;
          } else if (visit1) {
            const daysSinceVisit1 = Math.floor((now - new Date(visit1.visit_date).getTime()) / MS_PER_DAY);
            daysUntilDue = RPC_INTERVAL_DAYS - daysSinceVisit1;
            status = daysUntilDue < 0 ? 'overdue' : 'pending';
          }

          return {
            id: s._id,
            studentName: s.full_name,
            birthdate: s.birthday.slice(0, 10),
            gender: s.sex,
            school: schoolNameById.get(s.school_id) ?? 'Unknown School',
            grade: s.grade_level,
            section: s.section,
            visit1Date: visit1 ? visit1.visit_date.slice(0, 10) : null,
            visit1Status: visit1 ? 'Completed' : 'Pending',
            visit2Date: visit2 ? visit2.visit_date.slice(0, 10) : null,
            visit2Status: visit2 ? 'Completed' : 'Pending',
            daysUntilDue,
            status,
            earlyVisit2,
          };
        });

        if (!cancelled) setRecords(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load RPC records');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { records, loading, error };
}
