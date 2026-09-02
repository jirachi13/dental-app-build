import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { ApiStudent } from '../api/types';
import { useStudents } from '../hooks/useStudents';
import { useRPCTracking } from '../hooks/useRPCTracking';
import { SkeletonTable } from './Skeleton';
import { formatDate, toLocalDateString } from '../utils/localDate';

// ─── Target Client List for Oral Health Care and Services ────────────────────
// Transcribed from the manuscript's APPENDIX E (not D — Appendix D is the DMFX
// Index Score). The appendix is a low-resolution scan of the paper DOH form, so
// the column set below was read off it directly; three labels were illegible
// and are marked in the header definitions.
//
// HONESTY NOTE — several columns are rendered but CANNOT be filled from the
// current data model, and are deliberately left blank rather than faked:
// PREVENTIVE_CARE_RECORD stores only `iptr_id`, `visit_date` and
// `visit_number`, so no per-visit service is recorded anywhere. That means the
// FIRST/SECOND service columns (oral hygiene instruction, counselling, oral
// prophylaxis, fluoride varnish, completed BPOC) have no source. The visit
// DATES are real, and so are the curative treatment codes.

const AGE_GROUPS = ['4 yrs & below', '5-9 yrs', '10-14 yrs', '15-19 yrs', '20 yrs & above'];

type Period = 'daily' | 'monthly' | 'quarterly' | 'annual';
const PERIODS: { v: Period; l: string }[] = [
  { v: 'daily', l: 'Daily' },
  { v: 'monthly', l: 'Monthly' },
  { v: 'quarterly', l: 'Quarterly' },
  { v: 'annual', l: 'Annual' },
];

/** Inclusive start / exclusive end for the period containing `anchor`.
 *  Built from local date parts, not UTC — a consultation is filed under the
 *  clinic's calendar day, which is the same reason `toLocalDateString` exists. */
function periodRange(anchor: string, period: Period): { start: Date; end: Date; label: string } {
  const [y, m, d] = anchor.split('-').map(Number);
  const startOfDay = new Date(y, m - 1, d);
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtMon = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  if (period === 'daily') {
    const end = new Date(y, m - 1, d + 1);
    return { start: startOfDay, end, label: fmt(startOfDay) };
  }
  if (period === 'monthly') {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    return { start, end, label: fmtMon(start) };
  }
  if (period === 'quarterly') {
    const qStart = Math.floor((m - 1) / 3) * 3;
    const start = new Date(y, qStart, 1);
    const end = new Date(y, qStart + 3, 1);
    return { start, end, label: `${fmtMon(start)} – ${fmtMon(new Date(y, qStart + 2, 1))}` };
  }
  const start = new Date(y, 0, 1);
  const end = new Date(y + 1, 0, 1);
  return { start, end, label: String(y) };
}

/** Age AT THE DATE OF CONSULTATION, which is what the form's Age column means
 *  and what its Age Group column is banded on (Sprint 57b). Computed to "today"
 *  before, so re-opening a filed period silently aged every client and could
 *  move them into a different age group than was reported. Falls back to today
 *  only for a client with no recorded consultation — who is filtered out of
 *  every period anyway. */
const ageFrom = (birthdate: string, on: string | null = null) => {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const t = on ? new Date(on) : new Date();
  if (Number.isNaN(t.getTime())) return null;
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
};

const ageGroupOf = (age: number | null) => {
  if (age === null) return '';
  if (age <= 4) return AGE_GROUPS[0];
  if (age <= 9) return AGE_GROUPS[1];
  if (age <= 14) return AGE_GROUPS[2];
  if (age <= 19) return AGE_GROUPS[3];
  return AGE_GROUPS[4];
};

/** A column that exists on the paper form but has no data behind it yet. */
const NO_SOURCE = '—';

export const TargetClientList = () => {
  const { selectedSchool } = useAuth();
  const { students, loading: studentsLoading } = useStudents();
  const { records: rpcRecords, loading: rpcLoading } = useRPCTracking();
  // The list hooks drop address / contact / PhilHealth, which the TCL needs, so
  // the raw records are fetched alongside them for those three fields only.
  const [raw, setRaw] = useState<ApiStudent[]>([]);
  const [rawError, setRawError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [anchor, setAnchor] = useState(() => toLocalDateString(new Date()));

  useEffect(() => {
    apiClient.get<ApiStudent[]>('/students')
      .then(setRaw)
      .catch(() => setRawError('Could not load address and PhilHealth details.'));
  }, []);

  const rows = useMemo(() => {
    const rawById = new Map(raw.map((s) => [s._id, s]));
    const rpcById = new Map(rpcRecords.map((r) => [r.id, r]));
    return students
      .filter((s) => !s.pending && (!selectedSchool || s.school === selectedSchool))
      .map((s) => {
        const r = rpcById.get(s.id);
        const detail = rawById.get(s.id);
        const age = ageFrom(s.birthdate, r?.visit1Date ?? null);
        return {
          id: s.id,
          name: s.name,
          philhealth: detail?.philhealth_number || '',
          address: detail?.address || '',
          contact: detail?.contact_number || '',
          birthdate: s.birthdate,
          age,
          ageGroup: ageGroupOf(age),
          sex: s.gender?.[0]?.toUpperCase() ?? '',
          consultDate: r?.visit1Date ?? null,
          risk: s.riskLevel,
          visit1Done: r?.visit1Status === 'Completed',
          visit2Done: r?.visit2Status === 'Completed',
          treatments: r?.treatmentCodes ?? [],
        };
      });
  }, [students, rpcRecords, raw, selectedSchool]);

  const { start, end, label: periodLabel } = useMemo(() => periodRange(anchor, period), [anchor, period]);

  // Filtered on DATE OF CONSULTATION, which is the form's own first column —
  // a client with no recorded consultation has nothing to report for any
  // period, so they fall out rather than padding every range with blank rows.
  const visible = useMemo(() => rows.filter((r) => {
    if (!r.consultDate) return false;
    const [y, m, d] = r.consultDate.slice(0, 10).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt >= start && dt < end;
  }), [rows, start, end]);

  const withoutConsult = rows.length - rows.filter((r) => r.consultDate).length;

  if (studentsLoading || rpcLoading) return <SkeletonTable rows={8} />;

  const tick = (on: boolean) => (on ? '✓' : '');
  const hasCode = (codes: string[], code: string) => (codes.includes(code) ? '✓' : '');

  // Header geometry copied from the paper form (Appendix E, both sheets).
  // There, the header is ONE uniform tall band across the whole width: wide
  // identity columns carry horizontal labels centred in that band, and the
  // narrow service columns carry labels rotated to read bottom-to-top. That is
  // what lets ~26 columns fit a printable width without the labels setting the
  // column widths. Rendering them all horizontally, as this did before, made
  // the band short and every service column at least as wide as its caption.
  const HEADER_H = 'h-44';
  const th = 'px-2 py-2 text-[11px] font-semibold text-foreground border border-border whitespace-nowrap';
  // Horizontal caption, vertically centred in the tall band.
  const thFlat = `${th} align-middle text-center`;
  // Rotated caption. `vertical-rl` + 180° reads bottom-to-top, matching the
  // form; the fixed width is what actually narrows the column.
  const thRot = `${th} align-bottom p-1 w-8`;
  const rotStyle: CSSProperties = {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    // Keeps the glyphs upright inside the rotated flow rather than laid on
    // their side, which is how the printed form reads.
    textOrientation: 'mixed',
    whiteSpace: 'nowrap',
    margin: '0 auto',
  };
  /** A rotated column caption, sized to the shared band height. */
  const RotHead = ({ label, tone = '' }: { label: string; tone?: string }) => (
    <th className={`${thRot} ${tone}`}>
      <div style={rotStyle} className="mx-auto leading-tight">{label}</div>
    </th>
  );
  const td = 'px-2 py-1.5 text-xs text-foreground border border-border whitespace-nowrap';

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-bold text-foreground">Target Client List for Oral Health Care and Services</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {PERIODS.map((p) => (
              <button
                key={p.v}
                onClick={() => setPeriod(p.v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p.v ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >{p.l}</button>
            ))}
          </div>
          {/* Native date input, per the house rule on preferring platform
              features. It anchors the period — the buttons decide how much of
              the calendar around this date is covered. */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Period containing
            <input
              type="date"
              value={anchor}
              onChange={(e) => e.target.value && setAnchor(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-semibold text-foreground">{periodLabel}</span> — showing {visible.length} client
          {visible.length !== 1 ? 's' : ''} consulted{selectedSchool ? ' at the selected school' : ' across all schools'}.
          {withoutConsult > 0 && ` ${withoutConsult} enrolled client${withoutConsult !== 1 ? 's have' : ' has'} no recorded consultation and appear${withoutConsult !== 1 ? '' : 's'} in no period.`}
        </p>
        {rawError && <p className="text-xs text-destructive mt-1">{rawError}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          Columns marked <span className="font-semibold">{NO_SOURCE}</span> exist on the paper form but are not
          recorded by the system yet — preventive care records store the visit date only, not the individual
          services performed at that visit. They are shown blank rather than filled with assumptions.
        </p>
      </div>

      {/* Scrolls inside its own container, like the DOH table — the form is far
          wider than any screen and the page itself must never scroll sideways. */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="border-collapse">
          <thead className="bg-gray-50">
            {/* Group band — thin, above the tall caption band, exactly as the
                paper form runs FIRST / SECOND / OTHER SERVICES across the top. */}
            <tr>
              <th className={th} rowSpan={2}>No.</th>
              <th className={th} colSpan={9} />
              <th className={`${th} bg-blue-50`} colSpan={8}>FIRST</th>
              <th className={`${th} bg-blue-50`} colSpan={2}>SECOND</th>
              <th className={`${th} bg-amber-50`} colSpan={5}>OTHER SERVICES</th>
              <th className={th} rowSpan={2}>Remarks</th>
            </tr>
            <tr className={HEADER_H}>
              {/* Wide identity columns keep horizontal captions, centred in the
                  band — the same treatment they get on the printed sheet. */}
              <th className={thFlat}>Date of<br />consultation</th>
              <th className={thFlat}>PhilHealth No.</th>
              <th className={thFlat}>Name<br /><span className="font-normal">(Last, First, MI)</span></th>
              <th className={thFlat}>Complete Address</th>
              <th className={thFlat}>Contact Number</th>
              <th className={thFlat}>Date of Birth</th>
              <RotHead label="Age" />
              <RotHead label="Age Group" />
              <th className={thFlat}>Sex</th>
              {/* FIRST */}
              <RotHead label="Oral screening" tone="bg-blue-50" />
              <RotHead label="Risk: Low" tone="bg-blue-50" />
              <RotHead label="Risk: Moderate" tone="bg-blue-50" />
              <RotHead label="Risk: High" tone="bg-blue-50" />
              <RotHead label="Oral hygiene instruction" tone="bg-blue-50" />
              <RotHead label="Counselling" tone="bg-blue-50" />
              <RotHead label="Oral Prophylaxis" tone="bg-blue-50" />
              <RotHead label="Fluoride Varnish" tone="bg-blue-50" />
              {/* SECOND — the paper form repeats all six service columns here;
                  only the two with real data are rendered, for the same reason
                  the FIRST block's service columns are blank. */}
              <RotHead label="Oral screening" tone="bg-blue-50" />
              <RotHead label="Fluoride Varnish" tone="bg-blue-50" />
              {/* Curative */}
              <RotHead label="Composite Filling" tone="bg-amber-50" />
              <RotHead label="ART" tone="bg-amber-50" />
              <RotHead label="Temporary Filling" tone="bg-amber-50" />
              <RotHead label="Extraction" tone="bg-amber-50" />
              <RotHead label="Silver Diamine Fluoride" tone="bg-amber-50" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td className={`${td} text-center text-muted-foreground`} colSpan={26}>No clients consulted in this period.</td></tr>
            ) : visible.map((r, i) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className={td}>{i + 1}</td>
                <td className={td}>{r.consultDate ? formatDate(r.consultDate) : ''}</td>
                <td className={td}>{r.philhealth}</td>
                <td className={`${td} font-medium`}>{r.name}</td>
                <td className={`${td} max-w-[220px] truncate`} title={r.address}>{r.address}</td>
                <td className={td}>{r.contact}</td>
                <td className={td}>{r.birthdate ? formatDate(r.birthdate) : ''}</td>
                <td className={td}>{r.age ?? ''}</td>
                <td className={td}>{r.ageGroup}</td>
                <td className={td}>{r.sex}</td>
                {/* FIRST */}
                <td className={`${td} text-center`}>{tick(r.visit1Done)}</td>
                <td className={`${td} text-center`}>{r.risk === 'Low' ? '✓' : ''}</td>
                <td className={`${td} text-center`}>{r.risk === 'Medium' ? '✓' : ''}</td>
                <td className={`${td} text-center`}>{r.risk === 'High' ? '✓' : ''}</td>
                <td className={`${td} text-center text-muted-foreground`}>{NO_SOURCE}</td>
                <td className={`${td} text-center text-muted-foreground`}>{NO_SOURCE}</td>
                <td className={`${td} text-center`}>{hasCode(r.treatments, 'OP')}</td>
                <td className={`${td} text-center`}>{hasCode(r.treatments, 'FV')}</td>
                {/* SECOND */}
                <td className={`${td} text-center`}>{tick(r.visit2Done)}</td>
                <td className={`${td} text-center text-muted-foreground`}>{NO_SOURCE}</td>
                {/* Curative */}
                <td className={`${td} text-center`}>{hasCode(r.treatments, 'PF')}</td>
                <td className={`${td} text-center`}>{hasCode(r.treatments, 'TR')}</td>
                <td className={`${td} text-center`}>{hasCode(r.treatments, 'TF')}</td>
                <td className={`${td} text-center`}>{hasCode(r.treatments, 'X')}</td>
                <td className={`${td} text-center`}>{hasCode(r.treatments, 'SDF')}</td>
                <td className={td} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
