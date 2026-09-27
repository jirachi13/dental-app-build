import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { X, Clipboard, Search, Droplet, ShieldCheck, Sparkles, Wrench, Timer, RotateCcw, Scissors, Syringe, MessageCircle, type LucideIcon } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { GradeTableCell } from './GradeTableCell';
import { ListSearchInput } from './ListSearchInput';
import { studentListTableStyles } from './StudentListTableStyles';
import { useStudents } from '../hooks/useStudents';
import { useTreatmentCategories } from '../hooks/useTreatmentCategories';
import { useAuth } from '../context/AuthContext';
import { treatmentCodes, treatmentLabel } from '../utils/dentalChartCodes';
import { SkeletonPageHeader, SkeletonTable } from './Skeleton';
import { activatable } from '../utils/a11y';
import { Pagination, usePagination } from './Pagination';

const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];

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
  // Which category card is active -- null means "Full List" (every student
  // at this school), same meaning the old viewMode='full' had. Selecting a
  // category is now the ONLY way to narrow to it; clicking the active card
  // again clears back to Full List (user, 2026-09-27 redesign).
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { selectedSchool } = useAuth();
  const { students: allStudents, loading: studentsLoading } = useStudents();
  // School-scoped like every other list page
  const allPatients = useMemo(
    () => (selectedSchool ? allStudents.filter((s) => s.school === selectedSchool) : allStudents),
    [allStudents, selectedSchool],
  );
  const { rows: categoryRows, loading: categoriesLoading } = useTreatmentCategories();
  const studentIdsByCode = useMemo(() => new Map(categoryRows.map((r) => [r.code, new Set(r.studentIds)])), [categoryRows]);

  const sourcePatients = useMemo(
    () => (selectedCode ? allPatients.filter((p) => studentIdsByCode.get(selectedCode)?.has(p.id)) : allPatients),
    [selectedCode, studentIdsByCode, allPatients],
  );

  const filtered = useMemo(() => sourcePatients.filter(t => {
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
  }), [sourcePatients, gradeFilter, sectionFilter, genderFilter, ageGroupFilter, searchTerm]);

  // Paged (Sprint 58): this list rendered EVERY filtered row, which is fine at
  // demo scale and thousands of DOM rows at ~8,000 students. Reset keys are the
  // filter inputs, never `filtered` — see Pagination.tsx.
  const pager = usePagination(filtered, [selectedCode, gradeFilter, sectionFilter, genderFilter, ageGroupFilter, searchTerm]);

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

  const activeMeta = selectedCode ? CATEGORY_META[selectedCode] : null;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Clipboard}
        eyebrow="Clinical Care"
        title="Treatment Records"
        description="Pick a treatment category to see which students have actually been given it, or browse the full list below."
      />

      {/* Category cards (user, 2026-09-27 redesign): each one is a REAL count
          of students with that treatment on record -- ToothRecord.
          treatment_code for the 6 per-tooth codes, PreventiveCareRecord's
          booleans for the 4 whole-mouth ones (see /stats/treatment-
          categories). Never the free-text TREATMENT.treatment_done field,
          which can't be reliably bucketed into a code. */}
      {/* Sized ~30% down from the first pass (user, 2026-09-27) -- padding,
          badge, icon and all three text sizes scaled together so the card
          stays proportional, not just shrunk in one dimension. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {treatmentCodes.map((t) => {
          const meta = CATEGORY_META[t.code];
          const Icon = meta.icon;
          const count = categoriesLoading ? null : (studentIdsByCode.get(t.code)?.size ?? 0);
          const active = selectedCode === t.code;
          return (
            <div
              key={t.code}
              {...activatable(() => setSelectedCode(active ? null : t.code))}
              title={t.local ? treatmentLabel(t) : undefined}
              className={`flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 ${
                active ? 'border-primary/40 shadow-[0_10px_30px_rgba(15,23,42,0.08)]' : 'border-border'
              }`}
            >
              <span style={{ backgroundColor: meta.bg, color: meta.fg }} className="w-7 h-7 flex-shrink-0 rounded-lg grid place-items-center">
                <Icon className="w-3 h-3" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-foreground truncate">{meta.label}</div>
                <div className="text-xl leading-none font-extrabold text-foreground mt-1.5">{count === null ? '—' : count}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{count === 1 ? 'student' : 'students'}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gray-100 grid place-items-center flex-shrink-0">
              <Clipboard className="w-4.5 h-4.5 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground">{activeMeta ? activeMeta.label : 'Full List'}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeMeta
                  ? `${filtered.length} student${filtered.length !== 1 ? 's' : ''} with ${activeMeta.label} on record.`
                  : `${filtered.length} student${filtered.length !== 1 ? 's' : ''} at this school.`}
              </p>
            </div>
          </div>
          {selectedCode && (
            <button onClick={() => setSelectedCode(null)} className="flex items-center gap-1 px-3 py-2 text-sm text-primary border border-primary/20 rounded-lg hover:bg-primary-surface">
              <X className="w-3 h-3" /> Clear category
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ListSearchInput value={searchTerm} onChange={setSearchTerm} />
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
      <div className={studentListTableStyles.wrapper}>
        <div className={studentListTableStyles.scroller}>
          <table className={studentListTableStyles.table}>
            <thead className={studentListTableStyles.head}>
              <tr>
                <th className={studentListTableStyles.headerCell}>Student</th>
                <th className={studentListTableStyles.headerCell}>Grade</th>
                <th className={studentListTableStyles.headerCell}>Section</th>
                <th className={studentListTableStyles.headerCell}>Gender</th>
                <th className={studentListTableStyles.headerCell}>Age</th>
              </tr>
            </thead>
            <tbody className={studentListTableStyles.body}>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className={studentListTableStyles.emptyCell}>{selectedCode && !hasActiveFilters ? `No students with ${activeMeta?.label} on record at this school yet.` : 'No students match the selected filters.'}</td></tr>
              ) : pager.paged.map(t => {
                const age = calculateAge(t.birthdate);
                return (
                  <tr key={t.id} {...activatable(() => navigate(`/dental-chart/${t.id}?tab=chart&context=treatment`))} className={studentListTableStyles.row}>
                    <td className={studentListTableStyles.primaryCell}>{t.name}</td>
                    <GradeTableCell grade={t.grade} />
                    <td className={studentListTableStyles.secondaryCell}>{t.section}</td>
                    <td className={studentListTableStyles.secondaryCell}>{t.gender}</td>
                    <td className={studentListTableStyles.secondaryCell}>{age}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className={studentListTableStyles.footer}>
            <Pagination
              {...pager}
              onPage={pager.setPage}
              onPageSize={pager.changePageSize}
              noun="students"
              detail={[
                filtered.length !== sourcePatients.length ? `(filtered from ${sourcePatients.length})` : '',
                selectedSchool ? `at ${selectedSchool}` : '',
              ].filter(Boolean).join(' ')}
            />
          </div>
        )}
      </div>
    </div>
  );
};
