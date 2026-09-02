import { useMemo } from 'react';
import { useDohReportData } from '../hooks/useDohReportData';
import { SkeletonTable } from './Skeleton';

// ─── Oral Health Program Reporting Form ──────────────────────────────────────
// Transcribed from the manuscript's APPENDIX F (the user said E; E is the
// Target Client List). Like Appendix E it is a low-resolution embedded scan,
// read by extracting the PNG and enlarging the header bands.
//
// The paper form aggregates by AGE BAND × SEX and covers the whole city
// population — preschool, school age, adolescent, adult, senior citizen and
// pregnant women. Floral only holds SCHOOL children (Kinder–Grade 10), so the
// adult / senior / pregnant sections have no source and are not rendered; the
// note in the UI says so. Rendering thirty permanently blank columns would
// make the table unreadable and imply data that cannot exist here.
//
// HONESTY: the Services Rendered rows are shown but NOT populated. Per-visit
// services are recorded nowhere — PREVENTIVE_CARE_RECORD stores only
// `iptr_id`, `visit_date` and `visit_number` (the same limitation the Target
// Client List hits). Oral Health Status rows ARE real, summed from the same
// source the DOH Consolidated report uses.

const AGE_BANDS = ['4 yrs & below', '5-9 yrs', '10-14 yrs', '15-19 yrs', '20 yrs & above'] as const;

/** The population groups the paper form runs above its age columns. Only the
 *  four Floral can populate appear — the form also carries Senior Citizen and
 *  Pregnant Women bands, which a school clinic has no source for. `bands` must
 *  stay a partition of AGE_BANDS, in the same order, or the colSpans drift. */
const AGE_GROUP_BANDS: { label: string; bands: readonly string[] }[] = [
  { label: 'UNDER FIVE CHILDREN', bands: ['4 yrs & below'] },
  { label: 'CHILDREN ABOVE 5', bands: ['5-9 yrs'] },
  { label: 'ADOLESCENT', bands: ['10-14 yrs', '15-19 yrs'] },
  { label: 'ADULT', bands: ['20 yrs & above'] },
];
const SEXES = ['M', 'F'] as const;

/** Indicator rows. `field` maps to useDohReportData's real fields; a null
 *  field means the paper form has the row but the system has no source. */
type Row = { label: string; field: string | null; indent?: boolean };

const STATUS_ROWS: Row[] = [
  { label: 'Number of patients with Dental Caries', field: 'DMF_total' },
  { label: 'Number of patients with Oral Debris', field: 'debris' },
  { label: 'Number of patients with Calculus Deposits', field: 'calculus' },
  { label: 'Number of patients with Gingivitis', field: 'gingivitis' },
  { label: 'Number of patients with suspected oral lesions / anomaly', field: 'anomaly' },
  { label: 'Orally Fit Children upon Oral Examination', field: 'ofc_exam' },
];

const SERVICE_ROWS: Row[] = [
  { label: 'Number of patients examined / given Oral Examination', field: 'examined' },
  { label: 'Number of patients provided Oral Health Counselling', field: null },
  { label: 'Number of patients given Oral Prophylaxis', field: null },
  { label: 'Number of patients given Fluoride Varnish — 1st application', field: null, indent: true },
  { label: 'Number of patients given Fluoride Varnish — 2nd application', field: null, indent: true },
  { label: 'Number of patients given Silver Diamine Fluoride (SDF)', field: null },
  { label: 'Number of patients given ART', field: null },
  { label: 'Number of patients given Permanent Filling', field: null },
  { label: 'Number of patients given Tooth Extraction', field: null },
];

const OTHER_ROWS: Row[] = [
  { label: 'No. of patients referred to other Primary Care Facilities', field: null },
  { label: 'Total no. of patients referred to a Higher Level of Care', field: null },
];

export const OralHealthProgramReport = ({ schoolYear = null, schoolName = null }: { schoolYear?: string | null; schoolName?: string | null }) => {
  // Scoped to the SAME school the DOH tab's picker selects, not the sidebar's
  // current school — the two are different controls and this form is read
  // beside the consolidated report.
  const { getRealTotal, loading } = useDohReportData(schoolYear, schoolName);

  // The form's columns are age × sex only. This reads the hook's across-all-
  // grades total rather than summing getRealCount over a grade list: that sum
  // silently dropped any record whose grade was never stored (school years
  // before Sprint 57a), which on a submitted form is an undercount of real
  // patients.
  const cell = useMemo(() => (field: string | null, band: string, sex: 'M' | 'F'): number | null => {
    if (!field) return null;
    return getRealTotal(band, sex, field) ?? 0;
  }, [getRealTotal]);

  const rowTotal = (field: string | null) => {
    if (!field) return null;
    let t = 0;
    for (const b of AGE_BANDS) for (const s of SEXES) t += cell(field, b, s) ?? 0;
    return t;
  };

  if (loading) return <SkeletonTable rows={10} />;

  const th = 'px-2 py-2 text-[11px] font-semibold text-foreground border border-border whitespace-nowrap';
  const td = 'px-2 py-1.5 text-xs text-foreground border border-border text-center tabular-nums';
  const labelTd = 'px-2 py-1.5 text-xs text-foreground border border-border whitespace-nowrap text-left';

  const section = (title: string) => (
    <tr className="bg-amber-50">
      <td className={`${labelTd} font-bold`} colSpan={AGE_BANDS.length * 2 + 2}>{title}</td>
    </tr>
  );

  const renderRow = (r: Row) => (
    <tr key={r.label} className="hover:bg-gray-50">
      <td className={`${labelTd} ${r.indent ? 'pl-6' : ''}`}>{r.label}</td>
      {AGE_BANDS.map((b) => SEXES.map((s) => {
        const v = cell(r.field, b, s);
        return (
          <td key={`${b}-${s}`} className={`${td} ${v === null ? 'text-muted-foreground' : ''}`}>
            {v === null ? '—' : v}
          </td>
        );
      }))}
      <td className={`${td} font-semibold bg-gray-50`}>
        {rowTotal(r.field) === null ? <span className="text-muted-foreground">—</span> : rowTotal(r.field)}
      </td>
    </tr>
  );

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-bold text-foreground">Oral Health Program Reporting Form</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {/* Names the scope the FIGURES actually cover. Falling back to the
                sidebar's current school here would label all-schools data with
                one school's name — the exact mislabelling this sprint fixes. */}
            {schoolName ?? 'All schools'} · Barangay Tanyag, Taguig City
          </span>
          {/* The period now comes from the DOH tab's school-year picker, which
              this form shares (Sprint 57b). Before that the hook took no date
              range at all and this said so rather than offering a control that
              silently did nothing. */}
          <span className="text-xs text-muted-foreground">
            {schoolYear ? `School year ${schoolYear}` : 'All years to date'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The paper form covers the whole city population. Floral holds school children only, so its
          <span className="font-medium text-foreground"> adult, senior citizen and pregnant-women </span>
          sections are omitted rather than shown permanently empty. Rows marked
          <span className="font-semibold text-foreground"> — </span>
          exist on the form but have no source in the system yet: per-visit services are not recorded, only visit dates.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="border-collapse w-full">
          <thead className="bg-gray-50">
            {/* Three header levels, matching the paper form: population group
                → age column → M/F. This file previously had only the lower two,
                which made the band a third of its printed height and dropped
                the grouping that tells a reader why the age columns are cut
                where they are. Only the groups Floral can actually populate are
                rendered — see the note above about the adult / senior citizen /
                pregnant-women sections. */}
            <tr>
              <th className={`${th} text-left align-bottom`} rowSpan={3}>INDICATORS</th>
              {AGE_GROUP_BANDS.map((g) => (
                <th key={g.label} className={`${th} bg-gray-100`} colSpan={g.bands.length * SEXES.length}>
                  {g.label}
                </th>
              ))}
              <th className={`${th} align-bottom`} rowSpan={3}>Grand<br />Total</th>
            </tr>
            <tr>
              {AGE_BANDS.map((b) => <th key={b} className={th} colSpan={2}>{b}</th>)}
            </tr>
            <tr>
              {AGE_BANDS.map((b) => SEXES.map((s) => (
                <th key={`${b}-${s}`} className={`${th} w-10`}>{s}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {section('I. Oral Health Status')}
            {STATUS_ROWS.map(renderRow)}
            {section('II. Services Rendered')}
            {SERVICE_ROWS.map(renderRow)}
            {section('III. Other Parameters')}
            {OTHER_ROWS.map(renderRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
};
