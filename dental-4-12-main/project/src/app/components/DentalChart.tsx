import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Shield, Users, FileText, Plus, Pencil, Trash2, Download, X, Maximize2, Check, ChevronUp, ChevronDown, ShieldCheck, ShieldAlert, Shield as ShieldIcon, MoreVertical } from 'lucide-react';
import { exportPagesToPdf } from '../utils/exportPdf';
import { getGradeColor } from '../utils/gradeColors';
import { BMI_NOTE } from '../utils/bmi';
import { useAuth } from '../context/AuthContext';
import { GradePill } from './GradePill';
import { useToast } from './Toast';
import { useStudentNav } from '../hooks/useStudentNav';
import { validateStudentValues } from '../../../shared/studentValidation';
import { useAppointments } from '../hooks/useAppointments';
import { useDentalChartData } from '../hooks/useDentalChartData';
import { apiClient, ApiError } from '../api/client';
import { toLocalDateString, formatDate } from '../utils/localDate';
import { schoolYearLabel } from '../utils/schoolYear';
import { surnameFirst, surnameFirstWithInitial } from '../utils/studentName';
import { SkeletonPageHeader, SkeletonTable } from './Skeleton';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { useSchools } from '../hooks/useSchools';
import { SERVICES as CONSENT_SERVICES } from './ConsentForm';
import { IptrForm, IptrFormPage2 } from './IptrForm';
import { IptrFormV2 } from './IptrFormV2';
import { DmftHistoryTab } from './DmftHistoryTab';
import { AiRiskTab } from './AiRiskTab';
import { TreatmentHistoryTab } from './TreatmentHistoryTab';
import { ReferralsTab } from './ReferralsTab';
import { HistoryTab } from './HistoryTab';
import { DentalChartTab, type IptrContext } from './DentalChartTab';
import { emptyMed, emptyDiet, emptyOral, type MedicalHistoryDraft, type DietDraft, type OralDraft, type ServiceField } from './iptrDrafts';
import type { ReferralType } from '../api/types';
import {
  sectionBRows,
  teethByTreatment as teethByTreatmentCode,
  hasCaries,
  type ChartedTooth,
} from '../../../shared/iptrSectionB';
// The chart's vocabulary and arithmetic — moved out in Sprint 162, unchanged.
// Re-exported below for the four screens that import these from here.
import {
  temporaryTeeth,
  conditionColors,
  computeDMFT,
  WHOLE_MOUTH_TREATMENT_CODES,
  conditionCodes,
  treatmentCodes,
  treatmentLabel,
  type ChartEntry,
} from '../utils/dentalChartCodes';

// REFERRAL_TYPE_LABELS moved to ReferralsTab.tsx with the panel that owns it
// (Sprint 162c). ⚠ A second copy still lives in Reports.tsx and the two have
// DRIFTED — see BUG-14.

const ALL_SCHOOL_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030'];
const GRADES = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];

// The draft shapes and their empty factories moved to `iptrDrafts.ts` in
// Sprint 162c — shared by this host, the History tab and the Dental Chart tab.

const formatDateStamp = (dateString?: string | null) => formatDate(dateString, 'No date stamp');

// Charting mode survives the remount between students (Sprint 153).
//
// ⚠ MODULE SCOPE ON PURPOSE. routes.tsx keys this component by `:id`, so
// stepping to the next child UNMOUNTS and remounts it — any useState would
// reset to false and drop the dentist out of full screen on every single
// student, which is the one thing the mode exists to avoid. It is session
// state, not record state, so it belongs neither in the URL nor in the DB.
let chartingModeMemo = false;

// Whether the patient card is expanded, also across the remount (Sprint 166).
// ⚠ Same reason as `chartingModeMemo` above: routes.tsx keys this component by
// `:id`, so Next student remounts it and a useState would spring the card back
// open on every child. Collapsing it is a decision about how you want to WORK,
// not a fact about one pupil, so it should outlive the pupil.
let basicInfoExpandedMemo = true;

// ─── Main component ───────────────────────────────────────────────────────────
export const DentalChart = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { user, selectedSchool } = useAuth();
  const canEdit = user?.role === 'dentist';
  const canEditHistory = user?.role === 'dentist' || user?.role === 'dental_aide';
  const canEditInfo = canEditHistory;
  const staffNameLabel = user?.role === 'dental_aide' ? 'Dental Aide' : 'Dentist';

  // Was useStudents() — the whole roster via /stats/student-rows — used ONLY to
  // build the prev/next nav below (backlog #39). The slim endpoint returns the
  // three fields the nav reads instead of ~13 joined across six collections.
  const { entries: allStudents } = useStudentNav();
  // School list comes from the DB now, not a hardcoded array (Sprint 60).
  const { schoolNames } = useSchools();
  // Only the Consent tab's "upcoming appointments" list reads this, and it
  // filters to `date >= today`, so nothing before today is worth loading
  // (Sprint 56). The forward bound is a year out — generous for any real
  // scheduling horizon, and a bound rather than none.
  const upcomingWindow = useMemo(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      to: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 23, 59, 59, 999),
    };
  }, []);
  const { sessions: appointmentSessions } = useAppointments(upcomingWindow);
  const { student, schoolName, years, dentists, loading, error, reload } = useDentalChartData(id);
  const currentDentist = dentists.find((d) => d.user_id === user?.id);

  // Real patient nav (school-scoped like every list page, sorted by name for a stable, predictable order)
  const navList = useMemo(
    () => (selectedSchool ? allStudents.filter((s) => s.school === selectedSchool) : [...allStudents]).sort((a, b) => a.name.localeCompare(b.name)),
    [allStudents, selectedSchool],
  );
  const navIndex = navList.findIndex((s) => s.id === id);
  const prevPatient = navIndex > 0 ? navList[navIndex - 1] : null;
  const nextPatient = navIndex >= 0 && navIndex < navList.length - 1 ? navList[navIndex + 1] : null;

  // ⚠ 'appointments' (the Consent tab) is gone as of Sprint 171 — six tabs,
  // hers. Consent lives on the History banner, which is where she put it.
  type TabKey = 'history' | 'chart' | 'records' | 'treatments' | 'referrals' | 'ai';
  const iptrContext = (searchParams.get('context') as IptrContext) || 'default';
  const [chartingMode, setChartingModeState] = useState(chartingModeMemo);
  const setChartingMode = (on: boolean) => { chartingModeMemo = on; setChartingModeState(on); };
  // An explicit ?tab= still wins — a deep link says where to land. Otherwise a
  // remount inside charting mode has to come back to the CHART tab, or the
  // dentist arrives at the next child on History with the mode still on.
  const initialTab = (searchParams.get('tab') as TabKey) || (chartingModeMemo ? 'chart' : 'history');
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  // Her labels and her order (Sprint 162). "Caries Risk Assessment" says what
  // the tab actually holds where "Risk Classification" only named the output,
  // and it moves up because a dentist reads risk before treatment history.
  //
  // ⚠ CONSENT IS OURS AND STAYS. Her branch has no Consent tab at all — six
  // tabs to our seven — but the tab holds the signed Pahintulot and the consent
  // status, which is a real screen with real data behind it. Adopting a tab
  // ORDER is not a reason to delete a feature, so it keeps the slot it had.
  const allTabs: { key: TabKey; label: string }[] = [
    { key: 'history', label: 'History' },
    { key: 'chart', label: 'Dental Chart' },
    { key: 'ai', label: 'Caries Risk Assessment' },
    { key: 'treatments', label: 'Treatment History' },
    { key: 'records', label: 'DMFT History' },
    { key: 'referrals', label: 'Referrals' },
  ];
  const visibleTabs = (
    iptrContext === 'dental-queue'
      ? allTabs.filter((tab) => tab.key === 'history' || tab.key === 'chart')
      : iptrContext === 'risk'
      ? allTabs.filter((tab) => tab.key === 'ai')
      : iptrContext === 'treatment'
      ? allTabs.filter((tab) => tab.key === 'chart' || tab.key === 'treatments')
      : allTabs
  );

  const [selectedYear, setSelectedYear] = useState(0);
  useEffect(() => {
    // Default to the most recent school year once data loads.
    if (years.length > 0) setSelectedYear(years.length - 1);
  }, [years.length, id]);

  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<'condition' | 'treatment' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // View-by-default (like the Patient Info card): clinical fields are a read
  // view until the dentist explicitly enters edit mode — a stray click can no
  // longer flip a medical flag. A brand-new/empty year auto-enters edit mode.
  const [editMode, setEditMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const [draftInfo, setDraftInfo] = useState<Partial<typeof student>>({});
  // Height and weight live on the SELECTED YEAR's IPTR, not on STUDENT, so they
  // are drafted separately even though they share the one Edit button — the
  // save below writes to both records (Sprint 68).
  const [draftYear, setDraftYear] = useState<{ height_cm: string; weight_kg: string; grade_level: string; section: string }>({ height_cm: '', weight_kg: '', grade_level: '', section: '' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  // ⚠ The menu is rendered FIXED, positioned from the button, because the year
  // strip is `overflow-x-auto` — and once overflow applies on one axis the
  // browser clips the other too. An absolutely positioned dropdown opened
  // inside it rendered at full size and was cut off by the strip, which looked
  // exactly like the button doing nothing.
  const yearMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const [yearMenuAt, setYearMenuAt] = useState<{ top: number; right: number } | null>(null);
  const openYearMenu = () => {
    const r = yearMenuBtnRef.current?.getBoundingClientRect();
    if (r) setYearMenuAt({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
    setYearMenuOpen((v) => !v);
  };
  const headerRowRef = useRef<HTMLDivElement | null>(null);
  // Wraps the record body for the PDF export, excluding the sticky toolbar —
  // a downloaded patient record should not carry Edit/Save buttons.
  const recordRef = useRef<HTMLDivElement | null>(null);
  // The off-screen DOH form captured by the IPTR PDF button (Sprint 135).
  const iptrFormRef = useRef<HTMLDivElement | null>(null);
  const iptrFormPage2Ref = useRef<HTMLDivElement | null>(null);
  const iptrFormV2Ref = useRef<HTMLDivElement | null>(null);
  // Sprint 148 — WHICH charting of the year is being viewed. Null means "the
  // latest", which is what the hook already hands over.
  //
  // ⚠ Until now the screen rendered the OLDEST charting of the year and hid
  // every later one: 22 of 26 IPTRs on dev have two or more, and a pupil with
  // three showed 3 of their 4 tooth records. A dentist looking at August's
  // findings while January's existed is reading a stale mouth.
  // `?chart=<id>` lands directly on one charting — Record Visit's "chart now"
  // navigates here with the charting it just created (Sprint 149).
  // Sprint 152 — the code palette's WORDS live here now, adopted from the
  // collaborator's design. Her reasoning: the odontogram needs the codes, not
  // the glossary, and a chairside screen has no room for both.
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(
    searchParams.get('chart'),
  );
  // ⚠ NO RESET EFFECT HERE, and that is the point. Two attempts failed: an
  // effect keyed on `selectedYear` fires on mount AND again when the year
  // index resolves once the data loads, and both runs wiped the `?chart=`
  // deep link that Record Visit's "chart now" navigates with — the charting
  // was created and listed, and the screen still opened on a different one.
  //
  // A stale id needs no clearing: the lookup below falls back to the latest
  // charting when the id is not in the year on display, so an id from another
  // year is simply ignored. Both breakages typechecked and built cleanly.
  const [pdfBusy, setPdfBusy] = useState(false);
  const tabsRowRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffsets, setStickyOffsets] = useState({ tabsTop: 0, yearTop: 0 });

  const currentYearDataRaw = years[selectedYear];
  // The hook defaults to the latest charting; this swaps in whichever one the
  // dentist picked, with its own tooth records.
  //
  // ⚠ useMemo IS LOAD-BEARING, not a micro-optimisation (Sprint 154). The
  // spread built a NEW OBJECT on every render, and the draft-sync effect below
  // lists `currentYearData` in its deps — so picking a charting, or arriving on
  // a `?chart=` deep link, put the screen in an INFINITE RENDER LOOP: effect →
  // setDraftChart(new object) → render → new currentYearData → effect. Measured
  // at 6,656 DOM mutations in 2 seconds on an idle page. Because that effect
  // ends in `setEditMode(...)`, Edit Chart could never stay on either: every
  // charting reached through the picker was silently read-only.
  //
  // It typechecked, it built, and the page LOOKED right — the loop is invisible
  // until you count renders or try to edit.
  const currentYearData = useMemo(
    () => (currentYearDataRaw && selectedChartId
      ? {
          ...currentYearDataRaw,
          dentalChart: currentYearDataRaw.charts.find((c) => c._id === selectedChartId) ?? currentYearDataRaw.dentalChart,
          toothRecords: currentYearDataRaw.toothRecordsByChart[selectedChartId] ?? currentYearDataRaw.toothRecords,
        }
      : currentYearDataRaw),
    [currentYearDataRaw, selectedChartId],
  );

  // Draft (editable) copies of the current year's real data -- initialized
  // from real records when the selected year changes, persisted for real on
  // Save. This mirrors the app's existing form pattern (local draft state,
  // explicit save), just backed by real data instead of fake arrays.
  const [draftChart, setDraftChart] = useState<Record<number, ChartEntry>>({});
  const [draftMed, setDraftMed] = useState<MedicalHistoryDraft>(emptyMed());
  const [draftDiet, setDraftDiet] = useState<DietDraft>(emptyDiet());
  const [draftOral, setDraftOral] = useState<OralDraft>(emptyOral());
  // Services given at the visit this charting belongs to (Sprint 154).
  // ⚠ null, not false. PREVENTIVE_CARE_RECORD defaults every service to null
  // and its own comment says why: `false` claims on a form filed with the City
  // Health Office that a service was WITHHELD, where null reads "not
  // recorded". A checkbox is binary, so unticking writes null back — never
  // false. "Explicitly not done" has no tick on the paper form either.
  // Her Physical Measurements block owns these (Sprint 173). They used to be
  // typed inside the Edit Student Info panel and read back as three grey rows
  // on the patient card — two different places for one record. One editor now.
  const [draftMeasure, setDraftMeasure] = useState({ height_cm: '', weight_kg: '', temperature_c: '', blood_pressure: '' });
  const [draftServices, setDraftServices] = useState<Record<ServiceField, boolean | null>>({
    oral_screening: null, oral_prophylaxis: null, fluoride_varnish: null, oral_hygiene_instruction: null,
  });
  const [draftVisitDate, setDraftVisitDate] = useState('');
  const [draftChartDate, setDraftChartDate] = useState('');
  const [othersOralOpen, setOthersOralOpen] = useState(false);
  // Her card collapses (Sprint 164). Identity is checked once on arrival and
  // then only gets in the way of the tab below it.
  const [basicInfoExpanded, setBasicInfoExpandedState] = useState(basicInfoExpandedMemo);
  const setBasicInfoExpanded = (next: boolean | ((v: boolean) => boolean)) => {
    setBasicInfoExpandedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      basicInfoExpandedMemo = value;
      return value;
    });
  };
  // Consent is confirmed against the FORM, not against a bare "are you sure"
  // (Sprint 169, hers). `revert` distinguishes the two directions.
  const [confirmConsent, setConfirmConsent] = useState<{ schoolYear: string; revert: boolean } | null>(null);
  const [rareConditionsOpen, setRareConditionsOpen] = useState(false);
  const [rareTreatmentsOpen, setRareTreatmentsOpen] = useState(false);

  useEffect(() => {
    if (!currentYearData) {
      setDraftChart({});
      setDraftMed(emptyMed());
      setDraftDiet(emptyDiet());
      setDraftOral(emptyOral());
      setDraftMeasure({ height_cm: '', weight_kg: '', temperature_c: '', blood_pressure: '' });
      setDraftServices({ oral_screening: null, oral_prophylaxis: null, fluoride_varnish: null, oral_hygiene_instruction: null });
      setDraftVisitDate('');
      setDraftChartDate('');
      setEditMode(false);
      return;
    }
    const chart: Record<number, ChartEntry> = {};
    for (const tr of currentYearData.toothRecords) {
      chart[tr.tooth_number] = { condition: tr.condition, treatment: tr.treatment_code ?? '' };
    }
    setDraftChart(chart);

    const mh = currentYearData.medicalHistory;
    setDraftMed(mh ? {
      allergies: mh.allergies, hypertension: mh.hypertension, diabetes: mh.diabetes_mellitus,
      bloodDisorders: false, cardiovascular: mh.cardiovascular_disease, thyroid: mh.thyroid_disorders,
      hepatitis: mh.hepatitis_disorders, malignancy: mh.malignancy, hospitalization: mh.previous_hospitalization,
      bloodTransfusion: mh.blood_transfusion, tattoo: mh.tattoo, others: mh.others,
    } : emptyMed());

    const dh = currentYearData.dietaryHabits;
    setDraftDiet(dh ? {
      sugarSweetened: dh.sugar_beverages, alcoholDrinker: dh.alcohol_drinker, tobaccoUser: dh.tobacco_user,
      betelNut: dh.betel_nut_chewer, bodyPiercing: dh.body_piercing, nailBiting: dh.nail_biting, thumbsucking: dh.thumb_sucking,
    } : emptyDiet());

    // The dates and services follow the SELECTED charting, not the year: a
    // pupil charted twice has two visits, and showing the first visit's
    // services beside the second's teeth would be a quiet lie.
    const selectedChartRec = currentYearData.dentalChart;
    const visit = selectedChartRec ? currentYearData.preventiveByChart[selectedChartRec._id] : undefined;
    setDraftChartDate(selectedChartRec ? new Date(selectedChartRec.date_charted).toISOString().slice(0, 10) : '');
    setDraftVisitDate(visit ? new Date(visit.visit_date).toISOString().slice(0, 10) : '');
    setDraftMeasure({
      height_cm: currentYearData.iptr.height_cm != null ? String(currentYearData.iptr.height_cm) : '',
      weight_kg: currentYearData.iptr.weight_kg != null ? String(currentYearData.iptr.weight_kg) : '',
      temperature_c: currentYearData.iptr.temperature_c != null ? String(currentYearData.iptr.temperature_c) : '',
      blood_pressure: currentYearData.iptr.blood_pressure ?? '',
    });
    setDraftServices({
      oral_screening: visit?.oral_screening ?? null,
      oral_prophylaxis: visit?.oral_prophylaxis ?? null,
      fluoride_varnish: visit?.fluoride_varnish ?? null,
      oral_hygiene_instruction: visit?.oral_hygiene_instruction ?? null,
    });

    const oc = currentYearData.oralCondition;
    setDraftOral(oc ? {
      gingivitis: oc.gingivitis, periodontal: oc.periodontal_disease, debris: oc.debris, calculus: oc.calculus,
      abnormalGrowth: oc.abnormal_growth, cleftLipPalate: oc.cleft_lip_palate, oralHygiene: oc.oral_hygiene, others: oc.others,
    } : emptyOral());

    // Empty year (nothing recorded yet) exists to be filled — drop clinical
    // staff straight into edit mode; anything with data opens as a read view.
    setEditMode(
      (user?.role === 'dentist' || user?.role === 'dental_aide') &&
      !currentYearData.medicalHistory && !currentYearData.oralCondition &&
      currentYearData.toothRecords.length === 0,
    );
  }, [selectedYear, currentYearData, user?.role]);

  // Effective edit rights: role AND edit mode. Aides keep read-only here —
  // they could tick history boxes before, but Save was always dentist-only,
  // so those edits silently went nowhere (dead UI, now honest).
  const editingChart = canEdit && editMode;
  const editingHistory = canEditHistory && editMode;

  const cancelEdit = async () => {
    setEditMode(false);
    await reload(); // refetch → draft-sync effect resets all drafts
  };

  // ── Charting mode (Sprint 153) ──────────────────────────────────────────
  // Adopted from the collaborator's `majorUpdates` branch: a full-screen
  // surface for the loop the dentist actually repeats at a school — chart a
  // mouth, save, next child — instead of charting inside a record page with a
  // nav rail, a status strip and six tabs around it.
  //
  // Escape leaves. A mode with no keyboard way out is a trap on a laptop.
  useEffect(() => {
    if (!chartingMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChartingMode(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chartingMode]);

  // Leaving the chart tab leaves the mode. Full screen over History would hide
  // the tab strip that got you there.
  useEffect(() => {
    if (activeTab !== 'chart' && chartingModeMemo) setChartingMode(false);
  }, [activeTab]);

  // ⚠ Stepping to another student while edit mode is on DISCARDS the draft —
  // nothing is written until Save Chart. That hole already existed on the
  // header's prev/next buttons; charting mode makes stepping the main loop, so
  // it is guarded here for both. Confirm-and-lose, never lose silently.
  const [pendingNav, setPendingNav] = useState<{ id: string; name: string } | null>(null);
  const goToStudent = (target: { id: string; name: string } | null) => {
    if (!target) return;
    if (editMode) { setPendingNav(target); return; }
    navigate(`/dental-chart/${target.id}`);
  };

  const currentChart = draftChart;

  // The RPC visit this charting is attached to, if any (Sprint 154). Absent for
  // every charting made before Sprint 149 and any made from this screen.
  const linkedVisitForCard = currentYearData?.dentalChart
    ? currentYearData.preventiveByChart[currentYearData.dentalChart._id]
    : undefined;

  // ── IPTR Section B + per-tooth treatment summary (Sprint 151) ───────────
  //
  // Design adopted from the collaborator's `majorUpdates` branch; the rows and
  // the two readings of the form are hers. The derivation lives in
  // `shared/iptrSectionB.ts` so this panel and the PRINTED Form 1 cannot
  // disagree about the same pupil — they now compute from one function.
  //
  // ⚠ Reads the odontogram being EDITED, so the numbers move as the dentist
  // charts. That is the point: a summary that only updated on save would be
  // wrong for as long as the chart was open.
  const chartedTeeth: ChartedTooth[] = useMemo(
    () => Object.entries(currentChart).map(([tooth, entry]) => ({
      tooth: Number(tooth),
      condition: entry.condition,
      treatment: entry.treatment,
    })),
    [currentChart],
  );
  const indicateNumberRows = useMemo(() => sectionBRows(chartedTeeth), [chartedTeeth]);
  const treatmentTeeth = useMemo(() => teethByTreatmentCode(chartedTeeth), [chartedTeeth]);
  const perToothTreatmentRows = useMemo(
    () => treatmentCodes.filter(
      (t) => !WHOLE_MOUTH_TREATMENT_CODES.includes(t.code) || (treatmentTeeth[t.code]?.length ?? 0) > 0,
    ),
    [treatmentTeeth],
  );

  // Whole-mouth findings. ⚠ Dental Caries is DERIVED from the teeth, never a
  // separate tick — caries is recorded tooth by tooth, and a second source for
  // one fact eventually disagrees with the first.
  const presentOralConditions = useMemo(() => [
    { label: 'Dental Caries', present: hasCaries(chartedTeeth) },
    { label: 'Gingivitis', present: draftOral.gingivitis },
    { label: 'Periodontal Disease', present: draftOral.periodontal },
    { label: 'Debris', present: draftOral.debris },
    { label: 'Calculus', present: draftOral.calculus },
    { label: 'Abnormal Growth', present: draftOral.abnormalGrowth },
    { label: 'Cleft Lip / Palate', present: draftOral.cleftLipPalate },
  ], [chartedTeeth, draftOral]);
  const dmft = computeDMFT(currentChart);
  // Coloured by the SELECTED YEAR's grade, not the student's current one — a
  // 2025-2026 record tinted with this year's grade colour is the same quiet
  // lie the text labels used to tell. An unrecorded year falls through to
  // getGradeColor's neutral grey default.
  const gc = getGradeColor(years[selectedYear]?.iptr.grade_level ?? '');
  // Age AS OF THE SELECTED SCHOOL YEAR, not today (Sprint 57b). Deriving age
  // from `birthday` does not make it safe — deriving it TO TODAY is the
  // staleness: viewing a 2025-2026 record showed the age the pupil is now, and
  // on a DOH form age at examination is clinical data. Anchored to that year's
  // charting date when one exists, otherwise to the start of that school year.
  const computeAge = (birthday: string, on: Date) => {
    if (!birthday) return 0;
    const birth = new Date(birthday);
    if (Number.isNaN(birth.getTime())) return 0;
    let age = on.getFullYear() - birth.getFullYear();
    const m = on.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && on.getDate() < birth.getDate())) age--;
    return age;
  };

  /** June 1 of a "YYYY-YYYY" school year. */
  const schoolYearAnchor = (sy: string | undefined): Date | null => {
    const first = Number(String(sy ?? '').split('-')[0]);
    return Number.isFinite(first) && first > 0 ? new Date(first, 5, 1) : null;
  };

  const handleToothClick = (toothNumber: number) => {
    const isTemp = temporaryTeeth.has(toothNumber);
    if (selectedCondition) {
      const codeObj = conditionCodes.find((c) => c.code === selectedCondition);
      const code = codeObj ? (isTemp ? codeObj.temp : codeObj.perm) : selectedCondition;
      const current = currentChart[toothNumber]?.condition;
      setDraftChart((prev) => ({
        ...prev,
        [toothNumber]: { condition: current === code ? '' : code, treatment: prev[toothNumber]?.treatment || '' },
      }));
    } else if (selectedTreatment) {
      const current = currentChart[toothNumber]?.treatment;
      setDraftChart((prev) => ({
        ...prev,
        [toothNumber]: { condition: prev[toothNumber]?.condition || '', treatment: current === selectedTreatment ? '' : selectedTreatment },
      }));
    } else {
      // No code selected: clicking a tooth empties it. This used to be a dead
      // click, which meant the ONLY way to remove a code was to first hunt down
      // the matching code in the palette and click the tooth again — you had to
      // know what was already there to get rid of it.
      //
      // Clears BOTH condition and treatment on purpose: with neither brush
      // active the intent is "empty this tooth". Removing just one is still
      // possible the precise way — select that exact code and click to toggle
      // it off. Nothing persists until Save Chart, and Cancel Edit discards it.
      setDraftChart((prev) => ({
        ...prev,
        [toothNumber]: { condition: '', treatment: '' },
      }));
    }
  };

  useEffect(() => {
    const measureStickyOffsets = () => {
      const headerHeight = headerRowRef.current?.offsetHeight ?? 0;
      const tabsHeight = tabsRowRef.current?.offsetHeight ?? 0;
      setStickyOffsets({ tabsTop: headerHeight, yearTop: headerHeight + tabsHeight });
    };
    measureStickyOffsets();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measureStickyOffsets);
      if (headerRowRef.current) resizeObserver.observe(headerRowRef.current);
      if (tabsRowRef.current) resizeObserver.observe(tabsRowRef.current);
    }
    window.addEventListener('resize', measureStickyOffsets);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureStickyOffsets);
    };
  }, [activeTab, years.length, editingInfo, saved]);

  const getNextSchoolYear = () => {
    if (years.length === 0) return ALL_SCHOOL_YEARS[0];
    const lastYear = years[years.length - 1].iptr.school_year;
    const lastYearIndex = ALL_SCHOOL_YEARS.indexOf(lastYear);
    return lastYearIndex >= 0 ? ALL_SCHOOL_YEARS[lastYearIndex + 1] ?? null : null;
  };

  // `addingYear` closes the double-submit that put two 2026-2027 records on one
  // student a second apart. The API rejects the duplicate too (uniqueBy on
  // student_id + school_year); this stops the second request being sent at all.
  const [addingYear, setAddingYear] = useState(false);

  const handleAddYear = async (target?: string) => {
    // ⚠ Takes a TARGET now (Sprint 172). A pupil with a gap — last record
    // 2024-2025 while today is 2026-2027 — needs to jump to the ACTUAL current
    // year, not merely the one after their last. Her menu offers both.
    const nextYear = target ?? getNextSchoolYear();
    if (!nextYear || !id || addingYear) return;
    setAddingYear(true);
    try {
      // Stamp the grade and section the student is in AS OF THIS YEAR'S
      // record. This is the whole point of Sprint 57a: next year's IPTR gets
      // next year's grade, and this year's stops being rewritten when the
      // student is promoted.
      await apiClient.post('/student-iptrs', {
        student_id: id,
        school_year: nextYear,
        grade_level: student?.grade_level ?? null,
        section: student?.section ?? null,
      });
      await reload();
      toast.success(`School year ${nextYear} added.`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to add school year');
    } finally {
      setAddingYear(false);
    }
  };

  const [confirmDeleteYear, setConfirmDeleteYear] = useState<number | null>(null);
  // Step-up check before removing a school year (Sprint 178, hers). ⚠ A random
  // field name: the literal string "password" in a name or id is what several
  // autofill engines key off, even with autocomplete overridden, and this must
  // never be filled for you.
  const [yearPassword, setYearPassword] = useState('');
  const [yearPasswordError, setYearPasswordError] = useState<string | null>(null);
  const yearPasswordField = useRef(`confirm-${Math.random().toString(36).slice(2)}`).current;
  const [deletingYear, setDeletingYear] = useState(false);

  const handleDeleteYear = async (yearIndex: number) => {
    if (!canEdit || years.length <= 1) return;
    const iptrId = years[yearIndex]?.iptr._id;
    if (!iptrId) return;
    try {
      await apiClient.patch(`/student-iptrs/${iptrId}/archive`);
      setSelectedYear((prev) => (prev === yearIndex ? Math.max(0, yearIndex - 1) : prev > yearIndex ? prev - 1 : prev));
      await reload();
      toast.success('School year removed.');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to remove school year');
    }
  };
  const confirmDeleteYearNow = async () => {
    if (confirmDeleteYear === null) return;
    if (!yearPassword) {
      setYearPasswordError('Enter your password to confirm.');
      return;
    }
    setDeletingYear(true);
    // ⚠ Re-verify the SIGNED-IN user's own password first — hers does this for
    // every year action, and removing a year archives that year's whole record:
    // its chart, tooth records, medical, dietary and oral history. A second
    // click is not a check; a shared machine at a school clinic makes that
    // difference real.
    try {
      await apiClient.post('/auth/verify-password', { password: yearPassword });
    } catch (err) {
      setDeletingYear(false);
      setYearPasswordError(err instanceof ApiError ? err.message : 'Could not verify password.');
      return;
    }
    try {
      await handleDeleteYear(confirmDeleteYear);
      setConfirmDeleteYear(null);
      setYearPassword('');
      setYearPasswordError(null);
    } finally {
      setDeletingYear(false);
    }
  };

  useEffect(() => {
    if (!canEdit) setYearMenuOpen(false);
  }, [canEdit]);

  // Persists the current year's chart + medical/diet/oral history for real.
  const handleSave = async () => {
    if (!currentYearData || !id) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Teeth are dentist-only (aides save History & Oral); the chart record
      // is only created when there are real tooth changes to persist — an
      // aide saving history must not require (or fabricate) a dentist chart.
      const existingByTooth = new Map(currentYearData.toothRecords.map((tr) => [tr.tooth_number, tr]));
      const pendingTeeth = canEdit
        ? Object.entries(draftChart)
            // ToothRecord.condition is required (non-empty) on the backend --
            // a tooth toggled back to "cleared" (empty string) has nothing
            // valid to persist. Its local draft state just won't be sent; on
            // reload it reverts to its last real saved value, if any, rather
            // than crashing the save with a validation error.
            .filter(([, entry]) => entry.condition !== '')
            .filter(([toothStr, entry]) => {
              const existing = existingByTooth.get(Number(toothStr));
              return !existing || existing.condition !== entry.condition || (existing.treatment_code ?? '') !== entry.treatment;
            })
        : [];

      let chartId = currentYearData.dentalChart?._id;
      if (!chartId && pendingTeeth.length > 0) {
        if (!currentDentist) throw new Error('No dentist record linked to your account.');
        const created = await apiClient.post<{ _id: string }>('/dental-charts', {
          iptr_id: currentYearData.iptr._id,
          dentist_id: currentDentist._id,
          date_charted: toLocalDateString(new Date()),
        });
        chartId = created._id;
      }

      const toothWrites = pendingTeeth.map(([toothStr, entry]) => {
        const toothNumber = Number(toothStr);
        const existing = existingByTooth.get(toothNumber);
        const body = { chart_id: chartId, tooth_number: toothNumber, condition: entry.condition, treatment_code: entry.treatment };
        return existing ? apiClient.put(`/tooth-records/${existing._id}`, body) : apiClient.post('/tooth-records', body);
      });

      const medBody = {
        iptr_id: currentYearData.iptr._id,
        allergies: draftMed.allergies, hypertension: draftMed.hypertension, diabetes_mellitus: draftMed.diabetes,
        cardiovascular_disease: draftMed.cardiovascular, thyroid_disorders: draftMed.thyroid,
        hepatitis_disorders: draftMed.hepatitis, malignancy: draftMed.malignancy,
        previous_hospitalization: draftMed.hospitalization, previous_surgical: false,
        blood_transfusion: draftMed.bloodTransfusion, tattoo: draftMed.tattoo, others: draftMed.others,
      };
      const medWrite = currentYearData.medicalHistory
        ? apiClient.put(`/medical-histories/${currentYearData.medicalHistory._id}`, medBody)
        : apiClient.post('/medical-histories', medBody);

      const dietBody = {
        iptr_id: currentYearData.iptr._id, sugar_beverages: draftDiet.sugarSweetened, alcohol_drinker: draftDiet.alcoholDrinker,
        tobacco_user: draftDiet.tobaccoUser, betel_nut_chewer: draftDiet.betelNut, body_piercing: draftDiet.bodyPiercing,
        nail_biting: draftDiet.nailBiting, thumb_sucking: draftDiet.thumbsucking,
      };
      const dietWrite = currentYearData.dietaryHabits
        ? apiClient.put(`/dietary-social-habits/${currentYearData.dietaryHabits._id}`, dietBody)
        : apiClient.post('/dietary-social-habits', dietBody);

      const oralBody = {
        iptr_id: currentYearData.iptr._id, oral_hygiene: draftOral.oralHygiene || 'Not assessed', gingivitis: draftOral.gingivitis,
        periodontal_disease: draftOral.periodontal, debris: draftOral.debris, calculus: draftOral.calculus,
        abnormal_growth: draftOral.abnormalGrowth, cleft_lip_palate: draftOral.cleftLipPalate, others: draftOral.others,
      };
      const oralWrite = currentYearData.oralCondition
        ? apiClient.put(`/oral-health-conditions/${currentYearData.oralCondition._id}`, oralBody)
        : apiClient.post('/oral-health-conditions', oralBody);

      // ── The visit's services and the two dates (Sprint 154) ─────────────
      // ⚠ Written to the LINKED RPC visit only. If this charting is attached
      // to no visit there is nowhere to record a service, and the card says so
      // on screen rather than silently dropping the tick. Creating a visit
      // from here is deliberately NOT done: an invented RPC visit changes the
      // pupil's 1st/2nd application count on a return filed with the City
      // Health Office.
      const linkedVisit = currentYearData.dentalChart
        ? currentYearData.preventiveByChart[currentYearData.dentalChart._id]
        : undefined;
      const extraWrites: Promise<unknown>[] = [];
      // Measurements belong to the YEAR's record. Blank clears back to null
      // rather than storing 0, which would read as "measured at zero" and feed
      // a nonsense BMI.
      const num = (v: string) => (v.trim() === '' ? null : Number(v));
      extraWrites.push(apiClient.put(`/student-iptrs/${currentYearData.iptr._id}`, {
        height_cm: num(draftMeasure.height_cm),
        weight_kg: num(draftMeasure.weight_kg),
        temperature_c: num(draftMeasure.temperature_c),
        blood_pressure: draftMeasure.blood_pressure.trim(),
      }));
      if (linkedVisit) {
        extraWrites.push(apiClient.put(`/preventive-care-records/${linkedVisit._id}`, {
          ...draftServices,
          ...(draftVisitDate ? { visit_date: draftVisitDate } : {}),
        }));
      }
      const savedChartId = currentYearData.dentalChart?._id;
      if (savedChartId && draftChartDate
          && draftChartDate !== new Date(currentYearData.dentalChart!.date_charted).toISOString().slice(0, 10)) {
        extraWrites.push(apiClient.put(`/dental-charts/${savedChartId}`, { date_charted: draftChartDate }));
      }

      await Promise.all([...toothWrites, medWrite, dietWrite, oralWrite, ...extraWrites]);
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // The "Saved!" button label is an in-place echo for whoever is still
      // looking at the button — but it sits at the top of a long scrolling
      // form, so someone who edited teeth further down never sees it. The
      // toast is what actually confirms the save. One message, not four:
      // the writes above are a single user action, not four separate ones.
      toast.success('Chart saved.');
      if (iptrContext === 'dental-queue') setTimeout(() => navigate('/ai-analytics'), 450);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save';
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key ?? 'history');
    }
  }, [activeTab, visibleTabs]);

  const handleToggleConsent = async (checked: boolean) => {
    const iptrId = yearIptr?._id;
    if (!iptrId || !canEdit) return;
    try {
      // ⚠ The YEAR's record, not the student's. `consent_given_at` is stamped
      // server-side by the model hook — a client-supplied "when was consent
      // given" is not evidence of anything.
      await apiClient.put(`/student-iptrs/${iptrId}`, { consent_status: checked ? 'complete' : 'pending' });
      await reload();
      toast.success(checked ? 'Consent marked complete.' : 'Consent marked pending.');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to update consent status');
    }
  };

  const openEditInfo = () => {
    if (!student) return;
    setDraftInfo({ ...student });
    const iptr = years[selectedYear]?.iptr;
    setDraftYear({
      height_cm: iptr?.height_cm != null ? String(iptr.height_cm) : '',
      weight_kg: iptr?.weight_kg != null ? String(iptr.weight_kg) : '',
      // Deliberately NOT falling back to the student's current grade. A blank
      // means "never recorded for this year", and pre-filling today's grade
      // would let one careless Save stamp it onto an old year — the exact lie
      // Sprint 57a removed.
      grade_level: iptr?.grade_level ?? '',
      section: iptr?.section ?? '',
    });
    setInfoError(null);
    setEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    if (!id || !draftInfo) return;
    // Same shared rules as the Add form and the bulk import (Sprint 120). Only
    // ONE of the 27 records on file fails them (a contact number), so this
    // blocks almost nothing that already exists -- but it does mean a legacy
    // bad value must be corrected before that pupil can be edited, which is
    // the point. Undefined fields are skipped, so editing a name never trips
    // on a phone the encoder is not looking at.
    const problems = validateStudentValues({
      lastName: draftInfo.last_name,
      firstName: draftInfo.first_name,
      middleName: draftInfo.middle_name,
      birthdate: draftInfo.birthday ? String(draftInfo.birthday).slice(0, 10) : undefined,
      contactNumber: draftInfo.contact_number,
      guardianContact: draftInfo.guardian_contact,
    });
    if (problems.length) {
      setInfoError(problems.join(' '));
      return;
    }
    setInfoSaving(true);
    setInfoError(null);
    try {
      await apiClient.put(`/students/${id}`, draftInfo);
      // Two writes because the panel edits two records. Blank clears the
      // measurement rather than storing 0, which would read as "measured at
      // zero" and feed a nonsense BMI.
      const iptrId = years[selectedYear]?.iptr._id;
      if (iptrId) {
        await apiClient.put(`/student-iptrs/${iptrId}`, {
          // ⚠ height_cm/weight_kg deliberately NOT written here (Sprint 173).
          // Physical Measurements on the History tab owns them now; sending
          // them from this panel too would let a stale draft overwrite a fresh
          // measurement depending on which save ran last.
          // Editable so a RETAINED pupil, or a section moved mid-year, can be
          // corrected on the year it belongs to — the dentist's own example.
          // Blank clears back to "not recorded" rather than writing "".
          grade_level: draftYear.grade_level.trim() === '' ? null : draftYear.grade_level,
          section: draftYear.section.trim() === '' ? null : draftYear.section,
        });
      }
      await reload();
      toast.success('Student info updated.');
      setEditingInfo(false);
    } catch (err) {
      setInfoError(err instanceof ApiError ? err.message : 'Failed to update student info');
    } finally {
      setInfoSaving(false);
    }
  };

  const chartedConditionCount = Object.values(currentChart).filter((e) => e.condition).length;
  const chartedTreatmentCount = Object.values(currentChart).filter((e) => e.treatment).length;

  // Clears one vocabulary across every tooth, leaving the other untouched.
  // Draft-only: nothing reaches the DB until Save, so Cancel still undoes it.
  const clearAll = (field: 'condition' | 'treatment') => {
    setDraftChart((prev) => {
      const next: Record<number, ChartEntry> = {};
      Object.entries(prev).forEach(([tooth, entry]) => {
        next[Number(tooth)] = { ...entry, [field]: '' };
      });
      return next;
    });
    setConfirmClear(null);
  };


  // Treatment History tab -- combined across all school years, most recent first.
  const allTreatments = useMemo(
    () => years.flatMap((y) => y.treatments).sort((a, b) => b.date.localeCompare(a.date)),
    [years],
  );
  const dentistNameById = useMemo(() => new Map(dentists.map((d) => [d._id, `Dr. ${d.first_name} ${d.last_name}`])), [dentists]);

  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({ date: toLocalDateString(new Date()), diagnosis: '', treatmentDone: '', remarks: '' });
  const [treatmentSaving, setTreatmentSaving] = useState(false);
  const [treatmentError, setTreatmentError] = useState<string | null>(null);

  const handleAddTreatment = async () => {
    if (!currentYearData || !currentDentist) {
      setTreatmentError('No dentist record linked to your account.');
      return;
    }
    if (!treatmentForm.diagnosis || !treatmentForm.treatmentDone) {
      setTreatmentError('Diagnosis and treatment done are required.');
      return;
    }
    setTreatmentSaving(true);
    setTreatmentError(null);
    try {
      await apiClient.post('/treatments', {
        iptr_id: currentYearData.iptr._id,
        dentist_id: currentDentist._id,
        diagnosis: treatmentForm.diagnosis,
        treatment_done: treatmentForm.treatmentDone,
        remarks: treatmentForm.remarks,
        date: treatmentForm.date,
      });
      await reload();
      toast.success('Treatment entry saved.');
      setTreatmentForm({ date: toLocalDateString(new Date()), diagnosis: '', treatmentDone: '', remarks: '' });
      setShowAddTreatment(false);
    } catch (err) {
      setTreatmentError(err instanceof ApiError ? err.message : 'Failed to save treatment entry');
    } finally {
      setTreatmentSaving(false);
    }
  };

  // ── Referrals (Sprint 127) ──────────────────────────────────────────────
  // Combined across school years, most recent first — the same shape as
  // Treatment History above, because it answers the same kind of question.
  const allReferrals = useMemo(
    () => years.flatMap((y) => y.referrals).sort((a, b) => b.date_issued.localeCompare(a.date_issued)),
    [years],
  );

  const [showAddReferral, setShowAddReferral] = useState(false);
  const [referralForm, setReferralForm] = useState({
    date: toLocalDateString(new Date()),
    referralType: 'higher_level' as ReferralType,
    facility: '',
    reason: '',
    followUp: '',
    notes: '',
  });
  const [referralSaving, setReferralSaving] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  const handleAddReferral = async () => {
    if (!currentYearData) {
      setReferralError('This student has no record for the selected school year.');
      return;
    }
    // `date_issued` is required on the model. Without this check, clearing the
    // date posts an empty string, Mongoose casting fails, and the raw server
    // validation string surfaces in the panel.
    if (!referralForm.date || !referralForm.facility.trim() || !referralForm.reason.trim()) {
      setReferralError('Date issued, facility and reason are required.');
      return;
    }
    setReferralSaving(true);
    setReferralError(null);
    try {
      await apiClient.post('/referrals', {
        iptr_id: currentYearData.iptr._id,
        // Nullable on the model: an aide can record a referral, and no dentist
        // record is linked to an aide's account.
        dentist_id: currentDentist?._id ?? null,
        referral_type: referralForm.referralType,
        date_issued: referralForm.date,
        facility_name: referralForm.facility.trim(),
        reason: referralForm.reason.trim(),
        notes: referralForm.notes.trim(),
        // `status` and `follow_up_date` are deliberately left to the model's
        // defaults unless a date is typed — referrals are ISSUE-ONLY until the
        // dentist confirms that closing one out is a real part of her workflow.
        ...(referralForm.followUp ? { follow_up_date: referralForm.followUp } : {}),
      });
      await reload();
      toast.success('Referral recorded.');
      setReferralForm({
        date: toLocalDateString(new Date()),
        referralType: 'higher_level',
        facility: '',
        reason: '',
        followUp: '',
        notes: '',
      });
      setShowAddReferral(false);
    } catch (err) {
      setReferralError(err instanceof ApiError ? err.message : 'Failed to save referral');
    } finally {
      setReferralSaving(false);
    }
  };

  // Real upcoming appointments for this specific student.
  const today = toLocalDateString(new Date());
  const studentAppointments = useMemo(
    () => appointmentSessions
      .filter((s) => s.students.some((stu) => stu.id === id) && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [appointmentSessions, id, today],
  );

  const showStickyYearBar = activeTab === 'history' || activeTab === 'chart';
  const backPath = iptrContext === 'risk' ? '/ai-analytics' : iptrContext === 'treatment' ? '/treatment-records' : '/dental-charts';

  // ⚠ ABOVE THE EARLY RETURNS ON PURPOSE. This is a HOOK, and the
  // `if (loading)` / `if (error)` guards below return before the rest of the
  // component runs — a useMemo placed after them runs on some renders and
  // not others, which is exactly the "Rendered more hooks than during the
  // previous render" crash that blanked this page in c0ce442b. tsc and the
  // build were clean for it; only opening the screen showed it.
  // ⚠ Consent is per SCHOOL YEAR (Sprint 167). Reading STUDENT.consent_status
  // said a pupil who consented once had consented forever — a 2023 signature
  // authorising 2026 treatment.
  // ⚠ Age in MONTHS at this year's measurement anchor, not today — the
  // DOH/DepEd BMI-for-Age table is banded by month, and a pupil measured in
  // August is not the age they are in June. Same reasoning as patientAge
  // (Sprint 57b).
  const patientAgeMonths = useMemo(() => {
    // Reads the year off `years[selectedYear]` rather than the `yearIptr`
    // const, which is declared further down — a hook cannot depend on a
    // binding that does not exist yet at this point in the component.
    const schoolYear = years[selectedYear]?.iptr.school_year;
    if (!student?.birthday || !schoolYear) return null;
    const born = new Date(student.birthday);
    if (Number.isNaN(born.getTime())) return null;
    // End of the school year: June 30 of its second half.
    const anchor = new Date(Number(String(schoolYear).slice(0, 4)) + 1, 5, 30);
    return (anchor.getFullYear() - born.getFullYear()) * 12 + (anchor.getMonth() - born.getMonth());
  }, [student?.birthday, years, selectedYear]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonPageHeader />
        <SkeletonTable rows={8} />
      </div>
    );
  }
  if (error || !student) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-destructive">{error ?? 'Student not found.'}</p>
        <Link to="/dental-charts" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Back to Dental Charts</Link>
      </div>
    );
  }

  const ageAnchor =
    (years[selectedYear]?.dentalChart?.date_charted ? new Date(years[selectedYear].dentalChart.date_charted) : null)
    ?? schoolYearAnchor(years[selectedYear]?.iptr.school_year)
    ?? new Date();
  const patientAge = computeAge(student.birthday, ageAnchor);

  // Grade and section AS OF THE SELECTED SCHOOL YEAR (Sprint 57a). These used
  // to read `student.grade_level`, which is a single current value — so opening
  // a Grade 5 student's 2025-2026 record showed Grade 5, not the Grade 3 they
  // actually were, and it silently rewrote itself every time the child was
  // promoted.
  //
  // Records created before this sprint carry null, and there is deliberately NO
  // fallback to the student's current grade: that fallback IS the bug. They
  // render as "not recorded", which is honest about what the system knows.
  const yearIptr = years[selectedYear]?.iptr;
  const consentComplete = yearIptr?.consent_status === 'complete';
  const yearGrade = yearIptr?.grade_level ?? null;
  const yearSection = yearIptr?.section ?? null;
  const NOT_RECORDED = 'Grade not recorded';
  const yearGradeLabel = yearGrade ? `${yearGrade}${yearSection ? ` ${yearSection}` : ''}` : NOT_RECORDED;

  // The patient's own record as a PDF — Sprint 52 named this "the one export a
  // clinic actually needs (a patient's own record for their file)".
  //
  // ⚠ Sprint 135 changed WHAT is captured. It used to capture `recordRef`, the
  // on-screen record region: the patient-info card, the tab strip, the Edit
  // buttons, whatever tab happened to be open. That is a screenshot of the app,
  // and it is the document a family or a referral is handed. It now captures
  // the real DOH form, built to the scan in the manuscript (Appendix G).
  //
  // `iptrFormRef` renders off-screen rather than conditionally: html2canvas
  // needs a laid-out element, so `display: none` would capture nothing.
  // ⚠ Declared at the TOP of the component with the other hooks, not here:
  // this function sits after the `if (loading)` / `if (error)` early returns,
  // and a hook after a conditional return changes the hook ORDER between
  // renders ("Rendered more hooks than during the previous render").
  // ⚠ TWO IPTR FORMS ARE VALID AT ONCE (user, 2026-09-05), so this is a CHOICE,
  // not a single action. `patient` is the Taguig City Health Office "Individual
  // PATIENT Treatment Record" (manuscript Appendix G, two pages); `form1` is
  // the DOH Center for Health Development "Individual Treatment Record". They
  // are different documents and are never merged.
  const onIptrPdf = async (which: 'patient' | 'form1') => {
    setPdfBusy(true);
    try {
      const who = surnameFirst(student).replace(/[^\w]+/g, '-');
      if (which === 'form1') {
        if (!iptrFormV2Ref.current) return;
        await exportPagesToPdf([iptrFormV2Ref.current], `ITR_Form1_${who}.pdf`);
        return;
      }
      if (!iptrFormRef.current) return;
      // TWO PDF PAGES, because that form is a two-page form (Sprint 136).
      // Capturing both into one tall page would produce a document that is not
      // the form.
      await exportPagesToPdf(
        [iptrFormRef.current, iptrFormPage2Ref.current].filter((el): el is HTMLDivElement => el !== null),
        `IPTR_${who}.pdf`,
      );
    } finally {
      setPdfBusy(false);
    }
  };

  // ⚠ THE WIDTH. This wrapper carried `max-w-5xl mx-auto` — a 1024px cap with
  // the leftover space split either side — which is why the record screen sat
  // in a narrow column while every other screen in the app ran the full width
  // of the content area. Hers is `w-full`, and hers is right here: the
  // odontogram is 32 teeth across and the summaries are a two-column grid,
  // both of which were being squeezed for no reason. Sprint 165.
  return (
    <div className="space-y-4 w-full">
      {/* The printable form, off-screen. Kept mounted so the PDF button has a
          laid-out element to capture; `aria-hidden` so it is not read twice by
          a screen reader, and it carries `.form-print` so a browser print of
          this page produces the FORM, not the app. */}
      <div aria-hidden className="fixed -left-[10000px] top-0">
        <div ref={iptrFormRef}><IptrForm student={student} years={years} dentists={dentists} /></div>
        <div ref={iptrFormPage2Ref}><IptrFormPage2 years={years} /></div>
        <div ref={iptrFormV2Ref}><IptrFormV2 student={student} schoolName={schoolName} years={years} /></div>
      </div>
      {/* Sticky header row */}
      <div ref={headerRowRef} className="sticky top-0 z-40 bg-gray-50 pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={backPath} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">Individual Patient Treatment Record</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* PDF ONLY — no Excel, deliberately. This is one patient's own
              record, the document a family or a referral needs; a spreadsheet
              of a single patient serves nobody and would be a decrypted PII
              file with no filing purpose. Sprint 52 removed the bulk patient
              exports for exactly that reason and named THIS as the one export
              a clinic actually needs. */}
          {/* Both forms are in use, so both are offered and the button says
              WHICH — a single "PDF" button would have to pick one silently. */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onIptrPdf('patient')}
              disabled={pdfBusy}
              title="Download the Individual PATIENT Treatment Record (City Health Office, 2 pages)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />{pdfBusy ? 'Preparing…' : 'IPTR'}
            </button>
            <button
              onClick={() => onIptrPdf('form1')}
              disabled={pdfBusy}
              title="Download the Individual Treatment Record (DOH Form 1)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />{pdfBusy ? 'Preparing…' : 'Form 1'}
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => goToStudent(prevPatient)}
              disabled={!prevPatient}
              title={prevPatient ? `← ${prevPatient.name}` : undefined}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default border-r border-border"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {/* Surname, not the given name: the list is ordered by surname,
                  so the button must name the same thing you are stepping through. */}
              {prevPatient ? <span className="max-w-[80px] truncate">{prevPatient.lastName || prevPatient.name}</span> : 'First'}
            </button>
            <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {navIndex >= 0 ? `${navIndex + 1}/${navList.length}` : '—'}
            </span>
            <button
              onClick={() => goToStudent(nextPatient)}
              disabled={!nextPatient}
              title={nextPatient ? `${nextPatient.name} →` : undefined}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default border-l border-border"
            >
              {nextPatient ? <span className="max-w-[80px] truncate">{nextPatient.lastName || nextPatient.name}</span> : 'Last'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* The year arrows are gone (Sprint 163, her header). The year CHIPS
              row directly under the tab strip already selects the school year,
              names its exam date and shows its DMFT — two controls for one
              choice, one of which said less. */}
        </div>
      </div>
      </div>

      {/* Everything below the sticky toolbar is the record itself, and is what
          the PDF captures. */}
      <div ref={recordRef} className="space-y-4">
      {/* Patient Info Card */}
      <div className="bg-card rounded-xl border border-border p-4">
        {editingInfo ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Edit Student Info</span>
              <div className="flex gap-2">
                <button onClick={handleSaveInfo} disabled={infoSaving} className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-60">{infoSaving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditingInfo(false)} className="px-3 py-1.5 text-sm border border-border text-foreground rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
            {infoError && <p className="text-xs text-destructive">{infoError}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Three boxes, matching the DOH IPTR paper form. full_name is
                  derived server-side from these, so it is not edited directly. */}
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Last Name</label>
                <input type="text" value={draftInfo.last_name ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, last_name: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">First Name</label>
                <input type="text" value={draftInfo.first_name ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, first_name: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Middle Name</label>
                <input type="text" value={draftInfo.middle_name ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, middle_name: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Contact Number</label>
                <input type="text" value={draftInfo.contact_number ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, contact_number: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Guardian Name</label>
                <input type="text" value={draftInfo.guardian_name ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, guardian_name: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Guardian Contact</label>
                <input type="text" value={draftInfo.guardian_contact ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, guardian_contact: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              {/* ── This school year's record ──────────────────────────────
                  Everything from here down saves to the SELECTED YEAR's IPTR,
                  not to the student. Two grades exist on purpose: the student
                  carries their CURRENT enrolment (what rosters and the
                  appointment picker read), and each year carries the grade the
                  pupil was actually in then (Sprint 57a). They differ for a
                  retained pupil, and for every past year once anyone is
                  promoted — which is the whole reason the year keeps its own. */}
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">
                  Grade <span className="font-normal">· {years[selectedYear]?.iptr.school_year}</span>
                </label>
                <select value={draftYear.grade_level}
                  onChange={(e) => setDraftYear((p) => ({ ...p, grade_level: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs bg-card">
                  <option value="">Not recorded</option>
                  {GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">
                  Section <span className="font-normal">· {years[selectedYear]?.iptr.school_year}</span>
                </label>
                <input type="text" placeholder="Not recorded" value={draftYear.section}
                  onChange={(e) => setDraftYear((p) => ({ ...p, section: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              {/* ⚠ Height, Weight and the BMI preview are NOT edited here any
                  more (Sprint 173). They moved to Physical Measurements on the
                  History tab, alongside temperature and blood pressure, which
                  is where hers are and where the BMI they feed is read. Two
                  panels writing one field is how they drift.

                  Grade and Section stay: those are enrolment, not measurements,
                  and this panel is where a retained pupil's year is corrected
                  (Sprint 70). */}
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">PhilHealth No.</label>
                <input type="text" value={draftInfo.philhealth_number ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, philhealth_number: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Birthday</label>
                <input type="date" value={draftInfo.birthday?.slice(0, 10) ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, birthday: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Sex</label>
                <select value={draftInfo.sex ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, sex: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs bg-card">
                  <option>Male</option><option>Female</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Grade <span className="font-normal">· current</span></label>
                <select value={draftInfo.grade_level ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, grade_level: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs bg-card">
                  {GRADES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">Section <span className="font-normal">· current</span></label>
                <input type="text" value={draftInfo.section ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, section: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div>
                <label className="block text-muted-foreground font-medium mb-0.5">PhilHealth Status</label>
                <select value={draftInfo.philhealth_status ?? 'None'} onChange={(e) => setDraftInfo((p) => ({ ...p, philhealth_status: e.target.value as 'None' | 'Principal' | 'Dependent' }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs bg-card">
                  <option>Dependent</option><option>Principal</option><option>None</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-muted-foreground font-medium mb-0.5">School</label>
                <select value={schoolName} disabled className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-gray-50 text-muted-foreground">
                  {schoolNames.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-muted-foreground font-medium mb-0.5">Address</label>
                <input type="text" value={draftInfo.address ?? ''} onChange={(e) => setDraftInfo((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="4ps" checked={!!draftInfo.is_4ps} onChange={(e) => setDraftInfo((p) => ({ ...p, is_4ps: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary" />
                <label htmlFor="4ps" className="text-foreground font-medium">4Ps Member</label>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div style={{ backgroundColor: gc.light, color: gc.solid }} className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg">
                  {[student.first_name?.[0], student.last_name?.[0]].filter(Boolean).join('') || student.full_name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-foreground">{surnameFirstWithInitial(student)}</div>
                  <div className="text-xs text-muted-foreground">{yearGradeLabel} • {student.sex} • Age {patientAge}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Nothing when the year has no recorded grade — the detail
                        line directly above already says so, and repeating it
                        here just doubled the same sentence. */}
                    {yearGrade && <GradePill grade={yearGrade} />}
                    {yearSection && <span style={{ color: gc.solid }} className="text-xs font-medium">{yearSection}</span>}
                    {student.is_4ps && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">4Ps</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Her chips. ⚠ READ-ONLY here on purpose — consent has its own
                    tab and its own toggle, and editing student info must never
                    reach it. */}
                <span
                  title={`${consentComplete ? 'Consent obtained' : 'Consent pending'} for ${yearIptr?.school_year ?? 'this year'}`}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${consentComplete ? 'bg-success-surface text-success' : 'bg-warning-surface text-warning'}`}
                >
                  {consentComplete ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {consentComplete ? 'Consent Complete' : 'Consent Pending'}
                </span>
                {/* Colour rather than neutral grey, so sex reads at a glance —
                    and it stays visible while the card is collapsed. */}
                {student.sex && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${student.sex === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {student.sex}
                  </span>
                )}
                {canEditInfo && (
                  <button onClick={openEditInfo} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-gray-50">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                {/* ⚠ The button CARRIES ITS LABEL WHEN COLLAPSED. The state
                    persists across pupils (Sprint 166), so a bare chevron meant
                    the birthday, address, PhilHealth and guardian simply were
                    not there on every record for the rest of the session, with
                    nothing on screen saying they could come back. Reported as
                    "basic patient info missing", which is exactly right: hidden
                    content needs a way in that reads as one. */}
                <button
                  onClick={() => setBasicInfoExpanded((v) => !v)}
                  title={basicInfoExpanded ? 'Hide basic information' : 'Show basic information'}
                  aria-label={basicInfoExpanded ? 'Hide basic information' : 'Show basic information'}
                  aria-expanded={basicInfoExpanded}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:bg-gray-50"
                >
                  {basicInfoExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {!basicInfoExpanded && 'Basic info'}
                </button>
              </div>
            </div>
            {basicInfoExpanded && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                // "May 30, 2013", not 2013-05-30 — hers, and it is what a person
                // reads a birthday as.
                // Her field ORDER, not just her fields: Birthday, Age, Place of
                // Birth, Sex — then Address, Occupation, Contact.
                ['Birthday', student.birthday ? formatDate(student.birthday) : '—'],
                ['Age', `${patientAge} years`],
                ['Place of Birth', student.place_of_birth || '—'],
                ['Sex', student.sex],
                ['Address', student.address],
                // Guardian's occupation — the label is "Occupation" on the paper
                // IPTR and on her card, so it stays that word here too.
                ['Occupation', student.guardian_occupation || '—'],
                ['Contact', student.contact_number || '—'],
                ['Guardian', student.guardian_name || '—'],
                ['Guardian Contact', student.guardian_contact || '—'],
                ['PhilHealth', `${student.philhealth_number || '—'} (${student.philhealth_status || 'None'})`],
                // ⚠ Height, Weight and BMI are NOT here any more (Sprint 173,
                // hers). This card is identity and contact facts; a clinical
                // measurement belongs with the rest of the measurements, on
                // History, where it is also entered.
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-muted-foreground font-medium">{label}</div>
                  <div className="text-foreground" title={label === 'BMI' ? BMI_NOTE : undefined}>{val}</div>
                </div>
              ))}
            </div>
            )}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky z-30 bg-gray-50 space-y-0" style={{ top: stickyOffsets.tabsTop }}>
        <div className="bg-card rounded-xl border border-border">
          <div ref={tabsRowRef} className="rounded-t-xl border-b border-border bg-card">
            <div className="flex items-center">
              {/* Her strip: every tab takes an equal share of the card's
                  width and its label is centred, instead of the tabs hugging
                  their text at the left edge. The active tab is BOLD with the
                  underline and no blue fill — the fill made the strip read as
                  two different controls.

                  ⚠ `whitespace-nowrap` + the scroller: a two-line "Caries Risk
                  Assessment" makes the whole strip taller and knocks every
                  other label off the baseline. Labels stay on one line and the
                  strip scrolls inside itself once they stop fitting, which is
                  the house rule for tab strips at phone width. */}
              {/* ⚠ `flex-1` only when there is more than one tab. The risk
                  context renders a SINGLE tab, and stretched across the whole
                  card it stops reading as a tab and starts reading as a
                  heading — an underlined title nobody would think to press. */}
              <div className="flex flex-1 min-w-0 overflow-x-auto">
              {visibleTabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as TabKey)}
                  aria-current={activeTab === tab.key ? 'page' : undefined}
                  className={`${visibleTabs.length > 1 ? 'flex-1' : 'px-6'} whitespace-nowrap px-3 py-3 text-sm text-center transition-colors focus:outline-none focus-visible:outline-none ${activeTab === tab.key ? 'font-bold border-b-[3px] border-blue-700 text-blue-700 bg-blue-50/60' : 'font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50'}`}>
                  {tab.label}
                </button>
              ))}
              </div>
              {/* ⚠ The chart tab no longer belongs to the dentist alone. Sprint
                  176 moved Oral Health Condition here, and Sprint 154 put the
                  Oral Conditions and Treatments Given card here — both are
                  `editingHistory` data, which a DENTAL AIDE may edit. The old
                  condition only offered the pencil on this tab to `canEdit`
                  (dentist), so an aide stood in front of fields they are
                  allowed to change with no way to start changing them: they
                  had to go to History, press the pencil there, then come back.
                  Teeth remain dentist-only through `editingChart`. */}
              {canEditHistory && currentYearData && (editMode || activeTab === 'history' || activeTab === 'chart') && (
                <div className="flex shrink-0 items-center gap-2 px-3">
                  {!editMode ? (
                    /* Icon only, at the right end of the tab strip — her
                       control. The label moves to the tooltip and the aria
                       label, so a screen reader and a hover still say which
                       of the two things this edits. */
                    <button onClick={() => setEditMode(true)}
                      title={canEdit ? 'Edit chart' : 'Edit history & oral'}
                      aria-label={canEdit ? 'Edit chart' : 'Edit history & oral'}
                      className="flex items-center justify-center rounded-lg border border-border p-2 text-foreground transition-colors hover:bg-muted">
                      <Pencil className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button onClick={cancelEdit} disabled={saving} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60">
                        Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${saved ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary-hover'}`}>
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {saveError && <p className="px-4 pb-2 text-xs text-destructive">{saveError}</p>}
          </div>
          {showStickyYearBar && years.length > 0 && (
            <div className="border-t border-gray-100 bg-card px-4 pt-3">
              <div className="overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max">
              {years.map((y, idx) => {
                // BUG-12: the year's DMFT comes from the latest charting that
                // HAS records, not from whichever charting is newest. An empty
                // charting made this read "DMFT: 0" for a pupil with 14 decayed
                // teeth recorded a day earlier. Null prints "—", not 0.
                const yrChart: Record<number, ChartEntry> = {};
                for (const tr of y.dmftToothRecords ?? []) yrChart[tr.tooth_number] = { condition: tr.condition, treatment: tr.treatment_code ?? '' };
                const yrDmft = computeDMFT(yrChart);
                // BUG-13: permanent (DMFT) and deciduous (dmft) stay separate, as in the History table.
                const yrDmftLabel = y.dmftToothRecords ? `DMFT ${yrDmft.T} · dmft ${yrDmft.t}` : 'DMFT —';
                const isActive = selectedYear === idx;
                return (
                  <div key={y.iptr._id} className={`mr-1 flex flex-shrink-0 items-stretch border-b-2 ${isActive ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-gray-50'}`}>
                    <button type="button" onClick={() => setSelectedYear(idx)} className="px-4 py-2.5 text-left text-xs font-medium transition-all">
                      <div>{y.iptr.school_year}</div>
                      {activeTab === 'chart' && (
                        <div style={{ fontSize: '10px', marginTop: '2px' }} className={isActive ? 'text-blue-600' : 'text-muted-foreground'} title={y.dmftToothRecords ? undefined : 'No charting this school year recorded a tooth'}>{yrDmftLabel}</div>
                      )}
                      <div style={{ fontSize: '10px', marginTop: '2px' }} className={isActive ? 'text-blue-600' : 'text-muted-foreground'}>
                        {formatDateStamp(y.dentalChart?.date_charted)}
                      </div>
                    </button>
                    {false && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDeleteYear(idx); }} className="border-l border-border px-2 text-muted-foreground transition-colors hover:bg-card hover:text-destructive" title={`Remove ${y.iptr.school_year}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {/* ⚠ Her ⋮ menu, replacing "Edit Years" (Sprint 172). The old
                  control was a MODE: press it, trash icons appear on every
                  year chip, press again to leave. A mode that arms a
                  destructive action on every row is a worse shape than a menu
                  that names one thing and does it.

                  Delete now acts on the SELECTED year, which is the one whose
                  data is on screen — you cannot arm a delete for a year you
                  are not looking at.

                  NOT copied: her "Edit <year>'s date" item. It writes
                  `date_opened`, which her STUDENT_IPTR has and ours does not.
                  A menu item that saves nowhere is the placeholder CLAUDE.md
                  forbids, so it is left out rather than stubbed. */}
              {canEdit && (
                <div className="relative ml-2 flex-shrink-0 py-2">
                  <button type="button" ref={yearMenuBtnRef} onClick={openYearMenu}
                    title="School year options" aria-label="School year options" aria-expanded={yearMenuOpen}
                    className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-gray-50">
                    School year <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {yearMenuOpen && (
                    <>
                      {/* Click-away sheet, under the menu and over everything
                          else — without it the menu only closes by re-pressing
                          the button, which nobody does. */}
                      <div className="fixed inset-0 z-10" onClick={() => setYearMenuOpen(false)} />
                      <div
                        style={yearMenuAt ? { top: yearMenuAt.top, right: yearMenuAt.right } : undefined}
                        className="fixed z-50 w-52 rounded-xl border border-border bg-card shadow-md py-1"
                      >
                        {(() => {
                          const nextYear = getNextSchoolYear();
                          const currentYear = schoolYearLabel();
                          const existing = new Set(years.map((y) => y.iptr.school_year));
                          const showCurrent = !existing.has(currentYear);
                          const showNext = !!nextYear && nextYear !== currentYear && !existing.has(nextYear);
                          return (
                            <>
                              {showCurrent && (
                                <button type="button" disabled={addingYear}
                                  onClick={() => { setYearMenuOpen(false); handleAddYear(currentYear); }}
                                  className="block w-full text-left px-3 py-2 text-xs text-foreground hover:bg-canvas disabled:opacity-50">
                                  Add {currentYear} <span className="text-muted-foreground">(current)</span>
                                </button>
                              )}
                              {showNext && (
                                <button type="button" disabled={addingYear}
                                  onClick={() => { setYearMenuOpen(false); handleAddYear(nextYear); }}
                                  className="block w-full text-left px-3 py-2 text-xs text-foreground hover:bg-canvas disabled:opacity-50">
                                  Add {nextYear} <span className="text-muted-foreground">(next)</span>
                                </button>
                              )}
                              {!showCurrent && !showNext && (
                                <div className="px-3 py-2 text-xs text-muted-foreground">Current and next year already recorded</div>
                              )}
                            </>
                          );
                        })()}
                        {years.length > 1 && (
                          <button type="button"
                            onClick={() => { setYearMenuOpen(false); setConfirmDeleteYear(selectedYear); }}
                            className="block w-full text-left px-3 py-2 text-xs text-destructive hover:bg-danger-surface">
                            Remove {years[selectedYear]?.iptr.school_year}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Sprint 163 — Charting Mode and Legend sit at the right end of
                  the YEAR ROW, level with the year chips, which is where hers
                  are. They were below the charting picker, half a screen down
                  from the tab that owns them. Chart tab only: neither means
                  anything on History or Consent. */}
              {activeTab === 'chart' && (
                <div className="ml-auto flex flex-shrink-0 items-center gap-2 py-2 pr-1">
                  {!chartingMode && (
                    <button
                      type="button"
                      onClick={() => setChartingMode(true)}
                      title="Full-screen charting — Escape exits"
                      className="flex items-center gap-1.5 rounded-lg border border-primary px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Charting Mode
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLegendOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-destructive px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
                  >
                    <FileText className="w-3.5 h-3.5" /> Legend
                  </button>
                </div>
              )}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONSENT BANNER (Sprint 167, hers) ──────────────────────────────
          History tab only. It is registration data — a dentist mid-chart or
          mid-treatment-entry does not need it repeated on every tab, and the
          card's chip above already carries the status everywhere else.

          ⚠ NO APPROVAL DATE SHOWN, even though `consent_given_at` now exists:
          every record predating this sprint has null there, and printing
          "—" beside a completed consent reads as a missing signature rather
          than a missing field. It goes in once the data is real. */}
      {activeTab === 'history' && years.length > 0 && yearIptr && (
        <div className={`rounded-xl border p-3 ${consentComplete ? 'bg-success-surface border-green-200' : 'bg-warning-surface border-amber-200'}`}>
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-card ${consentComplete ? 'text-success' : 'text-warning'}`}>
              {consentComplete ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-bold ${consentComplete ? 'text-success' : 'text-warning'}`}>
                {consentComplete
                  ? `Physical copy of consent obtained for ${yearIptr.school_year}`
                  : `Consent pending for ${yearIptr.school_year}`}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {yearGrade ? (
                  <>
                    <GradePill grade={yearGrade} />
                    {yearSection && <span style={{ color: gc.solid }} className="text-xs font-semibold">{yearSection}</span>}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Grade/section not recorded for this year</span>
                )}
              </div>
            </div>
          </div>
          {/* ⚠ SHOWN IN BOTH STATES, unlike hers. Her banner hides this once
              consent is complete, which works on her branch because she treats
              the tick as final. Ours can be reverted — and the Consent TAB that
              offered that is gone as of this sprint, so if the box vanished
              when ticked, a mis-tick would be unfixable outside the database.
              Both directions open the confirmation. */}
          <label className={`flex items-center gap-2 mt-2 ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}>
            <input
              type="checkbox"
              checked={consentComplete}
              onChange={(e) => { if (canEdit) setConfirmConsent({ schoolYear: yearIptr.school_year, revert: !e.target.checked }); }}
              disabled={!canEdit}
              className="w-4 h-4 rounded accent-primary disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <span className="text-xs font-medium text-foreground">Consent has been obtained (Nakumpleto na ang pahintulot)</span>
          </label>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-card rounded-xl border border-border">

        {years.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-sm">No IPTR school-year records yet for this student.</p>
            {canEdit && <button onClick={() => handleAddYear()} disabled={addingYear} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">+ Start {getNextSchoolYear()}</button>}
          </div>
        ) : (
        <>
        {/* ── TAB 1: History ── */}
        {activeTab === 'history' && (
          <HistoryTab
            editing={editingHistory}
            measure={draftMeasure}
            setMeasure={setDraftMeasure}
            med={draftMed}
            setMed={setDraftMed}
            diet={draftDiet}
            setDiet={setDraftDiet}
            patientAgeMonths={patientAgeMonths}
            sex={student.sex}
            appointments={studentAppointments}
          />
        )}

        {/* ── TAB 2: Dental Chart ── */}
        {activeTab === 'chart' && (
          <DentalChartTab
            chartingMode={chartingMode}
            studentName={surnameFirst(student)}
            yearGrade={yearGrade}
            yearSection={yearSection}
            gc={gc}
            currentYearData={currentYearData}
            navIndex={navIndex}
            navList={navList}
            prevPatient={prevPatient}
            nextPatient={nextPatient}
            canEdit={canEdit}
            editMode={editMode}
            saving={saving}
            saved={saved}
            editingChart={editingChart}
            editingHistory={editingHistory}
            linkedVisitForCard={linkedVisitForCard}
            iptrContext={iptrContext}
            currentChart={currentChart}
            chartedConditionCount={chartedConditionCount}
            chartedTreatmentCount={chartedTreatmentCount}
            dmft={dmft}
            presentOralConditions={presentOralConditions}
            indicateNumberRows={indicateNumberRows}
            perToothTreatmentRows={perToothTreatmentRows}
            treatmentTeeth={treatmentTeeth}
            actions={{ setChartingMode, setEditMode, cancelEdit, handleSave, goToStudent, setSelectedChartId, setConfirmClear, handleToothClick }}
            palette={{
              selectedCondition, setSelectedCondition, selectedTreatment, setSelectedTreatment,
              rareConditionsOpen, setRareConditionsOpen, rareTreatmentsOpen, setRareTreatmentsOpen,
            }}
            drafts={{
              draftChartDate, setDraftChartDate, draftOral, setDraftOral, othersOralOpen, setOthersOralOpen,
              draftVisitDate, setDraftVisitDate, draftServices, setDraftServices,
            }}
          />
        )}

        {/* ── TAB 4: Dental Records (DMFT History) ── */}
        {activeTab === 'records' && <DmftHistoryTab years={years} />}

        {/* ── TAB 5: Treatment History ── */}
        {activeTab === 'treatments' && (
          <TreatmentHistoryTab
            treatments={allTreatments}
            dentistNameById={dentistNameById}
            schoolYear={currentYearData?.iptr.school_year}
            canEdit={canEdit}
            staffNameLabel={staffNameLabel}
            staffName={user?.name ?? ''}
            addForm={{
              open: showAddTreatment,
              setOpen: setShowAddTreatment,
              values: treatmentForm,
              setValues: setTreatmentForm,
              error: treatmentError,
              saving: treatmentSaving,
              onSave: handleAddTreatment,
            }}
          />
        )}

        {/* ── TAB 6: Referrals (Sprint 127) -- REFERRAL exists now, so this is
             a real record rather than the "not tracked" placeholder it was.
             Issue-only by design: a referral is recorded when it is written,
             and nothing here pretends to know whether the family went. ── */}
        {activeTab === 'referrals' && (
          <ReferralsTab
            referrals={allReferrals}
            schoolYear={currentYearData?.iptr.school_year}
            canEdit={canEdit}
            addForm={{
              open: showAddReferral,
              setOpen: setShowAddReferral,
              values: referralForm,
              setValues: setReferralForm,
              error: referralError,
              saving: referralSaving,
              onSave: handleAddReferral,
            }}
          />
        )}

      {/* Chart legend (Sprint 152). Adopted from the collaborator's design;
          the content is OUR code lists, so it cannot drift from the palette
          the dentist actually clicks. */}
      {legendOpen && (
        <Modal onClose={() => setLegendOpen(false)}>
          <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">Chart Legend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every code used on this chart. Upper-case marks a permanent tooth, lower-case the primary
                tooth in the same position.
              </p>
            </div>
            <button
              onClick={() => setLegendOpen(false)}
              aria-label="Close legend"
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Condition codes — per tooth
              </div>
              <div className="space-y-1">
                {conditionCodes.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 text-sm">
                    {/* ⚠ The swatch reads `conditionColors` — the SAME map the
                        tooth cells render from (see the odontogram above), not a
                        colour typed here. A hand-typed swatch is how a legend
                        ends up describing a colour the chart no longer uses. */}
                    <span
                      className={`font-mono font-bold text-foreground text-xs w-16 shrink-0 text-center px-1.5 py-1 rounded border ${
                        conditionColors[c.perm] ?? 'bg-card border-border'
                      }`}
                    >
                      {c.perm}/{c.temp}
                    </span>
                    <span className="text-muted-foreground">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Treatment codes — per tooth
              </div>
              <div className="space-y-1">
                {treatmentCodes.map((t) => (
                  <div key={t.code} className="flex items-baseline gap-3 text-sm">
                    <span className="font-mono font-bold text-primary w-16 shrink-0">{t.code}</span>
                    <span className="text-muted-foreground">{treatmentLabel(t)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Recorded elsewhere, not on a tooth
              </div>
              {/* ⚠ Deliberately different from the collaborator's version. Hers
                  listed whole-mouth services as chips on this screen; ours are
                  recorded against the RPC VISIT (Sprint 147), so the legend
                  says where they live rather than implying they are charted
                  here. */}
              <p className="text-xs text-muted-foreground">
                Whole-mouth findings — gingivitis, periodontal disease, debris, calculus, abnormal growth,
                cleft lip/palate — are recorded once per school year under <strong>History &amp; Oral</strong>.
                The services given at a visit — oral screening, prophylaxis, fluoride varnish, hygiene
                instruction — are recorded against that visit in <strong>RPC Tracking</strong>, which is what
                the DOH return counts.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Scores</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div><span className="font-mono font-bold text-foreground">DMFT</span> — permanent teeth Decayed + Missing + Filled</div>
                <div><span className="font-mono font-bold text-foreground">dmft</span> — primary teeth decayed + missing + filled</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

        {/* ── TAB 7: AI Risk ── */}
        {activeTab === 'ai' && <AiRiskTab />}
        </>
        )}
      </div>
      </div>{/* end recordRef — PDF capture region */}
      <ConfirmDialog
        open={confirmDeleteYear !== null}
        title={`Remove ${confirmDeleteYear !== null ? years[confirmDeleteYear]?.iptr.school_year ?? 'school year' : 'school year'}?`}
        message={
          <div className="space-y-3">
            <p>This archives the entire school year — its dental chart and medical, dietary, and oral-health records. A System Admin can restore it from the archive.</p>
            <div>
              <label htmlFor={yearPasswordField} className="block text-xs font-medium text-foreground mb-1">
                Confirm with your password
              </label>
              <input
                id={yearPasswordField}
                name={yearPasswordField}
                type="password"
                autoComplete="new-password"
                value={yearPassword}
                onChange={(e) => { setYearPassword(e.target.value); setYearPasswordError(null); }}
                disabled={deletingYear}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              {yearPasswordError && <p className="mt-1 text-xs text-destructive">{yearPasswordError}</p>}
            </div>
          </div>
        }
        confirmLabel="Remove year"
        busy={deletingYear}
        onConfirm={confirmDeleteYearNow}
        onCancel={() => { setConfirmDeleteYear(null); setYearPassword(''); setYearPasswordError(null); }}
      />
      {/* ── CONSENT CONFIRMATION (Sprint 169, hers) ────────────────────────
          Her dialog, and the reason for it is right: ticking "consent
          obtained" is a claim about a piece of PAPER, so the dialog shows the
          form that paper is, and the person ticking confirms against it.

          ⚠ The service list is OURS — `SERVICES` in ConsentForm.tsx,
          transcribed verbatim from the blank form supplied 2026-09-03, grade
          ranges and all. Hers is a paraphrase in sentence case. A paraphrase in
          the dialog and the real wording on the sheet is how someone confirms
          against a form that says something else. */}
      {confirmConsent && (
        <Modal onClose={() => setConfirmConsent(null)} maxWidth="max-w-[666px]">
          <div className="flex items-start gap-3 p-6 border-b border-border">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${confirmConsent.revert ? 'bg-warning' : 'bg-primary'}`}>
              {confirmConsent.revert ? <ShieldAlert className="w-5 h-5 text-white" /> : <ShieldCheck className="w-5 h-5 text-white" />}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">Guardian Consent</div>
              <h2 className="text-lg font-bold text-foreground">
                {confirmConsent.revert ? 'Revert consent to pending?' : 'Confirm consent obtained'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {confirmConsent.revert
                  ? `This says the signed copy for ${confirmConsent.schoolYear} is NOT on file after all.`
                  : `Confirm a signed physical copy of the form below is on file for ${confirmConsent.schoolYear} before continuing.`}
              </p>
            </div>
          </div>
          {!confirmConsent.revert && (
            <div className="p-6 pb-0">
              <div className="rounded-lg border border-border bg-canvas p-4 max-h-64 overflow-y-auto text-xs text-foreground space-y-3">
                <p className="font-bold text-sm">Parents/Guardian Consent Form</p>
                <p className="text-muted-foreground">
                  Ang dentista po ng ating school clinic ay magsasagawa ng serbisyong dental sa mga mag-aaral na may
                  layuning makapagbigay ng preventive at curative treatment. Ang mga serbisyo dental ay ang mga sumusunod:
                </p>
                <ul className="space-y-2">
                  {CONSENT_SERVICES.map((sv) => (
                    <li key={sv.label}>
                      <span className="font-semibold">{sv.label}</span>
                      {sv.note && <span className="block text-muted-foreground">{sv.note}</span>}
                    </li>
                  ))}
                </ul>
                <p className="pt-2 border-t border-border font-medium">
                  Oo, pumapayag ako na bigyan ng serbisyong dental ang aking anak/apo/pamangkin.
                </p>
              </div>
            </div>
          )}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg bg-warning-surface p-3">
              <ShieldIcon className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              {/* ⚠ Worded to be TRUE. Hers says the tick "cannot be undone" and
                  hides the box once complete. Ours can be reverted — the model
                  hook clears `consent_given_at` on the way back, and that path
                  exists precisely so a mis-tick can be corrected without a
                  database edit. Saying "cannot be undone" when it can is the
                  same class of untruth as a control that only looks like it
                  works, so the wording follows the behaviour. */}
              <p className="text-xs text-warning">
                {confirmConsent.revert
                  ? 'The recorded consent date for this school year will be cleared.'
                  : `This records consent for ${confirmConsent.schoolYear} only, and stamps the date. It can be reverted here, which clears that date.`}
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-6 pt-0">
            <button onClick={() => setConfirmConsent(null)}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-gray-50 text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={() => { const revert = confirmConsent.revert; setConfirmConsent(null); handleToggleConsent(!revert); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium ${confirmConsent.revert ? 'bg-warning hover:opacity-90' : 'bg-primary hover:bg-primary-hover'}`}
            >
              <Check className="w-4 h-4" /> {confirmConsent.revert ? 'Revert to pending' : 'Confirm consent'}
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={pendingNav !== null}
        title="Leave this chart unsaved?"
        message={`Nothing on this chart has been saved yet. Going to ${pendingNav?.name ?? 'the next student'} discards it. Cancel, then use Save Chart if you want to keep it.`}
        confirmLabel="Discard and continue"
        onConfirm={() => { const t = pendingNav; setPendingNav(null); setEditMode(false); if (t) navigate(`/dental-chart/${t.id}`); }}
        onCancel={() => setPendingNav(null)}
      />
      <ConfirmDialog
        open={confirmClear !== null}
        title={confirmClear === 'treatment' ? `Clear all ${chartedTreatmentCount} treatments?` : `Clear all ${chartedConditionCount} conditions?`}
        message={`This removes every ${confirmClear === 'treatment' ? 'treatment code' : 'condition code'} on this chart, leaving the ${confirmClear === 'treatment' ? 'conditions' : 'treatments'} untouched. Nothing is saved until you click Save Chart — Cancel Edit still discards it.`}
        confirmLabel={confirmClear === 'treatment' ? 'Clear treatments' : 'Clear conditions'}
        onConfirm={() => confirmClear && clearAll(confirmClear)}
        onCancel={() => setConfirmClear(null)}
      />
    </div>
  );
};
