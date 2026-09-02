import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type {
  ApiStudent,
  ApiSchool,
  ApiStudentIptr,
  ApiPreventiveCareRecord,
  ApiDentalChart,
  ApiToothRecord,
} from '../api/types';
import { schoolYearEnd } from '../utils/schoolYear';
import { surnameFirst } from '../utils/studentName';

// "4-6 month interval" per the RPC module description — 150 days is the midpoint.
const RPC_INTERVAL_DAYS = 150;
// Lower bound of the 4–6 month window (~4 months). Visit 2 done sooner than this
// is flagged as early — done before the recommended minimum spacing.
const RPC_MIN_INTERVAL_DAYS = 120;
// Upper bound of the window (~6 months).
const RPC_MAX_INTERVAL_DAYS = 180;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Visit 2 only counts for DOH/PhilHealth if it lands within the same school
// year as Visit 1 (June–April, per the dentist: "kailangan pumasok siya sa
// school calendar"). The rule itself now lives in utils/schoolYear.ts, shared
// with the appointments window so the two cannot drift.

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
  // School-year cutoff for a still-pending Visit 2: 'tight' = the 4–6 month
  // window extends past April 30, so Visit 2 must be done by then (earlier
  // than the usual deadline) to count; 'impossible' = even the earliest legal
  // Visit 2 (+4 months) lands after the school year ends — it can't be
  // counted for DOH/PhilHealth this school year.
  syCutoff: 'tight' | 'impossible' | null;
  syDeadline: string | null; // the April 30 the window is cut by (YYYY-MM-DD)
  // Distinct TOOTH_RECORD.treatment_code values recorded anywhere on this
  // student's dental charts (OEX, FV, PFS, …). NOTE: this is "the student has
  // had this treatment", NOT "this was done at the RPC visit" —
  // PREVENTIVE_CARE_RECORD stores no services at all (iptr_id, visit_date,
  // visit_number only), so per-visit treatment data does not exist to filter on.
  treatmentCodes: string[];
}

export function useRPCTracking() {
  const [records, setRecords] = useState<RPCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [students, schools, iptrs, preventives, charts, toothRecords] = await Promise.all([
          apiClient.get<ApiStudent[]>('/students'),
          apiClient.get<ApiSchool[]>('/schools'),
          apiClient.get<ApiStudentIptr[]>('/student-iptrs'),
          apiClient.get<ApiPreventiveCareRecord[]>('/preventive-care-records'),
          apiClient.get<ApiDentalChart[]>('/dental-charts'),
          apiClient.get<ApiToothRecord[]>('/tooth-records'),
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

        // student → set of treatment codes, resolved through
        // TOOTH_RECORD → DENTAL_CHART → STUDENT_IPTR → STUDENT.
        const codesByChart = new Map<string, Set<string>>();
        for (const tr of toothRecords) {
          if (!tr.treatment_code) continue;
          const set = codesByChart.get(tr.chart_id) ?? new Set<string>();
          set.add(tr.treatment_code);
          codesByChart.set(tr.chart_id, set);
        }
        const codesByIptr = new Map<string, Set<string>>();
        for (const chart of charts) {
          const codes = codesByChart.get(chart._id);
          if (!codes) continue;
          const set = codesByIptr.get(chart.iptr_id) ?? new Set<string>();
          for (const c of codes) set.add(c);
          codesByIptr.set(chart.iptr_id, set);
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
          let syCutoff: RPCRow['syCutoff'] = null;
          let syDeadline: string | null = null;
          if (visit1 && visit2) {
            status = 'complete';
            const gapDays = Math.floor(
              (new Date(visit2.visit_date).getTime() - new Date(visit1.visit_date).getTime()) / MS_PER_DAY,
            );
            earlyVisit2 = gapDays >= 0 && gapDays < RPC_MIN_INTERVAL_DAYS;
          } else if (visit1) {
            const visit1Time = new Date(visit1.visit_date).getTime();
            const daysSinceVisit1 = Math.floor((now - visit1Time) / MS_PER_DAY);
            daysUntilDue = RPC_INTERVAL_DAYS - daysSinceVisit1;
            status = daysUntilDue < 0 ? 'overdue' : 'pending';
            const syEnd = schoolYearEnd(new Date(visit1.visit_date));
            const windowOpens = visit1Time + RPC_MIN_INTERVAL_DAYS * MS_PER_DAY;
            const windowCloses = visit1Time + RPC_MAX_INTERVAL_DAYS * MS_PER_DAY;
            if (windowOpens > syEnd.getTime()) syCutoff = 'impossible';
            else if (windowCloses > syEnd.getTime()) syCutoff = 'tight';
            if (syCutoff) {
              syDeadline = `${syEnd.getFullYear()}-${String(syEnd.getMonth() + 1).padStart(2, '0')}-${String(syEnd.getDate()).padStart(2, '0')}`;
            }
          }

          return {
            id: s._id,
            // surnameFirst, not full_name: full_name is "First Middle Last",
            // so this list displayed given-name-first while every other list
            // showed surname-first, and sorting it would have ordered by given
            // name. Sprint 35 made surname-first the house convention.
            studentName: surnameFirst(s),
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
            syCutoff,
            syDeadline,
            treatmentCodes: [...new Set(studentIptrs.flatMap((iptr) => [...(codesByIptr.get(iptr._id) ?? [])]))],
          };
        });

        // Alphabetical by surname, matching every other list (2026-09-02).
        rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
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
