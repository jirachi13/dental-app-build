import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { X, Clipboard, Search, Droplet, ShieldCheck, Sparkles, Wrench, Timer, RotateCcw, Scissors, Syringe, MessageCircle, type LucideIcon } from 'lucide-react';
import { GradePill } from './GradePill';
import { GradeTableCell } from './GradeTableCell';
import { ListSearchInput } from './ListSearchInput';
import { getGradeColor } from '../utils/gradeColors';
import { getSchoolColor } from '../utils/schoolColors';
import { useStudents } from '../hooks/useStudents';
import { useTreatmentCategories } from '../hooks/useTreatmentCategories';
import { useAuth } from '../context/AuthContext';
import { treatmentCodes, treatmentLabel } from '../utils/dentalChartCodes';
import { SkeletonPageHeader, SkeletonTable } from './Skeleton';
import { activatable } from '../utils/a11y';
import { Pagination, usePagination } from './Pagination';

const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];

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

const getAgeGroup = (age: number) => {
  if (age <= 4) return '4 & below';
  if (age <= 9) return '5-9';
  if (age <= 14) return '10-14';
  if (age <= 19) return '15-19';
  return '20 & above';
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

export const TreatmentRecords = () => {
  const navigate = useNavigate();
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { selectedSchool } = useAuth();
  const kickerColor = getSchoolColor(selectedSchool || '');
  const { students: allStudents, loading: studentsLoading } = useStudents();
  // School-scoped like every other list page
  const allPatients = useMemo(
    () => (selectedSchool ? allStudents.filter((s) => s.school === selectedSchool) : allStudents),
    [allStudents, selectedSchool],
  );
  const { rows: categoryRows, loading: categoriesLoading } = useTreatmentCategories();
  const studentIdsByCode = useMemo(() => new Map(categoryRows.map((r) => [r.code, new Set(r.studentIds)])), [categoryRows]);

  const filtered = useMemo(() => allPatients.filter(t => {
    const age = calculateAge(t.birthdate);
    if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && t.section !== sectionFilter) return false;
    if (genderFilter !== 'all' && t.gender !== genderFilter) return false;
    if (ageGroupFilter !== 'all' && getAgeGroup(age) !== ageGroupFilter) return false;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const formattedName = t.name.toLowerCase();
      if (!formattedName.includes(query) && !t.grade.toLowerCase().includes(query) && !t.section.toLowerCase().includes(query)) return false;
    }
    return true;
  }), [allPatients, gradeFilter, sectionFilter, genderFilter, ageGroupFilter, searchTerm]);

  // Paged (Sprint 58): this list rendered EVERY filtered row, which is fine at
  // demo scale and thousands of DOM rows at ~8,000 students. Reset keys are the
  // filter inputs, never `filtered` — see Pagination.tsx.
  const pager = usePagination(filtered, [gradeFilter, sectionFilter, genderFilter, ageGroupFilter, searchTerm]);

  const hasActiveFilters = [gradeFilter, sectionFilter, genderFilter, ageGroupFilter].some(f => f !== 'all') || searchTerm !== '';
  const clearFilters = () => { setGradeFilter('all'); setSectionFilter('all'); setGenderFilter('all'); setAgeGroupFilter('all'); setSearchTerm(''); };

  const FS = ({ value, onChange, opts, label }: { value: string; onChange: (v: string) => void; opts: {v:string;l:string}[]; label: string }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="all">{label}</option>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

  if (studentsLoading) {
    return (
      <div className="space-y-4">
        <SkeletonPageHeader />
        <SkeletonTable rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Same header pattern as Dental Charts' own page title (user,
          2026-09-27, "i want the same but for Treatment submodule") -- icon
          badge sized/colored the same way (getSchoolColor, not a flat
          gray), same eyebrow/title/description type scale. */}
      <div className="flex items-center gap-4">
        <span style={{ backgroundColor: kickerColor.light }} className="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0">
          <Clipboard style={{ color: kickerColor.solid }} className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clinical Services</div>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">Treatment Records</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View treatment records and each student's recommended treatment.</p>
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
          cursor-pointer or focus outline, so it never reads as interactive.
          Typography/spacing matched to the user's RAMHIS "Department
          Overview" reference screenshot, then scaled everything inside (and
          the card itself) down ~30% per feedback (2026-09-27): w-8 h-8
          rounded-xl icon badge, mb-4 to the text stack, 22px extrabold
          count, p-4 card padding -- flat card (border only, no shadow).
          Label bumped +3px to 14px then back down 2px to 12px semibold, and
          the unit line shortened to
          just "student(s)" in 9px thin, dropping "this school year" (still
          true -- the count itself is year-scoped, see above -- just no
          longer spelled out on the card). Still one font family throughout
          (Inter Variable). */}
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

      {/* Container restyled to match the Charting Queue card (user,
          2026-09-27) -- icon badge, eyebrow with a count pill, title,
          description, search up top, one bordered card holding the whole
          list instead of a separate filter box above a separate table box. */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-clip">
        <div className="p-5 sm:p-6 border-b border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gray-100 grid place-items-center flex-shrink-0">
                <Clipboard className="w-4.5 h-4.5 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                {/* Same eyebrow/pill/title pattern as the Charting Queue card
                    (user, 2026-09-27, "i want the same but for treatment
                    queue") -- QUEUE eyebrow, school-tinted count pill,
                    bold title. Description stays truthful to what this list
                    actually is: the full roster sorted alphabetically, not
                    an ordered processing queue like Charting Queue's. */}
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Queue</div>
                  <span style={{ backgroundColor: kickerColor.light, color: kickerColor.solid }} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {filtered.length} {filtered.length === 1 ? 'STUDENT' : 'STUDENTS'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground mt-0.5">Treatment Queue</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedSchool ? `Students at ${selectedSchool}, with their latest recommended treatment.` : 'Students with their latest recommended treatment.'}
                </p>
              </div>
            </div>
            <ListSearchInput value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <FS value={gradeFilter} onChange={g => { setGradeFilter(g); setSectionFilter('all'); }} label="All Grades" opts={GRADES.map(g => ({ v: g, l: g }))} />
            <FS value={sectionFilter} onChange={setSectionFilter} label="All Sections" opts={[...new Set((gradeFilter !== 'all' ? allPatients.filter((r:any) => r.grade === gradeFilter) : allPatients).map((r:any) => r.section))].sort().map((s:any) => ({ v: s, l: s }))} />
            <FS value={genderFilter} onChange={setGenderFilter} label="All Genders" opts={[{ v:'Male', l:'Male' }, { v:'Female', l:'Female' }]} />
            <FS value={ageGroupFilter} onChange={setAgeGroupFilter} label="All Age Groups"
              opts={[{ v:'4 & below', l:'4 & below' }, { v:'5-9', l:'5-9' }, { v:'10-14', l:'10-14' }, { v:'15-19', l:'15-19' }, { v:'20 & above', l:'20 & above' }]} />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                <X className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>
        </div>

        <div className="overflow-auto">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 pt-20 pb-10 text-center text-sm text-muted-foreground">No students match the selected filters.</td>
                </tr>
              ) : pager.paged.map((t, i) => {
                const age = calculateAge(t.birthdate);
                const gc = getGradeColor(t.grade);
                return (
                  <tr key={t.id} {...activatable(() => navigate(`/dental-chart/${t.id}?tab=chart&context=treatment`))} className="cursor-pointer hover:bg-canvas">
                    <td className="px-4 py-2.5 text-muted-foreground">{pager.from + i}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <Pagination
              {...pager}
              onPage={pager.setPage}
              onPageSize={pager.changePageSize}
              noun="students"
              detail={selectedSchool ? `at ${selectedSchool}` : ''}
            />
          </div>
        )}
      </div>
    </div>
  );
};
