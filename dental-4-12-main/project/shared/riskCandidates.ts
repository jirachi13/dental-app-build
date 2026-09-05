// ─── Risk Classification candidates, shared by the server and the client ───
//
// Sprint 139. This join used to run in the BROWSER, which is why the Risk
// Classification page downloaded NINE whole collections — students, schools,
// IPTRs, charts, tooth records, oral-health conditions, dietary habits,
// preventive-care records and risk stratifications — to draw one list.
//
// MOVED, not copied, for the same reason as `dohAggregate.ts`: the features
// assembled here are what the ML service is asked to classify, and two
// implementations would eventually disagree about a pupil's DMF score.
//
// ⚠ The response still carries ONE ROW PER PUPIL, so unlike the DOH aggregate
// it does grow with the roll — but a row is ~13 numbers and a short history
// instead of nine collections' worth of documents. Paging this list is
// separate, still-open work (#24).
//
// Nothing here may import mongoose or React.

import { surnameFirst } from './studentName.js';

export interface RiskStudent {
  _id: string;
  school_id: string;
  sex: string;
  birthday: string;
  grade_level: string;
  section: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  full_name?: string;
}
export interface RiskIptr { _id: string; student_id: string; school_year: string }
export interface RiskChart { _id: string; iptr_id: string }
export interface RiskTooth { chart_id: string; condition?: string | null }
export interface RiskOral {
  iptr_id: string;
  gingivitis?: boolean;
  periodontal_disease?: boolean;
  debris?: boolean;
  calculus?: boolean;
  abnormal_growth?: boolean;
}
export interface RiskDietary { iptr_id: string; sugar_beverages?: boolean; tobacco_user?: boolean }
export interface RiskPreventive { _id: string; iptr_id: string; visit_date: string }
export interface RiskStrat {
  _id: string;
  preventive_id: string;
  risk_level: 'High' | 'Medium' | 'Low';
  recommendation?: string;
  dmf_score: number;
  validated_by_dentist?: boolean;
  validated_at?: string | null;
}
export interface RiskSchool { _id: string; school_name: string }

/** Mirrors ml-service predictor.FEATURE_COLUMNS. */
export interface StudentMlFeatures {
  dmf_score: number;
  decayed_count: number;
  missing_count: number;
  filled_count: number;
  gingivitis: 0 | 1;
  periodontal_disease: 0 | 1;
  debris: 0 | 1;
  calculus: 0 | 1;
  abnormal_growth: 0 | 1;
  sugar_beverages: 0 | 1;
  tobacco_user: 0 | 1;
  age: number;
  sex: 0 | 1;
}

export interface RiskHistoryEntry {
  id: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  recommendation: string;
  dmfScore: number;
  validated: boolean;
  validatedAt: string | null;
  visitDate: string;
}

export interface RiskCandidate {
  id: string;
  name: string;
  school: string;
  grade: string;
  section: string;
  /** Sprint 106: carried so the page can offer the same gender and age-group
   *  filters every other student list has. NOT fed to the model — `features`
   *  is the ML input and stays exactly as it was. */
  gender: string;
  birthdate: string;
  features: StudentMlFeatures;
  dmfIndex: 'DMF' | 'dmf';
  /** Risk assessments attach to an RPC visit per the ERD (preventive_id FK);
   *  null means the pupil has no RPC visit yet, so nothing to attach to. */
  latestPreventiveId: string | null;
  /** Trimmed to `historyLimit` when the caller asks for it — see that field. */
  history: RiskHistoryEntry[];
  /** How many assessments the pupil actually has, whatever `history` carries.
   *  The detail panel needs to know a trimmed list is trimmed. */
  historyCount: number;
}

export interface RiskCandidatesInput {
  students: RiskStudent[];
  schools: RiskSchool[];
  iptrs: RiskIptr[];
  charts: RiskChart[];
  toothRecords: RiskTooth[];
  orals: RiskOral[];
  dietaries: RiskDietary[];
  preventives: RiskPreventive[];
  risks: RiskStrat[];
  /** "Now" for the age calculation. Passed in rather than read from the clock
   *  so a caller can reproduce a result; defaults to the current time. */
  now?: number;
  /** Keep only the LAST n assessments per pupil, and report the true count in
   *  `historyCount`.
   *
   *  ⚠ WHY THIS EXISTS: `history` is the only field on this row that grows with
   *  TIME as well as with roll size — a pupil followed K to G10 accumulates
   *  assessments forever, so the list response would grow every school year
   *  even if the roll never changed. The LIST only ever reads the last two (the
   *  badge reads the latest, the trend compares the last two); the full history
   *  belongs to the detail panel, which fetches it per pupil.
   *
   *  Undefined means "no limit" — the per-pupil endpoint passes nothing. */
  historyLimit?: number;
}

function calcAge(birthday: string, now: number): number {
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.floor((now - b.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

export function buildRiskCandidates(input: RiskCandidatesInput): RiskCandidate[] {
  const { students, schools, iptrs, charts, toothRecords, orals, dietaries, preventives, risks } = input;
  const now = input.now ?? Date.now();

  const schoolNameById = new Map(schools.map((s) => [s._id, s.school_name]));
  const iptrsByStudent = new Map<string, RiskIptr[]>();
  for (const iptr of iptrs) {
    const list = iptrsByStudent.get(iptr.student_id) ?? [];
    list.push(iptr);
    iptrsByStudent.set(iptr.student_id, list);
  }
  const chartsByIptr = new Map<string, RiskChart[]>();
  for (const c of charts) {
    const list = chartsByIptr.get(c.iptr_id) ?? [];
    list.push(c);
    chartsByIptr.set(c.iptr_id, list);
  }
  const teethByChart = new Map<string, RiskTooth[]>();
  for (const t of toothRecords) {
    const list = teethByChart.get(t.chart_id) ?? [];
    list.push(t);
    teethByChart.set(t.chart_id, list);
  }
  const ohcByIptr = new Map(orals.map((o) => [o.iptr_id, o]));
  const dshByIptr = new Map(dietaries.map((d) => [d.iptr_id, d]));
  const preventivesByIptr = new Map<string, RiskPreventive[]>();
  for (const p of preventives) {
    const list = preventivesByIptr.get(p.iptr_id) ?? [];
    list.push(p);
    preventivesByIptr.set(p.iptr_id, list);
  }
  const riskByPreventive = new Map<string, RiskStrat[]>();
  for (const r of risks) {
    const list = riskByPreventive.get(r.preventive_id) ?? [];
    list.push(r);
    riskByPreventive.set(r.preventive_id, list);
  }

  const rows: RiskCandidate[] = students.map((s) => {
    const studentIptrs = (iptrsByStudent.get(s._id) ?? [])
      .slice()
      .sort((a, b) => a.school_year.localeCompare(b.school_year));
    const allTeeth = studentIptrs
      .flatMap((iptr) => chartsByIptr.get(iptr._id) ?? [])
      .flatMap((c) => teethByChart.get(c._id) ?? []);

    // Same condition-code convention as DentalChart: D/M/F permanent, d/m/f
    // temporary.
    let decayed = 0, missing = 0, filled = 0, temporary = 0;
    for (const t of allTeeth) {
      const c = t.condition;
      if (c === 'D' || c === 'd') decayed++;
      else if (c === 'M' || c === 'm') missing++;
      else if (c === 'F' || c === 'f') filled++;
      if (c === 'd' || c === 'm' || c === 'f') temporary++;
    }

    // Most recent school year's records win for conditions/habits.
    const ohc = studentIptrs.map((i) => ohcByIptr.get(i._id)).filter(Boolean).pop();
    const dsh = studentIptrs.map((i) => dshByIptr.get(i._id)).filter(Boolean).pop();

    const studentPreventives = studentIptrs
      .flatMap((i) => preventivesByIptr.get(i._id) ?? [])
      .sort((a, b) => a.visit_date.localeCompare(b.visit_date));
    const history: RiskHistoryEntry[] = studentPreventives.flatMap((p) =>
      (riskByPreventive.get(p._id) ?? []).map((r) => ({
        id: r._id,
        riskLevel: r.risk_level,
        recommendation: r.recommendation ?? '',
        dmfScore: r.dmf_score,
        validated: r.validated_by_dentist ?? false,
        validatedAt: r.validated_at ?? null,
        visitDate: p.visit_date.slice(0, 10),
      })),
    );

    const b = (v: boolean | undefined): 0 | 1 => (v ? 1 : 0);
    const limit = input.historyLimit;
    return {
      id: s._id,
      name: surnameFirst(s),
      school: schoolNameById.get(s.school_id) ?? 'Unknown School',
      grade: s.grade_level,
      section: s.section,
      gender: s.sex,
      birthdate: s.birthday,
      features: {
        dmf_score: decayed + missing + filled,
        decayed_count: decayed,
        missing_count: missing,
        filled_count: filled,
        gingivitis: b(ohc?.gingivitis),
        periodontal_disease: b(ohc?.periodontal_disease),
        debris: b(ohc?.debris),
        calculus: b(ohc?.calculus),
        abnormal_growth: b(ohc?.abnormal_growth),
        sugar_beverages: b(dsh?.sugar_beverages),
        tobacco_user: b(dsh?.tobacco_user),
        age: calcAge(s.birthday, now),
        sex: s.sex === 'M' || s.sex === 'Male' ? 1 : 0,
      },
      dmfIndex: temporary > 0 ? 'dmf' : 'DMF',
      latestPreventiveId: studentPreventives.length
        ? studentPreventives[studentPreventives.length - 1]._id
        : null,
      history: limit === undefined ? history : history.slice(-limit),
      historyCount: history.length,
    };
  });

  // Alphabetical by surname, matching every other list (2026-09-02). `name` is
  // surnameFirst, so this is surname order.
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
