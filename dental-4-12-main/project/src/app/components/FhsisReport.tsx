import { useState } from 'react';
import { useFhsisData, FHSIS_BANDS, type FhsisBandKey, type Measure } from '../hooks/useFhsisData';
import { SkeletonTable } from './Skeleton';

// ─── FHSIS · SECTION D. ORAL HEALTH CARE SERVICES ────────────────────────────
// Transcribed from the "FHSIS" sheet of the workbook the user supplied
// (TCLForm2andFHSISReport.xlsx). That workbook carries TWO variants of this
// form: one headed "Health Center:" and one headed "School:". This is the
// SCHOOL one — the level Floral is scoped to. The health-centre variant
// consolidates sources Floral does not hold and is a separate report.
//
// The form is two mirrored halves: FIRST VISIT on the left, COMPLETED 2 VISITS
// on the right, each broken down by age band and sex. That maps directly onto
// the two-visit RPC module, so unlike the Program Report's Services Rendered
// rows, these numbers are REAL — counted from PREVENTIVE_CARE_RECORD.
//
// WHAT IS DELIBERATELY BLANK (CLAUDE.md, NOTHING COSMETIC — the form keeps all
// its rows, and a blank cell on a DOH form is meaningful):
//
//  * The `a` (facility-based) and `b` (non-facility-based) sub-rows. The paper
//    Target Client List records this per patient as "Facility Based 0/1", but
//    Floral has NO such field anywhere — verified 2026-09-02. Splitting the
//    total on an assumption ("school screening must be non-facility") would
//    invent a number on a form filed with the City Health Office, so both
//    sub-rows render "—" and the total carries the real figure.
//  * The Pregnant Women block. No pregnancy is recorded anywhere in the
//    schema, the same limitation the Oral Health Program Report hits.
//
// Age bands ARE all computed, including Infants and Seniors: a birthday is
// recorded, so those cells are genuine counts that happen to be 0 at a school,
// not fabrications. A true 0 and an unfillable cell are different claims and
// the form shows them differently.

const MEASURES: { key: Measure; heading: string; caption: (band: string) => string }[] = [
  {
    key: 'first',
    heading: 'FIRST VISIT TO AN ORAL HEALTH CARE PROFESSIONAL',
    caption: (b) => `${b} who had their 1st visit to an oral health care professional within a year`,
  },
  {
    key: 'completed',
    heading: 'COMPLETED 2 VISITS',
    caption: (b) => `${b} who completed 2 visits to an oral health care professional within a year`,
  },
];

/** Pregnant-women rows are on the printed form and have no source. */
const PREGNANT_AGE_GROUPS = ['10-14', '15-19', '20-49'] as const;

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  if (!y || !mo) return m;
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
};

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const FhsisReport = ({ schoolName }: { schoolName: string }) => {
  const [month, setMonth] = useState(thisMonth);
  const { counts, monthsWithData, loading, error } = useFhsisData(month, schoolName);

  if (error) {
    return <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>;
  }
  if (loading) return <SkeletonTable rows={12} />;

  const cell = (v: number) => <td className="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{v}</td>;
  const blank = (title: string) => (
    <td className="border border-gray-300 px-2 py-1.5 text-center text-muted-foreground" title={title}>
      —
    </td>
  );
  const NO_FACILITY_FIELD = 'Not recorded by this system — the facility-based flag has no field in Floral.';
  const NO_PREGNANCY = 'Not recorded by this system — no pregnancy field exists in the schema.';

  return (
    <div className="space-y-4">
      {/* Controls — the month picker filters real data, not just the caption. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between fhsis-controls">
        <div className="flex flex-col gap-1">
          <label htmlFor="fhsis-month" className="text-xs font-medium text-muted-foreground">
            Reporting month
          </label>
          <input
            id="fhsis-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {monthsWithData.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Visits recorded in: {monthsWithData.slice(0, 6).map(monthLabel).join(', ')}
            {monthsWithData.length > 6 ? '…' : ''}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-card p-4">
        {/* Header band, as printed. */}
        <div className="mb-3 text-sm">
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <span>
              <span className="font-semibold">School:</span> {schoolName || 'All schools'}
            </span>
            <span>
              <span className="font-semibold">Month:</span> {monthLabel(month)}
            </span>
          </div>
          <div className="mt-2 font-semibold">SECTION D. ORAL HEALTH CARE SERVICES</div>
        </div>

        <table className="w-full min-w-[900px] border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th rowSpan={2} className="border border-gray-300 px-2 py-1.5 text-left">Indicators</th>
              <th colSpan={2} className="border border-gray-300 px-2 py-1.5">Sex</th>
              <th rowSpan={2} className="border border-gray-300 px-2 py-1.5">Total</th>
              <th rowSpan={2} className="border border-gray-300 px-2 py-1.5">Remarks</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1.5">Male</th>
              <th className="border border-gray-300 px-2 py-1.5">Female</th>
            </tr>
          </thead>
          <tbody>
            {MEASURES.map((measure) => (
              <>
                <tr key={measure.key} className="bg-gray-100">
                  <td colSpan={5} className="border border-gray-300 px-2 py-1.5 font-semibold">
                    {measure.heading}
                  </td>
                </tr>
                {FHSIS_BANDS.map((band, idx) => {
                  const c = counts[band.key as FhsisBandKey][measure.key];
                  // Infants have no facility/non-facility split on the form.
                  const hasSubRows = band.key !== 'infants';
                  const n = idx + 1;
                  return (
                    <>
                      <tr key={`${measure.key}-${band.key}`}>
                        <td className="border border-gray-300 px-2 py-1.5">
                          {band.key === 'infants'
                            ? `${n}. Infants 0-11 months old who had their first dental visit`
                            : `${n}. ${measure.caption(band.label)}`}
                        </td>
                        {cell(c.male)}
                        {cell(c.female)}
                        {cell(c.male + c.female)}
                        <td className="border border-gray-300 px-2 py-1.5" />
                      </tr>
                      {hasSubRows &&
                        (['a', 'b'] as const).map((suffix) => (
                          <tr key={`${measure.key}-${band.key}-${suffix}`} className="text-muted-foreground">
                            <td className="border border-gray-300 px-2 py-1.5 pl-6">
                              {n}
                              {suffix}. {band.label} who{' '}
                              {measure.key === 'first' ? 'had their 1st visit' : 'completed 2 visits'} to a{' '}
                              {suffix === 'a' ? 'facility-based' : 'non-facility-based'} oral health care professional
                              within a year
                            </td>
                            {blank(NO_FACILITY_FIELD)}
                            {blank(NO_FACILITY_FIELD)}
                            {blank(NO_FACILITY_FIELD)}
                            <td className="border border-gray-300 px-2 py-1.5 text-[11px]">not recorded</td>
                          </tr>
                        ))}
                    </>
                  );
                })}
              </>
            ))}

            {/* Pregnant women — on the form, no source in the system. */}
            <tr className="bg-gray-100">
              <td colSpan={5} className="border border-gray-300 px-2 py-1.5 font-semibold">
                PREGNANT WOMEN (by age group)
              </td>
            </tr>
            {MEASURES.map((measure) =>
              PREGNANT_AGE_GROUPS.map((group) => (
                <tr key={`preg-${measure.key}-${group}`} className="text-muted-foreground">
                  <td className="border border-gray-300 px-2 py-1.5">
                    6. Pregnant Women {group} who{' '}
                    {measure.key === 'first' ? 'had their 1st visit' : 'completed 2 visits'} to an oral health care
                    professional within a year
                  </td>
                  {blank(NO_PREGNANCY)}
                  {blank(NO_PREGNANCY)}
                  {blank(NO_PREGNANCY)}
                  <td className="border border-gray-300 px-2 py-1.5 text-[11px]">not recorded</td>
                </tr>
              )),
            )}
          </tbody>
        </table>

        <p className="mt-3 text-xs text-muted-foreground">
          Counts come from recorded preventive-care visits for the selected month. Cells marked “—” are rows the
          printed form carries but this system has no field for — the facility-based split and pregnancy status — and
          are left blank rather than estimated.
        </p>
      </div>
    </div>
  );
};
