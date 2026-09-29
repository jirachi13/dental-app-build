import type { Dispatch, SetStateAction } from 'react';
import { Save, Pencil, ChevronLeft, ChevronRight, Minimize2, Check, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { formatDate } from '../utils/localDate';
import type { GradeColor } from '../utils/gradeColors';
import type { IptrYearData } from '../hooks/useDentalChartData';
import type { sectionBRows } from '../../../shared/iptrSectionB';
import { GradePill } from './GradePill';
import { ToothButton } from './ToothButton';
import type { OralDraft, ServiceField } from './iptrDrafts';
import {
  upperPermanent,
  lowerPermanent,
  upperTemporary,
  lowerTemporary,
  commonConditionCodes,
  rareConditionCodes,
  conditionCodes,
  treatmentCodes,
  perToothTreatmentCodes,
  wholeMouthTreatmentCodes,
  treatmentLabel,
  type computeDMFT,
  type ChartEntry,
} from '../utils/dentalChartCodes';

// TAB 2 — the Dental Chart: the whole-mouth chips, the charting picker, the
// code palette, the odontogram, DMFT/dmft, and the two summaries.
//
// Extracted from `DentalChart.tsx` in Sprint 162 (162d), UNCHANGED. The JSX
// below was moved byte for byte by script, not retyped; the only edit is
// `surnameFirst(student)` → `studentName`, computed by the host.
//
// ⚠ THE SCREEN A DENTIST ACTUALLY CHARTS IN. Every piece of state it touches
// stays in the HOST, deliberately — the draft chart must survive switching tabs
// and is what Save Chart writes, and the palette selection is what the host's
// `handleToothClick` reads. Nothing moved into this file's own state, so
// nothing can reset on a tab switch that did not reset before.
//
// The seam, following the other four tabs: read-only values are plain props;
// everything this panel can CHANGE arrives in one of three named bundles —
// `actions` (host handlers), `palette` (which code is armed), `drafts` (the
// whole-mouth chips and dates). The bundles are destructured below under the
// host's own names, which is what let the JSX move without a single rename.

export type IptrContext = 'default' | 'dental-queue' | 'risk' | 'treatment';

type StepTarget = { id: string; name: string };

// ─── Whole-mouth findings, as CHIPS (Sprint 154) ─────────────────────────────
// Layout and wording adopted from the collaborator's `majorUpdates` branch.
// These describe the MOUTH, not a tooth: you do not have calculus "on tooth 26"
// for charting purposes, you either have it or you do not. Stored on
// ORAL_HEALTH_CONDITION, one row per school year, and rendered as chips rather
// than as palette buttons so the difference is visible rather than remembered.
const oralConditionChips: { label: string; field: keyof OralDraft }[] = [
  { label: 'Debris', field: 'debris' },
  { label: 'Gingivitis', field: 'gingivitis' },
  { label: 'Calculus', field: 'calculus' },
  { label: 'Periodontal Disease', field: 'periodontal' },
  { label: 'Cleft Lip / Palate', field: 'cleftLipPalate' },
  { label: 'Abnormal Growth', field: 'abnormalGrowth' },
];

// ─── Services given AT a visit (Sprint 154) ──────────────────────────────────
// Her card, our storage. She kept these on DENTAL_CHART; ours live on
// PREVENTIVE_CARE_RECORD against the RPC visit (Sprint 147), which is what the
// Target Client List and the DOH return actually read. The DESIGN is unchanged
// by that — she draws these apart from the per-tooth codes for the same reason
// we store them apart.
//
// ⚠ Two of her chips are NOT here: "Consultation" and a free-text "Others".
// Neither has a field on PREVENTIVE_CARE_RECORD, and a checkbox that saves
// nowhere is exactly the placeholder CLAUDE.md forbids. Adding them is a model
// change and needs the dentist's word on what Consultation means for the
// return. `oral_hygiene_instruction` is ours and hers has no chip for it.
const serviceChips: { label: string; field: ServiceField }[] = [
  { label: 'Oral Examination', field: 'oral_screening' },
  { label: 'Fluoride Varnish', field: 'fluoride_varnish' },
  { label: 'Oral Prophylaxis', field: 'oral_prophylaxis' },
  { label: 'Oral Hygiene Instruction', field: 'oral_hygiene_instruction' },
];

export interface ChartTabActions {
  setChartingMode: (on: boolean) => void;
  setEditMode: (on: boolean) => void;
  cancelEdit: () => void;
  handleSave: () => void;
  goToStudent: (target: StepTarget | null) => void;
  setSelectedChartId: (id: string) => void;
  setConfirmClear: (which: 'condition' | 'treatment') => void;
  /** What a click on a tooth MEANS — owned by the host, which owns the draft. */
  handleToothClick: (tooth: number) => void;
}

export interface ChartTabPalette {
  selectedCondition: string | null;
  setSelectedCondition: Dispatch<SetStateAction<string | null>>;
  selectedTreatment: string | null;
  setSelectedTreatment: Dispatch<SetStateAction<string | null>>;
  rareConditionsOpen: boolean;
  setRareConditionsOpen: Dispatch<SetStateAction<boolean>>;
  rareTreatmentsOpen: boolean;
  setRareTreatmentsOpen: Dispatch<SetStateAction<boolean>>;
}

export interface ChartTabDrafts {
  draftChartDate: string;
  setDraftChartDate: Dispatch<SetStateAction<string>>;
  draftOral: OralDraft;
  setDraftOral: Dispatch<SetStateAction<OralDraft>>;
  othersOralOpen: boolean;
  setOthersOralOpen: Dispatch<SetStateAction<boolean>>;
  draftVisitDate: string;
  setDraftVisitDate: Dispatch<SetStateAction<string>>;
  draftServices: Record<ServiceField, boolean | null>;
  setDraftServices: Dispatch<SetStateAction<Record<ServiceField, boolean | null>>>;
}

export function DentalChartTab({
  chartingMode,
  studentName,
  yearGrade,
  yearSection,
  gc,
  currentYearData,
  navIndex,
  navList,
  prevPatient,
  nextPatient,
  canEdit,
  editMode,
  saving,
  saved,
  editingChart,
  editingHistory,
  linkedVisitForCard,
  iptrContext,
  currentChart,
  chartedConditionCount,
  chartedTreatmentCount,
  dmft,
  presentOralConditions,
  indicateNumberRows,
  perToothTreatmentRows,
  treatmentTeeth,
  actions,
  palette,
  drafts,
}: {
  chartingMode: boolean;
  studentName: string;
  yearGrade: string | null;
  yearSection: string | null;
  gc: GradeColor;
  currentYearData: IptrYearData | undefined;
  navIndex: number;
  /** Only its length is read, for "3 of 40". */
  navList: readonly unknown[];
  prevPatient: StepTarget | null;
  nextPatient: StepTarget | null;
  canEdit: boolean;
  editMode: boolean;
  saving: boolean;
  saved: boolean;
  editingChart: boolean;
  editingHistory: boolean;
  /** The RPC visit this charting is attached to. Only its PRESENCE is read:
   *  without one, Treatments Given is read-only (see the note in the JSX). */
  linkedVisitForCard: unknown;
  iptrContext: IptrContext;
  currentChart: Record<number, ChartEntry>;
  chartedConditionCount: number;
  chartedTreatmentCount: number;
  dmft: ReturnType<typeof computeDMFT>;
  presentOralConditions: { label: string; present: boolean }[];
  indicateNumberRows: ReturnType<typeof sectionBRows>;
  perToothTreatmentRows: typeof treatmentCodes;
  treatmentTeeth: Record<string, number[]>;
  actions: ChartTabActions;
  palette: ChartTabPalette;
  drafts: ChartTabDrafts;
}) {
  const { setChartingMode, setEditMode, cancelEdit, handleSave, goToStudent, setSelectedChartId, setConfirmClear, handleToothClick } = actions;
  const {
    selectedCondition, setSelectedCondition, selectedTreatment, setSelectedTreatment,
    rareConditionsOpen, setRareConditionsOpen, rareTreatmentsOpen, setRareTreatmentsOpen,
  } = palette;
  const {
    draftChartDate, setDraftChartDate, draftOral, setDraftOral, othersOralOpen, setOthersOralOpen,
    draftVisitDate, setDraftVisitDate, draftServices, setDraftServices,
  } = drafts;

  // Moved with the odontogram from the host (was `ToothButton` + `padToArch`
  // there). A tooth is armed when a dentist is editing AND a code is selected.
  const toothArmed = editingChart && !!(selectedCondition || selectedTreatment);
  const tooth = (n: number) => (
    <ToothButton key={n} num={n} entry={currentChart[n]} clickable={editingChart} armed={toothArmed} onClick={handleToothClick} />
  );

  // A primary arch holds 10 teeth against the permanent arch's 16. The three
  // missing positions at each end are the molars that have no primary
  // predecessor (18/17/16 and 26/27/28), so blank slots there put every
  // primary tooth under its successor. Same flex sizing as ToothButton, so the
  // columns cannot drift apart.
  const padToArch = (teeth: number[]) => [
    ...Array.from({ length: 3 }, (_, i) => <div key={`pad-l${i}`} aria-hidden className="min-w-[40px] max-w-[56px] flex-1" />),
    ...teeth.map(tooth),
    ...Array.from({ length: 3 }, (_, i) => <div key={`pad-r${i}`} aria-hidden className="min-w-[40px] max-w-[56px] flex-1" />),
  ];

  return (
    /* ⚠ The SAME JSX renders in both states — charting mode only changes
       this container. Duplicating the odontogram into a separate overlay
       component is how two charting surfaces drift apart. z-[75] clears
       the nav rail, which is what frees the full width. */
    <div className={chartingMode ? 'fixed inset-0 z-[75] bg-canvas overflow-y-auto overscroll-contain' : 'p-0 space-y-0'}>
      {chartingMode && (
        /* flex-wrap + min-w-0, not a bare justify-between: this bar is
           read on a tablet at the chair as well as on a laptop. */
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-base font-bold text-foreground truncate">{studentName}</span>
            {/* The same coloured pills the patient card uses. Charting
                mode is exactly where a dentist confirms they have the
                right child, so it should not invent a new way to say it. */}
            {yearGrade && <GradePill grade={yearGrade} />}
            {yearSection && (
              <span style={{ backgroundColor: gc.light, color: gc.solid }}
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">{yearSection}</span>
            )}
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentYearData?.iptr.school_year}
              {navIndex >= 0 ? ` · ${navIndex + 1} of ${navList.length}` : ''}
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canEdit && (editMode ? (
              <>
                <button onClick={cancelEdit} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60 ${saved ? 'bg-green-600' : 'bg-primary hover:bg-primary-hover'}`}>
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : saved ? 'Saved' : 'Save Chart'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                <Pencil className="w-3.5 h-3.5" /> Edit Chart
              </button>
            ))}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button onClick={() => goToStudent(prevPatient)} disabled={!prevPatient}
                title={prevPatient ? `← ${prevPatient.name}` : undefined}
                className="flex items-center gap-1 border-r border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button onClick={() => goToStudent(nextPatient)} disabled={!nextPatient}
                title={nextPatient ? `${nextPatient.name} →` : undefined}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default">
                Next student <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={() => setChartingMode(false)} title="Exit charting mode (Esc)"
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
              <Minimize2 className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      )}
      <div className="p-4 space-y-4">
      {/* ── ORAL CONDITIONS / TREATMENTS GIVEN (Sprint 154) ──────────
          Card, columns, chips, inline dates and the Others expander are
          the collaborator's, from `majorUpdates`, and it opens the tab
          because that is where she put it: a screening records the mouth
          before it reaches for a tooth code.

          ⚠ DELIBERATELY OUTSIDE the blue palette card, which is gated on
          `editingChart` (dentist only, because teeth are). Folding these
          in would silently take the oral-condition boxes away from the
          dental aide, who has always been able to edit them. Conditions
          follow `editingHistory` (dentist + aide); services follow
          `editingChart`.

          Her storage is the one thing not copied: she added these to
          DENTAL_CHART, ours live on ORAL_HEALTH_CONDITION and on the RPC
          visit's PREVENTIVE_CARE_RECORD (Sprint 147), which is what the
          Target Client List and the DOH return read. */}
      <div className="bg-card rounded-xl border border-border p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={editingHistory ? '' : 'opacity-60 pointer-events-none select-none'}>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="text-sm font-bold text-primary uppercase tracking-wide">Oral Conditions</div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Date examined
              <input type="date" value={draftChartDate} disabled={!currentYearData?.dentalChart}
                onChange={(e) => setDraftChartDate(e.target.value)}
                title={currentYearData?.dentalChart ? undefined : 'No charting recorded for this school year yet'}
                className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-ring" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2">
            {oralConditionChips.map(({ label, field }) => (
              <label key={field}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${draftOral[field] ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-blue-200 text-foreground hover:bg-canvas'}`}>
                <input type="checkbox" checked={!!draftOral[field]}
                  onChange={(e) => setDraftOral((prev) => ({ ...prev, [field]: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary" />
                {label}
              </label>
            ))}
            <button type="button" onClick={() => setOthersOralOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition-colors ${othersOralOpen || draftOral.others ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-blue-200 text-foreground hover:bg-canvas'}`}>
              <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${othersOralOpen || draftOral.others ? 'bg-primary border-primary' : 'border-gray-600'}`}>
                {(othersOralOpen || draftOral.others) && <Check className="w-3 h-3 text-white" />}
              </span>
              Others
            </button>
          </div>
          {othersOralOpen && (
            <div className="mt-3 rounded-lg bg-canvas p-3">
              <label className="block text-xs font-bold text-foreground mb-1">Specify Other</label>
              <input type="text" value={draftOral.others}
                onChange={(e) => setDraftOral((prev) => ({ ...prev, others: e.target.value }))}
                placeholder="Specify other oral condition…"
                className="w-full text-xs border border-border rounded px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          )}
        </div>

        <div className={`border-t border-border pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:border-border lg:pl-4 ${editingChart && linkedVisitForCard ? '' : 'opacity-60 pointer-events-none select-none'}`}>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="text-sm font-bold text-primary uppercase tracking-wide">Treatments Given</div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Date treated
              <input type="date" value={draftVisitDate} disabled={!linkedVisitForCard}
                onChange={(e) => setDraftVisitDate(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-card text-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-ring" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2">
            {serviceChips.map(({ label, field }) => (
              <label key={field}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${draftServices[field] ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-blue-200 text-foreground hover:bg-canvas'}`}>
                {/* Unticking writes null, not false — see the state above. */}
                <input type="checkbox" checked={draftServices[field] === true}
                  onChange={(e) => setDraftServices((prev) => ({ ...prev, [field]: e.target.checked ? true : null }))}
                  className="w-4 h-4 rounded accent-primary" />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ⚠ Said plainly on screen rather than left as a card that looks
          editable and saves nothing. A charting made from this screen is
          attached to no RPC visit, and the services belong to the visit. */}
      {!linkedVisitForCard && (
        <p className="text-xs text-muted-foreground -mt-2">
          Treatments Given is read-only here: this charting is not attached to an RPC visit, and a service is
          recorded against the visit. Record it under <strong>RPC Tracking → Record Visit</strong>.
        </p>
      )}


      {/* Sprint 148 — one row per charting recorded this school year.
          Hidden when there is only one: a picker with a single option is
          noise. The dentist screens and treats at the same visit, so each
          charting is that visit's findings AND treatments, read on its
          own — they are never merged. */}
      {currentYearData && currentYearData.charts.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Charting:</span>
          {currentYearData.charts.map((c, i) => {
            const isOn = currentYearData.dentalChart?._id === c._id;
            const teeth = currentYearData.toothRecordsByChart[c._id]?.length ?? 0;
            return (
              <button
                key={c._id}
                onClick={() => setSelectedChartId(c._id)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${isOn ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-gray-50'}`}
                title={`${teeth} tooth record${teeth === 1 ? '' : 's'}`}
              >
                {formatDate(c.date_charted)}
                {/* A charting made from Record Visit knows its visit; one
                    made here, or before Sprint 149, shows the date alone
                    rather than a guessed visit number. */}
                {currentYearData.visitNumberByChart[c._id] && (
                  <span className="ml-1 opacity-70">· Visit {currentYearData.visitNumberByChart[c._id]}</span>
                )}
                {i === currentYearData.charts.length - 1 && <span className="ml-1 opacity-70">· latest</span>}
              </button>
            );
          })}
          <span className="text-xs text-muted-foreground">
            {currentYearData.charts.length} chartings this school year
          </span>
        </div>
      )}

      {/* ⚠ Sprint 152 — the palette is HIDDEN in view mode rather than
          shown greyed out, adopted from the collaborator's layout. It was
          already `pointer-events-none` when not editing, so it occupied
          the top of the screen doing nothing while the summaries above
          are what a dentist actually reads. The words moved to Legend.
          It reappears, unchanged, the moment Edit Chart is pressed. */}
      {/* ── THE PALETTE (Sprint 156) ────────────────────────────────
          Her chairside layout: code-only pills, the words in the Legend,
          the rare codes collapsed, and each "Applying…" banner under the
          palette it came from rather than once at the foot of the card —
          picking a treatment on the right used to light a message on the
          far left. Clear All moved onto the heading row and disappears
          when there is nothing to clear; a permanently-visible disabled
          destructive button is noise on a blank chart. */}
      {/* ⚠ Sprint 163 REVERSES Sprint 152. I hid this whole card in view
          mode; hers shows it GREYED with the hint below, and hers is
          right for this screen — a dentist opening a record sees what can
          be charted and that they are not in edit mode yet, instead of a
          palette that only exists after a click they have no reason to
          expect. The `pointer-events-none` is what makes it honest. */}
      <div className={`bg-blue-50 rounded-xl p-4 ${!editingChart ? 'opacity-60 pointer-events-none select-none' : ''}`}>
        {!canEdit && <p className="text-xs text-muted-foreground mb-2 italic">View only — editing restricted to Dentist</p>}
        {canEdit && !editMode && <p className="text-xs text-muted-foreground mb-2 italic">View mode — click the pencil icon above to record conditions/treatments</p>}
        <div className={`grid grid-cols-1 ${iptrContext === 'default' ? 'lg:grid-cols-2' : ''} gap-4`}>
          {iptrContext !== 'treatment' && (
          <div className={iptrContext === 'default' ? 'lg:pr-4' : undefined}>
            <div className="flex items-center justify-between gap-2 mb-2 min-h-[26px]">
              <div className="text-sm font-bold text-primary uppercase tracking-wide">Condition Codes</div>
              {chartedConditionCount > 0 && (
                <button onClick={() => setConfirmClear('condition')}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground transition-all hover:border-red-400 hover:text-destructive">
                  <Trash2 className="h-3 w-3" /> Clear All ({chartedConditionCount})
                </button>
              )}
            </div>
            {/* "More" is the last item IN the same wrap row, so the rare
                four read as a continuation of the palette rather than as
                a separate control below it. */}
            <div className="flex flex-wrap items-center gap-1.5">
              {commonConditionCodes.map((c) => (
                <button key={c.code} title={c.label}
                  onClick={() => { setSelectedCondition(selectedCondition === c.code ? null : c.code); setSelectedTreatment(null); }}
                  className={`h-9 w-[60px] shrink-0 rounded-md border text-center transition-all flex items-center justify-center ${selectedCondition === c.code ? 'bg-teal-600 text-white ring-2 ring-teal-300 border-teal-600' : 'bg-card border-border text-foreground hover:border-teal-400'}`}>
                  <span className="text-xs font-bold font-mono leading-none">{c.perm}/{c.temp}</span>
                </button>
              ))}
              <button type="button" onClick={() => setRareConditionsOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                {rareConditionsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                More ({rareConditionCodes.length})
              </button>
            </div>
            {rareConditionsOpen && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rareConditionCodes.map((c) => (
                  <button key={c.code} title={c.label}
                    onClick={() => { setSelectedCondition(selectedCondition === c.code ? null : c.code); setSelectedTreatment(null); }}
                    className={`h-9 w-[60px] shrink-0 rounded-md border text-center transition-all flex items-center justify-center ${selectedCondition === c.code ? 'bg-teal-600 text-white ring-2 ring-teal-300 border-teal-600' : 'bg-card border-border text-foreground hover:border-teal-400'}`}>
                    <span className="text-xs font-bold font-mono leading-none">{c.perm}/{c.temp}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedCondition && (() => {
              const c = conditionCodes.find((x) => x.code === selectedCondition);
              return (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800">
                    Applying: {c?.perm}/{c?.temp} ({c?.label}). Click teeth to apply.
                  </span>
                  <button onClick={() => setSelectedCondition(null)} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
                </div>
              );
            })()}
          </div>
          )}
          {iptrContext !== 'dental-queue' && (
          // Conditions and treatments are different vocabularies -- one
          // records what IS, the other what was DONE -- but unselected
          // buttons in both groups look identical, so without a rule the
          // two grids read as one long palette. Divider only when both
          // are on screen: side by side from lg, stacked below it.
          <div className={iptrContext === 'default' ? 'border-t border-border pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-4' : undefined}>
            <div className="flex items-center justify-between gap-2 mb-2 min-h-[26px]">
              <div className="text-sm font-bold text-primary uppercase tracking-wide">Treatment Codes</div>
              {chartedTreatmentCount > 0 && (
                <button onClick={() => setConfirmClear('treatment')}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground transition-all hover:border-red-400 hover:text-destructive">
                  <Trash2 className="h-3 w-3" /> Clear All ({chartedTreatmentCount})
                </button>
              )}
            </div>
            {/* The treatments that happen TO A TOOTH lead. ⚠ The three
                whole-mouth services are behind "More", NOT removed as
                they are on her branch: they are recorded on the RPC visit
                now (Sprint 147), but the palette has always allowed them
                on a tooth and old chartings carry them. Dropping them
                would leave an existing FV on tooth 16 with no way to
                change or clear it. */}
            <div className="flex flex-wrap items-center gap-1.5">
              {perToothTreatmentCodes.map((t) => (
                <button key={t.code} title={treatmentLabel(t)}
                  onClick={() => { setSelectedTreatment(selectedTreatment === t.code ? null : t.code); setSelectedCondition(null); }}
                  className={`h-9 w-[60px] shrink-0 rounded-md border text-center transition-all flex items-center justify-center ${selectedTreatment === t.code ? 'bg-blue-600 text-white ring-2 ring-blue-300 border-blue-600' : 'bg-card border-border text-foreground hover:border-blue-400'}`}>
                  <span className="text-xs font-bold font-mono leading-none">{t.code}</span>
                </button>
              ))}
              <button type="button" onClick={() => setRareTreatmentsOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                {rareTreatmentsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                More ({wholeMouthTreatmentCodes.length})
              </button>
            </div>
            {rareTreatmentsOpen && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {wholeMouthTreatmentCodes.map((t) => (
                    <button key={t.code} title={treatmentLabel(t)}
                      onClick={() => { setSelectedTreatment(selectedTreatment === t.code ? null : t.code); setSelectedCondition(null); }}
                      className={`h-9 w-[60px] shrink-0 rounded-md border text-center transition-all flex items-center justify-center ${selectedTreatment === t.code ? 'bg-blue-600 text-white ring-2 ring-blue-300 border-blue-600' : 'bg-card border-border text-foreground hover:border-blue-400'}`}>
                      <span className="text-xs font-bold font-mono leading-none">{t.code}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  These describe the whole mouth. Record them under <strong>Treatments Given</strong> above, which is
                  what the DOH return counts; charting them on a tooth is kept for older records.
                </p>
              </div>
            )}
            {selectedTreatment && (() => {
              const t = treatmentCodes.find((x) => x.code === selectedTreatment);
              return (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                    Applying: {selectedTreatment} ({t?.label}). Click teeth to apply.
                  </span>
                  <button onClick={() => setSelectedTreatment(null)} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
                </div>
              );
            })()}
          </div>
          )}
        </div>
        {/* Without this the erase mode is folklore: the palette shows what
            you are applying, but nothing said what a bare click does when
            nothing is selected. */}
        {!selectedCondition && !selectedTreatment && (
          <div className="mt-3">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-foreground">
              No code selected · Click teeth to clear
            </span>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 overflow-x-auto">
        {/* Every row is 16 equal slots, so a primary tooth sits directly
            under the permanent tooth it will replace: 55↔15, 54↔14 …
            51↔11, 61↔21 … 65↔25 (FDI). The primary rows previously used
            `5 teeth + a w-9 midline spacer + 5 teeth`, centred — but the
            permanent row has no midline gap (11 and 21 are adjacent), so
            the spacer pushed both halves outward and nothing lined up.
            Three blank slots at each end replace it, and alignment now
            holds at any tooth size because both rows flex identically. */}
        <div className="min-w-[680px] space-y-2.5">
          {/* DOH IPTR form order: temporary arches on the outside (rows 1
              and 4), permanent arches on the inside (rows 2 and 3). */}
          <div className="flex justify-center gap-1">{padToArch(upperTemporary)}</div>
          <div className="flex justify-center gap-1">{upperPermanent.map(tooth)}</div>
          <div className="border-t-2 border-dashed border-border my-2" />
          <div className="flex justify-center gap-1">{lowerPermanent.map(tooth)}</div>
          <div className="flex justify-center gap-1">{padToArch(lowerTemporary)}</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl border border-border p-4">
        <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">DMFT / dmft Scores (Auto-computed)</div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-2">Primary teeth (dmft+x)</div>
            <div className="flex gap-2">
              {[['d', dmft.d], ['m', dmft.m], ['f', dmft.f], ['x', dmft.x], ['dmft', dmft.t]].map(([label, val]) => (
                <div key={label as string} className={`flex-1 border rounded text-center py-1.5 ${label === 'dmft' ? 'border-blue-400 bg-blue-50' : 'border-border'}`}>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-bold font-mono text-foreground">{val}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Permanent teeth (DMFT+X)</div>
            <div className="flex gap-2">
              {[['D', dmft.D], ['M', dmft.M], ['F', dmft.F], ['X', dmft.X], ['DMFT', dmft.T]].map(([label, val]) => (
                <div key={label as string} className={`flex-1 border rounded text-center py-1.5 ${label === 'DMFT' ? 'border-red-400 bg-red-50' : 'border-border'}`}>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-bold font-mono text-foreground">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ⚠ The Treatment Code Counter is GONE (Sprint 177). Hers has no
          such block, and it was showing the same numbers twice: the
          Treatment Summary below carries a Tooth Count column per code,
          with the tooth NUMBERS beside it, which is the counter plus the
          part a dentist actually needs. Two read-outs of one figure is a
          chance for them to disagree and nothing more. */}
      {/* ── SUMMARIES (Sprint 151, moved to the foot of the tab in 155) ──
          Her page order, and it is the right one: these are READ-OUTS.
          They are read after the mouth is charted, so they follow the
          teeth instead of standing between the header and them.

          ⚠ Two tables because there are two kinds of answer — the
          distinction is hers. A whole-mouth finding is answered "is it
          present?"; a per-tooth treatment is only meaningful WITH the
          teeth it was done to, which a count alone never says.

          Hidden in charting mode for the same reason: a read-out is not
          a charting surface. */}
      {!chartingMode && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-teal-50/70 rounded-xl border border-teal-200 p-4 space-y-4">
          <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Dental Condition Summary</div>

          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup><col className="w-[63%]" /><col className="w-[37%]" /></colgroup>
            <tbody>
              <tr>
                <td className="border-b border-teal-200/70 px-2 py-1.5 text-foreground">Date of Oral Examination</td>
                <td className="border-b border-teal-200/70 px-2 py-1.5 font-semibold text-teal-800">
                  {draftChartDate ? formatDate(draftChartDate) : ''}
                </td>
              </tr>
              {/* ⚠ BLANK ON PURPOSE, and it is her row, kept. "Orally Fit
                  Child" is a DOH IPTR field with a clinical definition —
                  caries-free or every caries treated, no debris, no gum
                  pathology — and the last of those is a judgement no
                  field of ours records. Deriving it from the teeth would
                  publish a clinical verdict the dentist never gave. The
                  row stays because a missing row is a different form; the
                  cell stays empty until there is something real in it. */}
              <tr>
                <td className="border-b border-teal-200/70 px-2 py-1.5 text-foreground">
                  Orally Fit Child
                  <span className="ml-1 text-muted-foreground">— not recorded</span>
                </td>
                <td className="border-b border-teal-200/70 px-2 py-1.5" />
              </tr>
              {presentOralConditions.map(({ label, present }) => (
                <tr key={label}>
                  <td className="border-b border-teal-200/70 px-2 py-1.5 text-foreground">{label}</td>
                  <td className="border-b border-teal-200/70 px-2 py-1.5 font-semibold text-teal-800">
                    {present ? 'Yes' : ''}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border-b border-teal-200/70 px-2 py-1.5 text-foreground">Others</td>
                <td className="border-b border-teal-200/70 px-2 py-1.5 text-foreground break-words">{draftOral.others}</td>
              </tr>
            </tbody>
          </table>

          {/* Section B of the paper IPTR, verbatim rows and order. Every
              figure is DERIVED from the teeth above — none of it is
              typed, so it cannot disagree with the odontogram. */}
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup><col className="w-[45%]" /><col className="w-[18%]" /><col className="w-[37%]" /></colgroup>
            <thead>
              <tr className="text-left text-teal-800">
                <th className="border-b border-teal-200/70 px-2 py-1.5 font-semibold">Indicate Number</th>
                <th className="border-b border-teal-200/70 px-2 py-1.5 font-semibold">Tooth Count</th>
                <th className="border-b border-teal-200/70 px-2 py-1.5 font-semibold">Tooth Numbers</th>
              </tr>
            </thead>
            <tbody>
              {indicateNumberRows.map(({ label, teeth }) => (
                <tr key={label}>
                  <td className="border-b border-teal-200/70 px-2 py-1.5 text-foreground">{label}</td>
                  <td className="border-b border-teal-200/70 px-2 py-1.5 font-semibold text-foreground">
                    {teeth.length ? teeth.length : ''}
                  </td>
                  <td className="border-b border-teal-200/70 px-2 py-1.5 font-mono text-foreground break-words">
                    {teeth.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-blue-50/70 rounded-xl border border-blue-200 p-4 space-y-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">Treatment Summary</div>

          {/* The whole-mouth services, as their OWN rows above the
              per-tooth table — her split, adopted in full this time.
              Sprint 151 refused these rows because hers read fields she
              had added to DENTAL_CHART; they read the RPC visit here, so
              there is still exactly one home for "was fluoride varnish
              given" and it is the one the DOH return counts. */}
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup><col className="w-[63%]" /><col className="w-[37%]" /></colgroup>
            <tbody>
              <tr>
                <td className="border-b border-blue-200/70 px-2 py-1.5 text-foreground">Date of Treatment</td>
                <td className="border-b border-blue-200/70 px-2 py-1.5 font-semibold text-primary">
                  {draftVisitDate ? formatDate(draftVisitDate) : ''}
                </td>
              </tr>
              {serviceChips.map(({ label, field }) => (
                <tr key={field}>
                  <td className="border-b border-blue-200/70 px-2 py-1.5 text-foreground">{label}</td>
                  {/* Blank for null AND for false: null is "not recorded"
                      and there is no tick for "withheld" on the paper
                      form either. Only a real Yes prints. */}
                  <td className="border-b border-blue-200/70 px-2 py-1.5 font-semibold text-primary">
                    {draftServices[field] === true ? 'Yes' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup><col className="w-[45%]" /><col className="w-[18%]" /><col className="w-[37%]" /></colgroup>
            <thead>
              <tr className="text-left text-primary">
                <th className="border-b border-blue-200/70 px-2 py-1.5 font-semibold">Treatment</th>
                <th className="border-b border-blue-200/70 px-2 py-1.5 font-semibold">Tooth Count</th>
                <th className="border-b border-blue-200/70 px-2 py-1.5 font-semibold">Tooth Numbers</th>
              </tr>
            </thead>
            <tbody>
              {perToothTreatmentRows.map((t) => {
                const teeth = treatmentTeeth[t.code] ?? [];
                return (
                  <tr key={t.code}>
                    <td className="border-b border-blue-200/70 px-2 py-1.5 text-foreground">
                      <span className="font-semibold mr-1">{t.code}</span>
                      {t.label}
                    </td>
                    <td className="border-b border-blue-200/70 px-2 py-1.5 font-semibold text-foreground">
                      {teeth.length ? teeth.length : ''}
                    </td>
                    <td className="border-b border-blue-200/70 px-2 py-1.5 font-mono text-foreground break-words">
                      {teeth.join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      </div>
    </div>
  );
}
