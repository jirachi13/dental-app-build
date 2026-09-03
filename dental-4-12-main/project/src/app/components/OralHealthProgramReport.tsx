import { useMemo, useState, Fragment } from 'react';
import { useDohReportData } from '../hooks/useDohReportData';
import { SkeletonTable } from './Skeleton';
import { FORM_SECTION_BAND, BLOCKED_CELL, BLOCKED_TITLE } from '../utils/dohFormStyle';

// ─── Oral Health Program Reporting Form ──────────────────────────────────────
// Transcribed from the manuscript's APPENDIX F (the user said E; E is the
// Target Client List). Like Appendix E it is a low-resolution embedded scan,
// read by extracting the PNG and enlarging the header bands.
//
// The paper form aggregates by AGE BAND × SEX and covers the whole city
// population — preschool, school age, adolescent, adult, senior citizen and
// pregnant women. Floral only holds SCHOOL children (Kinder–Grade 10).
//
// An earlier version OMITTED the sections with no source, arguing that thirty
// blank columns would be unreadable. The user overruled that 2026-09-02: the
// form must carry the same rows and columns as the printed original, empty
// where there is nothing to report. A blank cell on a DOH form is meaningful,
// and a form missing columns is not the form.
//
// HONESTY: the Services Rendered rows are shown but NOT populated. Per-visit
// services are recorded nowhere — PREVENTIVE_CARE_RECORD stores only
// `iptr_id`, `visit_date` and `visit_number` (the same limitation the Target
// Client List hits). Oral Health Status rows ARE real, summed from the same
// source the DOH Consolidated report uses.

const AGE_BANDS = ['4 yrs & below', '5-9 yrs', '10-14 yrs', '15-19 yrs', '20 yrs & above'] as const;
type AgeBand = typeof AGE_BANDS[number];

// ─── The paper form's full column set ────────────────────────────────────────
// Every column and row the printed form carries is rendered, even where Floral
// can never fill it — the form is the form, and a blank cell on it is
// meaningful (CLAUDE.md, NOTHING COSMETIC). This replaces an earlier version
// that omitted the adult, senior-citizen and pregnant-women sections.
//
// `band` maps a column to one of the five age brackets the system actually
// computes. A column with NO band has no source at that granularity — the
// system records a birthdate, not an age in months, and records no pregnancy
// at all — so it renders "—" rather than a 0 it cannot stand behind.
//
// ⚠ ALL captions here were RESOLVED 2026-09-02 against the machine-readable DOH
// workbook the user supplied (TCLForm2andFHSISReport.xlsx, sheet "2026 Form 2",
// rows 3-5) -- the authoritative source that replaced the low-resolution
// Appendix F scan. No `unverified` flags remain in the column list. Corrections:
// "0-6 mos" -> "0-8 mos"; "Total (Infants)" -> "Total (0-11 mos)"; "5 y/o" ->
// "5 yrs old"; "5-9 y/o" -> "Total (5 - 9 yrs old)"; "Total Adult" -> "Total
// Other Adults"; "60 y/o and above" -> "60 yrs & Above"; and the pregnant-women
// band ends at 49, NOT 59 -- "20-59 y/o" was simply wrong.
//
// ⚠ STILL DIFFERENT FROM THE REAL FORM, and NOT a caption issue: the workbook
// groups columns as Infants (0-11 mos) / Under Five Children / School Age
// Children / Adolescent / Other Adults, where this table uses UNDER FIVE
// CHILDREN / CHILDREN ABOVE 5 / ADULT / SENIOR CITIZEN. It also carries a
// "6 - 9 yrs old" column this table lacks. Group names and missing columns are
// structural; they belong with the missing-columns work.
//
// Original note follows.
// ⚠ `unverified` marks a caption read off a LOW-RESOLUTION scan of Appendix F
// that could not be made out with confidence. They are shown with a dotted
// underline and listed under the table, because an invented caption on a form
// submitted to the City Health Office is a placeholder. CHECK THESE AGAINST THE
// PAPER FORM and clear the flag — the same standing task as the DOH spelling
// check (Transfussion/Scalling/Flouride).
type Col = { group: string; label: string; band?: AgeBand; total?: AgeBand[]; unverified?: boolean };

const COLUMNS: Col[] = [
  { group: 'UNDER FIVE CHILDREN', label: '0-8 mos' },
  { group: 'UNDER FIVE CHILDREN', label: '9-11 mos' },
  { group: 'UNDER FIVE CHILDREN', label: 'Total (0-11 mos)' },
  { group: 'UNDER FIVE CHILDREN', label: '1' },
  { group: 'UNDER FIVE CHILDREN', label: '2' },
  { group: 'UNDER FIVE CHILDREN', label: '3' },
  { group: 'UNDER FIVE CHILDREN', label: '4' },
  { group: 'UNDER FIVE CHILDREN', label: 'Total (Under 5)', total: ['4 yrs & below'] },

  { group: 'CHILDREN ABOVE 5', label: '5 yrs old' },
  { group: 'CHILDREN ABOVE 5', label: 'Total (5 - 9 yrs old)', band: '5-9 yrs' },
  { group: 'CHILDREN ABOVE 5', label: 'Total Children', total: ['5-9 yrs'] },

  { group: 'ADOLESCENT', label: '10-14 y/o', band: '10-14 yrs' },
  { group: 'ADOLESCENT', label: '15-19 y/o', band: '15-19 yrs' },
  { group: 'ADOLESCENT', label: 'Total Adolescent', total: ['10-14 yrs', '15-19 yrs'] },

  { group: 'ADULT', label: '20-59 yrs old', band: '20 yrs & above' },
  { group: 'SENIOR CITIZEN', label: '60 yrs & Above' },
  { group: 'ADULT', label: 'Total Other Adults', total: ['20 yrs & above'] },

  // No source at all: the system records no pregnancy status.
  { group: 'PREGNANT WOMEN', label: '10-14 yrs old' },
  { group: 'PREGNANT WOMEN', label: '15-19 yrs old' },
  { group: 'PREGNANT WOMEN', label: '20-49 yrs old' },
  { group: 'PREGNANT WOMEN', label: 'Total AP' },

  { group: 'TOTAL ALL AGES', label: 'Total All Ages', total: [...AGE_BANDS] },
];

/** Group bands in column order, with their spans. */
const GROUPS = COLUMNS.reduce<{ label: string; span: number }[]>((acc, c) => {
  const last = acc[acc.length - 1];
  if (last && last.label === c.group) last.span += 1;
  else acc.push({ label: c.group, span: 1 });
  return acc;
}, []);

const UNVERIFIED_COUNT = COLUMNS.filter((c) => c.unverified).length;

const SEXES = ['M', 'F'] as const;

/** Indicator rows. `field` maps to useDohReportData's real fields; a null
 *  field means the paper form has the row but the system has no source. */
type Row = {
  label: string;
  field: string | null;
  indent?: boolean;
  /** The paper form BLOCKS these cells out in solid dark grey — they must not
   *  be filled at all. Distinct from `field: null`, which means the form wants
   *  a number and this system has no source for it. Conflating the two would
   *  claim the form forbids a cell it merely leaves empty. */
  blocked?: boolean;
  /** Rows nested under this one. ART splits by restorative material (per the
   *  dentist): the parent can be shown alone, or expanded to show each
   *  material separately. Collapsed by default — the parent is what the form
   *  asks for; the split is the detail behind it. */
  children?: Row[];
};

/** Section A of the paper form. Read off Appendix F (`image18`) on 2026-09-03
 *  — the app carried NONE of these four rows, so a whole printed section was
 *  missing from a form filed with the City Health Office.
 *
 *  All four have real sources: the facility split is Sprint 81's
 *  `facility_based` on the first visit, and the two RPOC rows are the visit
 *  numbers the RPC module has always recorded. */
const UTILIZATION_ROWS: Row[] = [
  { label: 'No. of patients who visited the DENTAL FACILITY for the 1st time', field: 'visit_facility_1st' },
  { label: 'No. of patients who visited NON-FACILITY for the 1st time', field: 'visit_nonfacility_1st' },
  { label: 'No. of patients who availed the Routine Preventive Oral Care (RPOC) — 1ST VISIT', field: 'rpoc_visit1' },
  { label: 'No. of patients who availed the Routine Preventive Oral Care (RPOC) — 2ND VISIT', field: 'rpoc_visit2' },
];

const STATUS_ROWS: Row[] = [
  { label: 'Number of patients with Dental Caries', field: 'DMF_total' },
  // ONE row on the paper form, not two. Counted as "debris OR calculus" in
  // useDohReportData rather than by adding the two separate tallies, which
  // would double-count every patient who has both.
  { label: 'Number of patients with Oral Debris / Calculus Deposits', field: 'debris_or_calculus' },
  { label: 'Number of patients with Gingivitis', field: 'gingivitis' },
  // Was absent although ORAL_HEALTH_CONDITION has carried the boolean all
  // along — it was simply never mapped in useDohReportData.
  { label: 'Number of patients with Periodontitis', field: 'periodontitis' },
  { label: 'Number of patients with suspected oral lesions', field: 'anomaly' },
  // On the form, and structurally impossible here: this table covers school
  // children and carries no adult or elderly column at all. Blocked (dark
  // grey) rather than "—" — the form itself blocks these cells, which is a
  // different statement from "we have no data".
  { label: 'Number of Completely Edentulous Adults / Elderly', field: null, blocked: true },
  { label: 'OFC Upon Oral Examination', field: 'ofc_exam' },
  // No completed mouth rehabilitation is recorded anywhere, so this is a
  // genuine no-source row, not a blocked one.
  { label: 'OFC Upon Complete Oral Rehabilitation', field: null },
];

const SERVICE_ROWS: Row[] = [
  { label: 'Number of patients examined / given Oral Examination', field: 'examined' },
  { label: 'Number of patients provided Oral Health Counselling', field: null },
  { label: 'Number of patients given Oral Prophylaxis', field: null },
  { label: 'Number of patients given Fluoride Varnish — 1st application', field: null, indent: true },
  { label: 'Number of patients given Fluoride Varnish — 2nd application', field: null, indent: true },
  { label: 'Number of patients given Silver Diamine Fluoride (SDF)', field: null },
  {
    label: 'Number of patients given ART',
    field: null,
    children: [
      { label: 'Glass Ionomer (GI)', field: null, indent: true },
      { label: 'Composite', field: null, indent: true },
    ],
  },
  { label: 'Number of patients given Permanent Filling', field: null },
  { label: 'Number of patients given Tooth Extraction', field: null },
];

const OTHER_ROWS: Row[] = [
  { label: 'No. of patients referred to other Primary Care Facilities', field: null },
  { label: 'Total no. of patients referred to a Higher Level of Care', field: null },
];

/** Stable key for a column — group + label, since labels repeat across groups
 *  (both Adolescent and Pregnant Women carry "10-14 y/o"). */
const colKey = (c: Col) => `${c.group}|${c.label}`;

function loadSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export const OralHealthProgramReport = ({ schoolYear = null, schoolName = null }: { schoolYear?: string | null; schoolName?: string | null }) => {
  // Scoped to the SAME school the DOH tab's picker selects, not the sidebar's
  // current school — the two are different controls and this form is read
  // beside the consolidated report.
  const { getRealTotal, loading } = useDohReportData(schoolYear, schoolName);

  // Hidden rows/columns and expanded parents, remembered per browser.
  //
  // ⚠ Hiding CHANGES THE OUTPUT, not just the view — the dentist asked for
  // that explicitly ("so report can change content ... like excels"). A print
  // of this form therefore may not be the complete standard form, so the note
  // under the table NAMES what is hidden. An incomplete form that looks
  // complete is the failure mode worth preventing.
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(() => loadSet('ohprf-hidden-rows'));
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => loadSet('ohprf-hidden-cols'));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  const persist = (key: string, next: Set<string>) => {
    try { window.localStorage.setItem(key, JSON.stringify([...next])); } catch { /* private mode */ }
  };
  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  };
  const visibleCols = COLUMNS.filter((c) => !hiddenCols.has(colKey(c)));
  // Recomputed from what is actually shown — a group band spanning hidden
  // columns would push the whole header out of alignment with its body.
  const visibleGroups = visibleCols.reduce<{ label: string; span: number }[]>((acc, c) => {
    const last = acc[acc.length - 1];
    if (last && last.label === c.group) last.span += 1;
    else acc.push({ label: c.group, span: 1 });
    return acc;
  }, []);
  const hiddenCount = hiddenRows.size + hiddenCols.size;
  const rowVisible = (r: Row) => !hiddenRows.has(r.label);

  // The form's columns are age × sex only. This reads the hook's across-all-
  // grades total rather than summing getRealCount over a grade list: that sum
  // silently dropped any record whose grade was never stored (school years
  // before Sprint 57a), which on a submitted form is an undercount of real
  // patients.
  /** One cell: a mapped band, a computed total, or "—" where the system has
   *  no source at that granularity. Never 0-as-a-guess. */
  const cell = useMemo(() => (field: string | null, col: Col, sex: 'M' | 'F'): number | null => {
    if (!field) return null;
    if (col.total) return col.total.reduce((sum, b) => sum + (getRealTotal(b, sex, field) ?? 0), 0);
    if (col.band) return getRealTotal(col.band, sex, field) ?? 0;
    return null;
  }, [getRealTotal]);

  const rowTotal = (field: string | null) => {
    if (!field) return null;
    let t = 0;
    for (const b of AGE_BANDS) for (const s of SEXES) t += getRealTotal(b, s, field) ?? 0;
    return t;
  };

  if (loading) return <SkeletonTable rows={10} />;

  const th = 'px-2 py-2 text-[11px] font-semibold text-foreground border border-border whitespace-nowrap';
  const td = 'px-2 py-1.5 text-xs text-foreground border border-border text-center tabular-nums';
  const labelTd = 'px-2 py-1.5 text-xs text-foreground border border-border whitespace-nowrap text-left';

  const section = (title: string) => (
    // Amber band across the full width, as printed — was bg-amber-50, a tint
    // so light the sections read as ordinary rows.
    // Band painted on the TD, not only the TR: html2canvas (the PDF export
    // path) resolves cell backgrounds reliably and row backgrounds not always,
    // so a tr-only fill can vanish from the exported form.
    <tr className={FORM_SECTION_BAND}>
      <td className={`${labelTd} font-bold ${FORM_SECTION_BAND}`} colSpan={visibleCols.length * 2 + 2}>{title}</td>
    </tr>
  );

  const renderRow = (r: Row): React.ReactNode => {
    if (!rowVisible(r)) return null;
    const isOpen = expanded.has(r.label);
    return (
      <Fragment key={r.label}>
        {renderOneRow(r, isOpen)}
        {/* Sub-rows only when the parent is expanded — "show ART only, or also
            show the subrows". */}
        {r.children && isOpen && r.children.filter(rowVisible).map((c) => renderOneRow(c, false))}
      </Fragment>
    );
  };

  const renderOneRow = (r: Row, isOpen: boolean) => (
    <tr key={r.label} className="hover:bg-gray-50">
      <td className={`${labelTd} ${r.indent ? 'pl-6' : ''}`}>
        {r.children ? (
          <button
            onClick={() => setExpanded((p) => toggle(p, r.label))}
            aria-expanded={isOpen}
            className="inline-flex items-center gap-1 text-left hover:text-primary"
          >
            <span className="text-[10px] w-3 inline-block">{isOpen ? '▾' : '▸'}</span>
            {r.label}
          </button>
        ) : r.label}
      </td>
      {visibleCols.map((c) => SEXES.map((s) => {
        const v = cell(r.field, c, s);
        return (
          // A blocked cell carries no value and no dash — the paper form fills
          // it solid, meaning "do not write here". `—` would invite a number.
          r.blocked ? (
            <td key={`${c.group}-${c.label}-${s}`} className={`${td} ${BLOCKED_CELL}`} title={BLOCKED_TITLE} />
          ) : (
          <td key={`${c.group}-${c.label}-${s}`} className={`${td} ${v === null ? 'text-muted-foreground' : ''}`}>
            {v === null ? '—' : v}
          </td>
          )
        );
      }))}
      {r.blocked ? (
        <td className={`${td} ${BLOCKED_CELL}`} title={BLOCKED_TITLE} />
      ) : (
      <td className={`${td} font-semibold bg-gray-50`}>
        {rowTotal(r.field) === null ? <span className="text-muted-foreground">—</span> : rowTotal(r.field)}
      </td>
      )}
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {schoolYear ? `School year ${schoolYear}` : 'All years to date'}
            </span>
            <button
              onClick={() => setShowPicker((v) => !v)}
              aria-expanded={showPicker}
              className="text-xs px-2 py-1 border border-border rounded-md text-foreground hover:bg-gray-50"
            >
              {showPicker ? 'Done' : `Rows & columns${hiddenCount ? ` (${hiddenCount} hidden)` : ''}`}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The paper form covers the whole city population; Floral holds school children only, so its
          <span className="font-medium text-foreground"> adult, senior citizen and pregnant-women </span>
          columns stay empty here. Rows marked
          <span className="font-semibold text-foreground"> — </span>
          exist on the form but have no source in the system yet: per-visit services are not recorded, only visit dates.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Every column and row of the paper form is shown, including those a school clinic can never fill —
          a blank cell on this form is meaningful. Cells read <span className="font-semibold text-foreground">—</span>{' '}
          where the system has no source at that granularity: it records a birthdate, not an age in months,
          and records no pregnancy at all.
          {hiddenCount > 0 && (
            <> <span className="font-semibold text-foreground">This form is not the complete standard form:</span>{' '}
            {hiddenRows.size} row{hiddenRows.size === 1 ? '' : 's'} and {hiddenCols.size} column
            {hiddenCols.size === 1 ? '' : 's'} are hidden, and hidden items do not print.</>
          )}
          {UNVERIFIED_COUNT > 0 && (
            <> <span className="border-b border-dotted border-amber-500">Dotted</span> column captions
            ({UNVERIFIED_COUNT}) were read from a low-resolution scan of Appendix F and still need checking
            against the paper form — they are marked rather than silently trusted.</>
          )}
        </p>
      </div>

      {showPicker && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3 text-xs">
          <p className="text-muted-foreground">
            Untick to hide. Hiding changes what is <span className="font-medium text-foreground">printed</span>,
            not just what is on screen — the note under the table records anything hidden, so a shortened form
            is never mistaken for the complete one.
          </p>
          <div>
            <div className="font-semibold text-foreground mb-1.5">Columns</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              {COLUMNS.map((c) => (
                <label key={colKey(c)} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(colKey(c))}
                    onChange={() => setHiddenCols((p) => { const n = toggle(p, colKey(c)); persist('ohprf-hidden-cols', n); return n; })}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  <span className="truncate" title={`${c.group} · ${c.label}`}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1.5">Rows</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {[...UTILIZATION_ROWS, ...STATUS_ROWS, ...SERVICE_ROWS, ...OTHER_ROWS].map((r) => (
                <label key={r.label} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hiddenRows.has(r.label)}
                    onChange={() => setHiddenRows((p) => { const n = toggle(p, r.label); persist('ohprf-hidden-rows', n); return n; })}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  <span className="truncate" title={r.label}>{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          {hiddenCount > 0 && (
            <button
              onClick={() => {
                setHiddenRows(new Set()); persist('ohprf-hidden-rows', new Set());
                setHiddenCols(new Set()); persist('ohprf-hidden-cols', new Set());
              }}
              className="px-2 py-1 border border-border rounded-md text-foreground hover:bg-gray-50"
            >Show everything</button>
          )}
        </div>
      )}

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
              {visibleGroups.map((g, i) => (
                <th key={`${g.label}-${i}`} className={`${th} bg-gray-100`} colSpan={g.span * SEXES.length}>
                  {g.label}
                </th>
              ))}
              <th className={`${th} align-bottom`} rowSpan={3}>Grand<br />Total</th>
            </tr>
            <tr>
              {visibleCols.map((c, i) => (
                <th key={`${c.label}-${i}`} className={th} colSpan={2}>
                  {/* Dotted underline marks a caption read off the low-res scan
                      that still needs checking against the paper form. */}
                  <span className={c.unverified ? 'border-b border-dotted border-amber-500' : ''}
                        title={c.unverified ? 'Caption unverified — check against the paper DOH form' : undefined}>
                    {c.label}
                  </span>
                </th>
              ))}
            </tr>
            <tr>
              {visibleCols.map((c, i) => SEXES.map((s) => (
                <th key={`${c.label}-${i}-${s}`} className={`${th} w-10`}>{s}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {/* Lettered A–D, as the paper form numbers them. The app used
                I/II/III and was missing section A entirely. */}
            {section('A. Patient Seeking Utilization')}
            {UTILIZATION_ROWS.map(renderRow)}
            {section('B. Oral Health Status')}
            {STATUS_ROWS.map(renderRow)}
            {section('C. Services Rendered')}
            {SERVICE_ROWS.map(renderRow)}
            {section('D. Other Parameters')}
            {OTHER_ROWS.map(renderRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
};
