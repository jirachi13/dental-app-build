import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router';
import { Clipboard, Search, Droplet, ShieldCheck, Sparkles, Wrench, Timer, RotateCcw, Scissors, Syringe, MessageCircle, Eye, SlidersHorizontal, ChevronDown, ChevronUp, MoreVertical, type LucideIcon } from 'lucide-react';
import { GradePill } from './GradePill';
import { ListSearchInput } from './ListSearchInput';
import { ConfirmDialog } from './ConfirmDialog';
import { getGradeColor } from '../utils/gradeColors';
import { getSchoolColor } from '../utils/schoolColors';
import { useStudents } from '../hooks/useStudents';
import { useTreatmentCategories } from '../hooks/useTreatmentCategories';
import { useAuth } from '../context/AuthContext';
import { treatmentCodes, treatmentLabel } from '../utils/dentalChartCodes';
import { schoolYearLabel } from '../utils/schoolYear';
import { getTreatmentQueueStudentIds, setTreatmentQueueStudentIds } from '../utils/treatmentQueueStorage';
import { SkeletonPageHeader, SkeletonTable } from './Skeleton';
import { activatable } from '../utils/a11y';
import { Pagination, usePagination } from './Pagination';

/** Two-letter initials for the row avatar -- same derivation Dental Charts'
 *  own queue table uses, so a pupil is recognised by the same mark on both
 *  screens rather than two near-misses. */
const initials = (name: string) =>
  name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const calculateAge = (birthdate: string) => {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// Icon + tint per treatment code (user, 2026-09-27, design review "Style 1"
// -- real lucide icons, colored badge per card, matching the stat-card
// pattern already on Dental Charts). "OEX" renders as "Oral Examination"
// here (user correction), not its full treatmentCodes label "Oral Exam /
// Checkup" -- the vocabulary itself is unchanged, only this page's display.
const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; bg: string; fg: string }> = {
  OEX: { label: 'Oral Examination', icon: Search, bg: '#E8ECF6', fg: '#273A78' },
  FV: { label: 'Fluoride Varnish', icon: Droplet, bg: '#ECFDF5', fg: '#059669' },
  PFS: { label: 'Pit & Fissure Sealant', icon: ShieldCheck, bg: '#FEF3E2', fg: '#C2760C' },
  OP: { label: 'Oral Prophylaxis', icon: Sparkles, bg: '#F0F9FF', fg: '#0369A1' },
  PF: { label: 'Permanent Filling', icon: Wrench, bg: '#FDF2F8', fg: '#BE185D' },
  TF: { label: 'Temporary Filling', icon: Timer, bg: '#F5F3FF', fg: '#7C3AED' },
  TR: { label: 'Tooth Restoration', icon: RotateCcw, bg: '#FFF7ED', fg: '#C2410C' },
  X: { label: 'Extraction', icon: Scissors, bg: '#FEF2F2', fg: '#DC2626' },
  SDF: { label: 'Silver Diamine Fluoride', icon: Syringe, bg: '#ECFEFF', fg: '#0E7490' },
  CONS: { label: 'Consultation', icon: MessageCircle, bg: '#F3F4F6', fg: '#4B5563' },
};

type PipelineFilter = 'all' | 'For First Treatment' | 'For Second Treatment';
const PIPELINE_FILTER_OPTS: { v: PipelineFilter; l: string }[] = [
  { v: 'all', l: 'All' },
  { v: 'For First Treatment', l: 'For First Treatment' },
  { v: 'For Second Treatment', l: 'For Second Treatment' },
];

export const TreatmentRecords = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const [clearQueueConfirmOpen, setClearQueueConfirmOpen] = useState(false);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!filterMenuRef.current?.contains(e.target as Node)) setFilterMenuOpen(false);
      if (!bulkMenuRef.current?.contains(e.target as Node)) setBulkMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const { selectedSchool } = useAuth();
  const kickerColor = getSchoolColor(selectedSchool || '');
  const { students: allStudents, loading: studentsLoading } = useStudents();
  // School-scoped like every other list page
  const allPatients = useMemo(
    () => (selectedSchool ? allStudents.filter((s) => s.school === selectedSchool) : allStudents),
    [allStudents, selectedSchool],
  );
  // TEMPORARY validation control (user, 2026-09-27, "for now make it a
  // filter so i can validate if its showing the right numbers") -- defaults
  // to the current school year; picking another year re-queries the same
  // aggregation for that year so the count can be checked against it.
  const [yearFilter, setYearFilter] = useState<string>(schoolYearLabel());
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!yearMenuRef.current?.contains(e.target as Node)) setYearMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const { rows: categoryRows, schoolYearOptions, loading: categoriesLoading } = useTreatmentCategories(yearFilter);
  const studentIdsByCode = useMemo(() => new Map(categoryRows.map((r) => [r.code, new Set(r.studentIds)])), [categoryRows]);
  // Every student with at least one real treatment record for the selected
  // year -- the union of the category cards' own sets, so "Done" can never
  // disagree with what the cards above are counting.
  const doneIds = useMemo(() => {
    const ids = new Set<string>();
    for (const set of studentIdsByCode.values()) for (const id of set) ids.add(id);
    return ids;
  }, [studentIdsByCode]);

  // Auto-queued from a dental chart save -- see DentalChart.tsx's
  // handleSave, which adds a pupil here the moment their saved chart
  // carries a tooth condition/treatment or an oral health condition.
  const [treatmentQueueIds, setTreatmentQueueIdsState] = useState<string[]>(() => getTreatmentQueueStudentIds());
  const [viewTab, setViewTab] = useState<'queue' | 'done'>('queue');

  // Dequeues AUTOMATICALLY once real treatment data shows up (user,
  // 2026-09-28: "remove mark as done, it should be automatic") -- a queued
  // pupil who now appears in `doneIds` (a real ToothRecord/
  // PreventiveCareRecord for the SELECTED year) leaves the queue on its
  // own, no button required.
  useEffect(() => {
    setTreatmentQueueIdsState((prev) => {
      const next = prev.filter((id) => !doneIds.has(id));
      if (next.length === prev.length) return prev;
      setTreatmentQueueStudentIds(next);
      return next;
    });
  }, [doneIds]);

  const sourcePatients = useMemo(
    () => (viewTab === 'queue'
      ? allPatients.filter((p) => treatmentQueueIds.includes(p.id))
      : allPatients.filter((p) => doneIds.has(p.id))),
    [viewTab, allPatients, treatmentQueueIds, doneIds],
  );

  const filtered = useMemo(() => sourcePatients.filter(t => {
    if (pipelineFilter !== 'all' && t.pipelineStatus !== pipelineFilter) return false;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const formattedName = t.name.toLowerCase();
      if (!formattedName.includes(query) && !t.grade.toLowerCase().includes(query) && !t.section.toLowerCase().includes(query)) return false;
    }
    return true;
  }), [sourcePatients, pipelineFilter, searchTerm]);

  // Paged (Sprint 58): this list rendered EVERY filtered row, which is fine at
  // demo scale and thousands of DOM rows at ~8,000 students. Reset keys are the
  // filter inputs, never `filtered` — see Pagination.tsx.
  const pager = usePagination(filtered, [viewTab, pipelineFilter, searchTerm]);
  // Same "Hide" collapse as Student Records' own Items-per-page control
  // (user, 2026-09-28, "i want the same pagination set up for the
  // treatment module") -- rowsToRender swaps to every filtered row with no
  // paging once hidden, since the rows box here already scrolls internally.
  const [hidePagination, setHidePagination] = useState(false);
  const rowsToRender = hidePagination ? filtered : pager.paged;
  const rowIndexBase = hidePagination ? 1 : pager.from;

  const clearQueue = () => {
    setTreatmentQueueStudentIds([]);
    setTreatmentQueueIdsState([]);
    setClearQueueConfirmOpen(false);
  };

  // Adaptive, PINNED queue card -- same pattern as the Charting Queue card
  // (DentalChartNav.tsx) so this list behaves identically (user, 2026-09-28:
  // "when i scroll, it should stop at the treatment queue container and
  // should be fix in the page then the scrollable part should start at the
  // first list of queue"). The whole page becomes its own bounded,
  // internally-scrolling region; the queue card sticks to that region's top
  // once reached, and only the rows box inside it keeps scrolling.
  const regionRef = useRef<HTMLDivElement | null>(null);
  const rowsBoxRef = useRef<HTMLDivElement | null>(null);
  const [regionHeight, setRegionHeight] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!regionRef.current) return;
      const top = regionRef.current.getBoundingClientRect().top;
      setRegionHeight(Math.max(window.innerHeight - top, 200));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [studentsLoading]);

  useLayoutEffect(() => {
    if (regionHeight == null) return;
    const overflow = document.documentElement.scrollHeight - window.innerHeight;
    if (overflow > 0) {
      setRegionHeight((h) => (h == null ? h : Math.max(h - overflow, 200)));
    }
  }, [regionHeight]);

  if (studentsLoading) {
    return (
      <div className="space-y-4">
        <SkeletonPageHeader />
        <SkeletonTable rows={8} />
      </div>
    );
  }

  return (
    <div ref={regionRef} className="space-y-4 overflow-y-auto no-scrollbar -mb-4 md:-mb-8" style={{ height: regionHeight ?? undefined }}>
      {/* Same header pattern as Dental Charts' own page title (user,
          2026-09-27, "i want the same but for Treatment submodule") -- icon
          badge sized/colored the same way (getSchoolColor, not a flat
          gray), same eyebrow/title/description type scale. */}
      <div className="flex items-center gap-4">
        <span style={{ backgroundColor: kickerColor.light }} className="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0">
          <Clipboard style={{ color: kickerColor.solid }} className="w-6 h-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clinical Services</div>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">Treatment Records</h1>
          {/* School-year picker on the same row as the description (user,
              2026-09-28), shrunk. Design "B" -- a single pill, no icons,
              opens a dropdown of the other years on click. TEMPORARY per
              the user ("for now make it a filter so i can validate if its
              showing the right numbers") -- once the current-year count is
              confirmed correct, the plan is to remove this and always show
              the current year with no picker. */}
          <div className="flex items-center justify-between gap-3 mt-0.5">
            <p className="text-sm text-muted-foreground">View treatment records and each student's recommended treatment.</p>
            <div ref={yearMenuRef} className="relative flex-shrink-0">
              <button
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={yearMenuOpen}
                onClick={() => setYearMenuOpen((o) => !o)}
                className="rounded-full bg-primary-surface px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary-surface/80"
              >
                {yearFilter}
              </button>
              {yearMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 min-w-[140px] rounded-lg border border-border bg-card shadow-md py-1">
                  {schoolYearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => { setYearFilter(y); setYearMenuOpen(false); }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-canvas ${
                        y === yearFilter ? 'font-semibold text-primary' : 'text-foreground'
                      }`}
                    >
                      {y}
                      {y === schoolYearLabel() && <span className="text-[10px] font-bold text-green-600">Current</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category cards (user, 2026-09-27 redesign): each one is a REAL count
          of students given that treatment DURING THE CURRENT SCHOOL YEAR --
          ToothRecord.treatment_code for the 6 per-tooth codes,
          PreventiveCareRecord's booleans for the 4 whole-mouth ones (see
          /stats/treatment-categories). Never the free-text TREATMENT.
          treatment_done field, which can't be reliably bucketed into a code.
          A count is PER STUDENT (headcount), not per tooth record -- a pupil
          with 4 sealants charted still counts once, same as one.
          NOT CLICKABLE (user, 2026-09-27 correction) -- these are read-only
          totals, not a filter into the list below. Hover lift/shadow ADDED
          BACK (user, 2026-09-27) purely as visual feedback -- no onClick,
          cursor-pointer or focus outline, so it never reads as interactive. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {treatmentCodes.map((t) => {
          const meta = CATEGORY_META[t.code];
          const Icon = meta.icon;
          const count = categoriesLoading ? null : (studentIdsByCode.get(t.code)?.size ?? 0);
          return (
            <div
              key={t.code}
              title={t.local ? treatmentLabel(t) : undefined}
              className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span style={{ backgroundColor: meta.bg, color: meta.fg }} className="w-8 h-8 flex-shrink-0 rounded-xl grid place-items-center mb-4">
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-foreground truncate">{meta.label}</div>
                <div className="text-[22px] leading-none font-extrabold text-foreground mt-1">{count === null ? '—' : count}</div>
                <div className="text-[10px] font-thin text-muted-foreground mt-0.5">{count === 1 ? 'student' : 'students'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pinned Treatment Queue card -- same shape as the Charting Queue card
          (icon badge, eyebrow with a count pill, title, description, search
          + Filter + "⋮" up top), now also sticky/height-bound like it (user,
          2026-09-28). */}
      <div
        className="sticky top-0 z-30 flex flex-col bg-card rounded-t-2xl border border-border shadow-sm overflow-clip"
        style={{ height: regionHeight ?? undefined }}
      >
        {/* Dark green top accent bar. */}
        <div className="h-1.5 bg-[#0F9D74] flex-shrink-0" />
        <div className="p-5 sm:p-6 border-b border-border bg-card flex-shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gray-100 grid place-items-center flex-shrink-0">
                <Clipboard className="w-4.5 h-4.5 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                {/* Swaps to "Done Treatment" on the Done tab (user,
                    2026-09-28) rather than keeping "Treatment Queue" as the
                    title while showing already-treated pupils. */}
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{viewTab === 'queue' ? 'Queue' : 'Done'}</div>
                  <span style={{ backgroundColor: kickerColor.light, color: kickerColor.solid }} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {filtered.length} {filtered.length === 1 ? 'STUDENT' : 'STUDENTS'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground mt-0.5">{viewTab === 'queue' ? 'Treatment Queue' : 'Done Treatment'}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {viewTab === 'queue'
                    ? 'Students in queue order, ready for treatment.'
                    : `Students treated during SY ${yearFilter}.`}
                </p>
              </div>
            </div>
            {/* Search + Filter + "⋮" -- same layout as the Charting Queue
                card (user, 2026-09-28, "implement the same design with the
                treatment submodule"). Filter narrows by pipeline stage
                instead of grade/section/gender/age, which the removed
                dropdown row used to do. */}
            <div className="flex items-center gap-3 flex-wrap">
              <ListSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search student, grade, or section" />
              <div ref={filterMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  role="combobox"
                  aria-haspopup="listbox"
                  aria-expanded={filterMenuOpen}
                  onClick={() => setFilterMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 bg-primary text-white hover:bg-primary-hover"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filter <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {filterMenuOpen && (
                  <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-lg border border-border bg-card shadow-md py-1">
                    {PIPELINE_FILTER_OPTS.map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => { setPipelineFilter(o.v); setFilterMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-canvas ${pipelineFilter === o.v ? 'text-primary font-semibold' : 'text-foreground'}`}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* "⋮" -- clears the whole Treatment Queue at once, for a
                  pupil queued in error or otherwise handled outside the
                  normal (now automatic) done-detection. Only meaningful on
                  the Queue tab, since Done isn't manually managed. */}
              <div ref={bulkMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={bulkMenuOpen}
                  aria-label="Queue actions"
                  title="Queue actions"
                  disabled={viewTab !== 'queue' || treatmentQueueIds.length === 0}
                  onClick={() => setBulkMenuOpen((o) => !o)}
                  className={`flex items-center justify-center w-7 h-9 rounded-lg border border-border bg-card ${
                    viewTab !== 'queue' || treatmentQueueIds.length === 0 ? 'text-muted-foreground/40 cursor-not-allowed' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {bulkMenuOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-max rounded-lg border border-border bg-card shadow-md py-1">
                    <button
                      type="button"
                      onClick={() => { setClearQueueConfirmOpen(true); setBulkMenuOpen(false); }}
                      className="block px-3 py-2 text-sm font-medium text-destructive hover:bg-canvas"
                    >
                      Clear queue
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Queue / Done toggle -- "there would be filter in this module
              that are in queue for treatment and all students that were
              done treatment for the current school year". Queue is auto-
              populated by DentalChart.tsx's save AND auto-emptied once
              real treatment data appears; Done is the same real per-year
              aggregation the category cards above already use, so the two
              can never disagree. */}
          <div className="inline-flex rounded-lg bg-gray-100 p-1 mt-4">
            <button
              type="button"
              onClick={() => setViewTab('queue')}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${viewTab === 'queue' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              In Queue <span className="tabular-nums">({treatmentQueueIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab('done')}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${viewTab === 'done' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Done This School Year <span className="tabular-nums">({doneIds.size})</span>
            </button>
          </div>
        </div>

        <div ref={rowsBoxRef} className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Grade</th>
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Section</th>
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gender</th>
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Age</th>
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recommended Treatment</th>
                <th className="sticky top-0 z-10 text-left px-4 py-3 bg-gray-100 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 pt-20 pb-10 text-center text-sm text-muted-foreground">
                    {viewTab === 'queue'
                      ? 'No students in the treatment queue. Saving a dental chart with a condition or treatment code queues a student here.'
                      : `No students treated during SY ${yearFilter} yet.`}
                  </td>
                </tr>
              ) : rowsToRender.map((t, i) => {
                const age = calculateAge(t.birthdate);
                const gc = getGradeColor(t.grade);
                return (
                  <tr key={t.id} {...activatable(() => navigate(`/dental-chart/${t.id}?tab=chart&context=treatment`))} className="cursor-pointer hover:bg-canvas">
                    <td className="px-4 py-2.5 text-muted-foreground">{rowIndexBase + i}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <span style={{ backgroundColor: gc.light, color: gc.solid }} className="w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-bold">
                          {initials(t.name)}
                        </span>
                        <span className="truncate">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><GradePill grade={t.grade} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.section}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.gender}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{age}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate" title={t.recommendation || undefined}>
                      {t.recommendation || <span className="text-muted-foreground/50">Not yet assessed</span>}
                    </td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => navigate(`/dental-chart/${t.id}?tab=chart&context=treatment`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Eye className="w-3.5 h-3.5" /> Open chart
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* "Hide" collapses the footer to this thin reveal tab -- placed
              INSIDE the scrollable box, as the last row of its content, not
              pinned below it: it only comes into view once you've scrolled
              to the end of the list, same as any other row would. Same
              pattern as Student Records' own Items-per-page "Hide". */}
          {hidePagination && (
            <button
              type="button"
              onClick={() => setHidePagination(false)}
              title="Show pagination controls"
              className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-canvas hover:text-foreground"
            >
              <ChevronUp className="h-3 w-3" /> Show pagination controls
            </button>
          )}
        </div>
        {!hidePagination && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <Pagination
              {...pager}
              onPage={pager.setPage}
              onPageSize={pager.changePageSize}
              onHide={() => setHidePagination(true)}
              noun="students"
              detail={selectedSchool ? `at ${selectedSchool}` : ''}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={clearQueueConfirmOpen}
        title="Clear treatment queue?"
        message={`All ${treatmentQueueIds.length} student${treatmentQueueIds.length === 1 ? '' : 's'} will be removed from the queue. This does not affect their student record or dental chart, and does not mark them as treated.`}
        confirmLabel="Clear queue"
        tone="danger"
        onConfirm={clearQueue}
        onCancel={() => setClearQueueConfirmOpen(false)}
      />
    </div>
  );
};
