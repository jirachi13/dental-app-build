import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, FileText, Printer, Download, AlertTriangle, AlertCircle, CheckCircle, Users, Calendar, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getSchoolShortName } from '../utils/schoolColors';
import { GradePill } from './GradePill';
import { useDohReportData } from '../hooks/useDohReportData';
import { exportElementToPdf } from '../utils/exportPdf';
import { apiClient } from '../api/client';
import type { ApiTreatment } from '../api/types';
import { useStudents } from '../hooks/useStudents';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Age brackets per grade — exact DOH format
const GRADE_BRACKETS: Record<string, {label:string; ages:string[]}> = {
  'Kinder':  { label:'KINDER',   ages:['4 yrs & below','5-9 yrs'] },
  'Grade 1': { label:'GRADE 1',  ages:['4 yrs & below','5-9 yrs','10-14 yrs','15-19 yrs'] },
  'Grade 2': { label:'GRADE 2',  ages:['5-9 yrs','10-14 yrs','15-19 yrs','20 yrs & above'] },
  'Grade 3': { label:'GRADE 3',  ages:['5-9 yrs','10-14 yrs','15-19 yrs','20 yrs & above'] },
  'Grade 4': { label:'GRADE 4',  ages:['5-9 yrs','10-14 yrs','15-19 yrs','20 yrs & above'] },
  'Grade 5': { label:'GRADE 5',  ages:['5-9 yrs','10-14 yrs','15-19 yrs','20 yrs & above'] },
  'Grade 6': { label:'GRADE 6',  ages:['5-9 yrs','10-14 yrs','15-19 yrs','20 yrs & above'] },
};

const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'];

// Summary age brackets (rightmost columns)
const SUMMARY_BRACKETS = ['4 yrs & below','5-9 yrs','10-14 yrs','15-19 yrs','20 yrs & above'];

// Cell display — blank if zero
const cell = (v: number) => v === 0 ? '' : String(v);

type RowDef =
  | { type: 'header'; label: string }
  | { type: 'data';   label: string; field: string; indent?: boolean }
  | { type: 'sub';    label: string; field: string };

const DOH_ROWS: RowDef[] = [
  { type:'data', label:'No. of Person Attended',   field:'attended'  },
  { type:'data', label:'No. Orally Examined',       field:'examined'  },

  { type:'header', label:'Medical History Status' },
  { type:'data', label:'Total No. with Allergies',                                  field:'allergies',      indent:true },
  { type:'data', label:'Total No. with Hypertension/ CVA',                          field:'hypertension',   indent:true },
  { type:'data', label:'Total No. with Diabetes Mellitus',                          field:'diabetes',       indent:true },
  { type:'data', label:'Total No. with Blood Disorders',                             field:'bloodDisorders', indent:true },
  { type:'data', label:'Total No. with Cardiovascular/ Heart Diseases',             field:'cardiovascular', indent:true },
  { type:'data', label:'Total No. with Thyroid Disorders',                          field:'thyroid',        indent:true },
  { type:'data', label:'Total No. with Hepatitis',                                  field:'hepatitis',      indent:true },
  { type:'data', label:'Total No. with Malignancy',                                 field:'malignancy',     indent:true },
  { type:'data', label:'Total No. with History of Previous Hospitalization',        field:'hospitalization',indent:true },
  { type:'data', label:'Total No. with Blood Transfussion',                         field:'bloodTransfusion',indent:true},
  { type:'data', label:'Total No. with Tattoo',                                     field:'tattoo',         indent:true },

  { type:'header', label:'Dietary/ Social History Status' },
  { type:'data', label:'Total No of Sugar Sweetened Beverages / Food Drinker/ Eater', field:'sugarSweetened', indent:true },
  { type:'data', label:'Total No of Alcoholic Drinker',                             field:'alcoholDrinker', indent:true },
  { type:'data', label:'Total No of Tobacco User',                                  field:'tobaccoUser',    indent:true },
  { type:'data', label:'Total No of Betel Nut Chewer',                              field:'betelNut',       indent:true },

  { type:'header', label:'Oral Health Status' },
  { type:'data', label:'Total No. with Dental Caries',                              field:'dentalCaries',   indent:true },
  { type:'data', label:'Total No. of Edentulous/ No Dentition',                     field:'edentulous',     indent:true },
  { type:'data', label:'Total No. with Gingivitis/Perio Disease',                   field:'gingivitis',     indent:true },
  { type:'data', label:'Total No. with Oral Debris',                                field:'debris',         indent:true },
  { type:'data', label:'Total No. with Calcular Deposit',                           field:'calculus',       indent:true },
  { type:'data', label:'Total No. with Dento-Facial Anomaly',                       field:'anomaly',        indent:true },
  { type:'data', label:'Total df',                                                   field:'dmf_df',         indent:true },
  { type:'data', label:'Total decayed (d)',                                          field:'dmf_d',          indent:true },
  { type:'data', label:'Total filled (f)',                                           field:'dmf_f',          indent:true },
  { type:'data', label:'Total DMF',                                                  field:'DMF_total',      indent:true },
  { type:'data', label:'Total Decayed (D)',                                          field:'DMF_D',          indent:true },
  { type:'data', label:'Total Missing (M)',                                          field:'DMF_M',          indent:true },
  { type:'data', label:'Total Filled (F)',                                           field:'DMF_F',          indent:true },

  { type:'header', label:'Services Rendered' },
  { type:'data', label:'No. Provided BOHC',                                          field:'bohc',           indent:true },
  { type:'sub',  label:'Health Center',                                              field:'bohc_hc'         },
  { type:'sub',  label:'Outreach',                                                   field:'bohc_out'        },
  { type:'sub',  label:'Schools',                                                    field:'bohc_sch'        },
  { type:'data', label:'No. Given OP/Scalling',                                      field:'oph_scaling',    indent:true },
  { type:'data', label:'No. Given Permanent Fillings',                               field:'fill_perm',      indent:true },
  { type:'sub',  label:'Head count',                                                 field:'fill_perm_head'  },
  { type:'sub',  label:'Tooth count',                                                field:'fill_perm_tooth' },
  { type:'data', label:'No. Given Temporary Fillings',                               field:'fill_temp',      indent:true },
  { type:'sub',  label:'Head count',                                                 field:'fill_temp_head'  },
  { type:'sub',  label:'Tooth count',                                                field:'fill_temp_tooth' },
  { type:'data', label:'No. Given Gum Treatment',                                    field:'gum_treatment',  indent:true },
  { type:'data', label:'No. Given Extraction',                                       field:'extraction',     indent:true },
  { type:'sub',  label:'Head count',                                                 field:'ext_head'        },
  { type:'sub',  label:'Tooth count',                                                field:'ext_tooth'       },
  { type:'data', label:'No. Given Sealant',                                          field:'sealant',        indent:true },
  { type:'sub',  label:'Head count',                                                 field:'sealant_head'    },
  { type:'sub',  label:'Tooth count',                                                field:'sealant_tooth'   },
  { type:'data', label:'No. Given Flouride Therapy',                                 field:'fluoride',       indent:true },
  { type:'sub',  label:'1st Dose',                                                   field:'fluor1'          },
  { type:'sub',  label:'2nd Dose',                                                   field:'fluor2'          },
  { type:'sub',  label:'No. Given Post Operative Treatment',                         field:'post_op'         },
  { type:'sub',  label:'No. of Patient with Oral Abscess Drained',                  field:'abscess'         },
  { type:'data', label:'No. Given Other Services',                                   field:'other',          indent:true },
  { type:'sub',  label:'No. Referred',                                               field:'referred'        },
  { type:'data', label:'No Given Counselling/ Education on Tobacco, Oral Health, Diet, Etc.', field:'counseling', indent:true },
  { type:'sub',  label:'No of Under 6 Children Completed Toothbrush Drill',         field:'toothbrush_drill'},

  { type:'header', label:'No. of Orally Fit Children (OFC)' },
  { type:'data', label:'OFC Upon Oral Examination',             field:'ofc_exam',   indent:true },
  { type:'data', label:'OFC Upon Complete Oral Rehabilitation', field:'ofc_rehab',  indent:true },
];

// No real Referral or bulk-Session-tracking model exists anywhere in the
// ERD -- these lists are genuinely empty until such a model is built, never
// fabricated placeholder rows.
const mockReferrals: { student:string; school:string; grade:string; date:string; facility:string; reason:string; followUp:string; status:string }[] = [];
const mockSessions: { date:string; school:string; grade:string; section:string; students:number; procedures:string[]; treated:number }[] = [];

const REPORT_SCHOOLS = [
  'Bagong Tanyag Integrated School',
  'Bagong Tanyag Elementary School Annex A',
  'South Daang Hari Elementary School Main',
];

const ALL_GRADES_INT = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];
const PROCEDURES = ['Fluoride Varnish','Oral Prophylaxis','Temp Filling','Perm Filling','Extraction (Primary)','Extraction (Permanent)','Sealant','SDF Application','OHE / Counseling'];
const CONDITIONS  = ['Caries (Primary)','Caries (Permanent)','Gingivitis','Malocclusion','Orally Fit'];
type GX = Record<string,{M:number,F:number}>;

// No real per-procedure/per-condition breakdown by grade+gender exists --
// Treatment.treatment_done and OralHealthCondition's fields don't cleanly
// map to these exact categories. Genuinely empty until that aggregation is
// built for real, never fabricated counts.
const treatmentMatrix: Record<string,GX> = {};
const conditionMatrix: Record<string,GX> = {};

const getCount = (matrix: Record<string,GX>, key: string, grade: string, gender: string): number => {
  const row = matrix[key];
  if (!row) return 0;
  if (grade !== 'all') {
    const g = row[grade];
    if (!g) return 0;
    if (gender === 'M') return g.M;
    if (gender === 'F') return g.F;
    return g.M + g.F;
  }
  return ALL_GRADES_INT.reduce((sum, gr) => {
    const g = row[gr];
    if (!g) return sum;
    if (gender === 'M') return sum + g.M;
    if (gender === 'F') return sum + g.F;
    return sum + g.M + g.F;
  }, 0);
};

export const Reports = () => {
  const { selectedSchool } = useAuth();
  const { getRealCount, loading: dohLoading } = useDohReportData();
  // Fields with no real backing data source yet show 0, never a fabricated
  // fallback number -- see useDohReportData.ts for exactly which fields are
  // real vs. not yet wireable.
  const V = (grade: string, age: string, sex: 'M'|'F', field: string): number =>
    getRealCount(grade, age, sex, field) ?? 0;
  const sumSummaryBracket = (field: string, sex: 'M'|'F', bracket: string) =>
    GRADES.reduce((s, g) => {
      const ages = GRADE_BRACKETS[g].ages;
      if (ages.includes(bracket)) return s + V(g, bracket, sex, field);
      return s;
    }, 0);
  const [activeReportTab, setActiveReportTab] = useState<'doh'|'internal'>('doh');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear,  setReportYear]  = useState(new Date().getFullYear());
  // Local school override — defaults to All Schools regardless of global context
  const [reportSchool, setReportSchool] = useState<string|null>(null);
  const dohReportRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [realTreatmentCount, setRealTreatmentCount] = useState(0);
  const { students: realStudents } = useStudents();

  useEffect(() => {
    (async () => {
      try {
        const treatments = await apiClient.get<ApiTreatment[]>('/treatments');
        setRealTreatmentCount(treatments.length);
      } catch (err) {
        console.error('Reports extra data fetch failed:', err);
      }
    })();
  }, []);

  const handleDownloadPdf = async () => {
    if (!dohReportRef.current) return;
    setDownloadingPdf(true);
    setDownloadError(null);
    try {
      const schoolPart = reportSchool ? getSchoolShortName(reportSchool).replace(/\s+/g, '_') : 'AllSchools';
      const filename = `DOH_Report_${schoolPart}_${MONTHS[reportMonth - 1]}${reportYear}.pdf`;
      await exportElementToPdf(dohReportRef.current, filename);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };
  const [internalSection, setInternalSection] = useState<'treatment'|'conditions'|'admin'>('treatment');
  const [periodType, setPeriodType] = useState<'monthly'|'biannual'|'annual'>('monthly');
  const [intGradeFilter, setIntGradeFilter] = useState('all');
  const [intGenderFilter, setIntGenderFilter] = useState('all');
  const [intAgeFilter, setIntAgeFilter] = useState('all');
  const [expandedReferral, setExpandedReferral] = useState<number|null>(null);

  const AGE_TO_GRADES: Record<string,string[]> = {
    '4 & below': ['Kinder'],
    '5-9': ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4'],
    '10-14': ['Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'],
    '15-19': ['Grade 10'],
    '20 & above': [],
  };
  const activeGrades = intAgeFilter !== 'all'
    ? AGE_TO_GRADES[intAgeFilter]
    : intGradeFilter !== 'all'
    ? [intGradeFilter]
    : null;
  const cnt = (matrix: Record<string,GX>, key: string, gender: string): number =>
    activeGrades
      ? activeGrades.reduce((s, g) => s + getCount(matrix, key, g, gender), 0)
      : getCount(matrix, key, 'all', gender);
  const displayGrades = intAgeFilter !== 'all' ? AGE_TO_GRADES[intAgeFilter] : ALL_GRADES_INT;
  const clearIntFilters = () => { setIntGradeFilter('all'); setIntGenderFilter('all'); setIntAgeFilter('all'); };
  const hasIntFilters = intGradeFilter !== 'all' || intGenderFilter !== 'all' || intAgeFilter !== 'all';

// Build column definitions: for each grade, each age bracket, M and F
  const cols: { grade:string; age:string; sex:'M'|'F' }[] = [];
  GRADES.forEach(g => {
    GRADE_BRACKETS[g].ages.forEach(a => {
      cols.push({ grade:g, age:a, sex:'M' });
      cols.push({ grade:g, age:a, sex:'F' });
    });
  });

  // Summary cols: per age bracket, M and F
  const sumCols: { bracket:string; sex:'M'|'F' }[] = [];
  SUMMARY_BRACKETS.forEach(b => {
    sumCols.push({ bracket:b, sex:'M' });
    sumCols.push({ bracket:b, sex:'F' });
  });

  const thBase = "text-center px-1 py-1 text-[9px] font-semibold border-r border-gray-200";
  const tdBase = "text-center px-1 py-1 font-mono border-r border-gray-100 text-[10px]";

  if (dohLoading) {
    return <div className="text-sm text-gray-500 p-8 text-center">Loading report data…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header — title left, controls right */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">DOH Consolidated Report &amp; Internal Reports</p>
        </div>
        <div className="doh-report-controls flex items-center gap-2 flex-shrink-0">
          <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium whitespace-nowrap">
            <Printer className="w-4 h-4" /> Print
          </button>
          {activeReportTab === 'doh' && (
            <button onClick={handleDownloadPdf} disabled={downloadingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium whitespace-nowrap">
              <Download className="w-4 h-4" /> {downloadingPdf ? 'Generating…' : 'Download PDF'}
            </button>
          )}
        </div>
      </div>
      {downloadError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{downloadError}</div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveReportTab('doh')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeReportTab==='doh' ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileSpreadsheet className="w-4 h-4" /> DOH Consolidated
        </button>
        <button onClick={() => setActiveReportTab('internal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeReportTab==='internal' ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileText className="w-4 h-4" /> Internal Reports
        </button>
      </div>

      {/* ── DOH CONSOLIDATED ── */}
      {activeReportTab === 'doh' && (
        <div className="space-y-3">
          {/* School filter — thin bar, doesn't scroll */}
          <div className="doh-report-controls flex items-center gap-3">
            <label className="text-sm text-gray-500 whitespace-nowrap">School:</label>
            <select value={reportSchool ?? ''} onChange={e => setReportSchool(e.target.value || null)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Schools</option>
              {REPORT_SCHOOLS.map(s => <option key={s} value={s}>{getSchoolShortName(s)}</option>)}
            </select>
          </div>

          {/* Table */}
          <div id="doh-report-printable" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* ref goes on the scrollable inner div, not the overflow-hidden outer
                one — html2canvas clips to the ref'd element's own rendered box,
                so ref'ing the outer div only captured the already-clipped width. */}
            <div ref={dohReportRef} className="overflow-x-auto">
              <table style={{borderCollapse:'collapse', fontSize:'10px', whiteSpace:'nowrap'}}>
                {/* ── TITLE ── */}
                <thead>
                  <tr>
                    <th colSpan={1 + cols.length*2 + sumCols.length*2 + 2}
                      className="text-center py-2 px-3 bg-gray-50 border-b border-gray-300 text-[11px] font-bold text-gray-900 uppercase tracking-wide">
                      DENTAL SECTION — CONSOLIDATED ORAL HEALTH STATUS AND SERVICE REPORT
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={1 + cols.length*2 + sumCols.length*2 + 2}
                      className="text-center py-1 px-3 bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500">
                      SCHOOL: {reportSchool ? getSchoolShortName(reportSchool) : 'All Schools'} &nbsp;·&nbsp;
                      MONTH: {MONTHS[reportMonth-1]} {reportYear}
                    </th>
                  </tr>

                  {/* ── ROW 1: GRADE HEADERS ── */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th rowSpan={3} className="sticky left-0 bg-gray-50 z-20 text-left px-2 py-1 border-r border-gray-300 text-[10px] font-semibold text-gray-600 min-w-[240px]">
                      Indicator
                    </th>
                    {GRADES.map(g => {
                      const bracketCount = GRADE_BRACKETS[g].ages.length;
                      // Each bracket has 2 sex cols + 2 total cols
                      const colSpanCount = bracketCount * 2 + 2;
                      return (
                        <th key={g} colSpan={colSpanCount}
                          className={`${thBase} bg-blue-50 text-blue-800 border-r-2 border-blue-200`}>
                          {GRADE_BRACKETS[g].label}
                        </th>
                      );
                    })}
                    <th colSpan={sumCols.length}
                      className={`${thBase} bg-purple-50 text-purple-800`}>
                      SUMMARY
                    </th>
                  </tr>

                  {/* ── ROW 2: AGE BRACKET HEADERS ── */}
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {GRADES.map(g =>
                      [...GRADE_BRACKETS[g].ages.map(a => (
                        <th key={g+a} colSpan={2}
                          className={`${thBase} text-gray-600 text-[8px]`}>
                          {a}
                        </th>
                      )),
                      <th key={g+'total'} colSpan={2}
                        className={`${thBase} text-blue-700 font-bold border-r-2 border-blue-200`}>
                        Total
                      </th>]
                    )}
                    {SUMMARY_BRACKETS.map(b => (
                      <th key={'sum'+b} colSpan={2}
                        className={`${thBase} text-purple-700 text-[8px]`}>
                        {b}
                      </th>
                    ))}
                  </tr>

                  {/* ── ROW 3: M/F HEADERS ── */}
                  <tr className="bg-gray-50 border-b-2 border-gray-300">
                    {GRADES.map(g =>
                      [...GRADE_BRACKETS[g].ages.flatMap(a => [
                        <th key={g+a+'M'} className={`${thBase} text-blue-600 w-6`}>M</th>,
                        <th key={g+a+'F'} className={`${thBase} text-pink-600 w-6`}>F</th>,
                      ]),
                      <th key={g+'totM'} className={`${thBase} text-blue-700 font-bold w-6`}>M</th>,
                      <th key={g+'totF'} className={`${thBase} text-pink-700 font-bold border-r-2 border-blue-200 w-6`}>F</th>]
                    )}
                    {SUMMARY_BRACKETS.flatMap(b => [
                      <th key={'sum'+b+'M'} className={`${thBase} text-blue-600 w-6`}>M</th>,
                      <th key={'sum'+b+'F'} className={`${thBase} text-pink-600 w-6`}>F</th>,
                    ])}
                  </tr>
                </thead>

                {/* ── BODY ── */}
                <tbody>
                  {DOH_ROWS.map((row, idx) => {
                    if (row.type === 'header') {
                      const restCols = cols.length*2 + GRADES.length*2 + sumCols.length;
                      return (
                        <tr key={idx} className="bg-blue-50 border-t border-b border-blue-200">
                          <td className="sticky left-0 z-10 px-3 py-1 font-bold text-blue-900 text-[10px] uppercase tracking-wide bg-blue-50 min-w-[240px]">
                            {row.label}
                          </td>
                          <td colSpan={restCols} className="bg-blue-50" />
                        </tr>
                      );
                    }

                    const isSub   = row.type === 'sub';
                    const field   = row.field;
                    const labelPadding = isSub ? 'pl-8 italic text-gray-400' : (row as any).indent ? 'pl-5 text-gray-700' : 'font-medium text-gray-800';

                    return (
                      <tr key={idx} className="group border-b border-gray-100 hover:bg-yellow-50 transition-colors">
                        {/* Label */}
                        <td className={`sticky left-0 bg-white group-hover:bg-yellow-50 border-r border-gray-200 px-2 py-0.5 text-[10px] transition-colors ${labelPadding} min-w-[240px]`}>
                          {row.label}
                        </td>

                        {/* Per grade per age bracket M/F + grade total M/F */}
                        {GRADES.map(g => {
                          const ages = GRADE_BRACKETS[g].ages;
                          const ageCells = ages.flatMap(a => {
                            const mv = V(g, a, 'M', field);
                            const fv = V(g, a, 'F', field);
                            return [
                              <td key={g+a+'M'} className={`${tdBase} text-gray-700 w-6`}>{cell(mv)}</td>,
                              <td key={g+a+'F'} className={`${tdBase} text-gray-700 w-6`}>{cell(fv)}</td>,
                            ];
                          });
                          const totM = ages.reduce((s,a) => s+V(g,a,'M',field),0);
                          const totF = ages.reduce((s,a) => s+V(g,a,'F',field),0);
                          return [
                            ...ageCells,
                            <td key={g+'totM'} className={`${tdBase} font-bold text-blue-700 w-6`}>{cell(totM)}</td>,
                            <td key={g+'totF'} className={`${tdBase} font-bold text-pink-700 border-r-2 border-blue-200 w-6`}>{cell(totF)}</td>,
                          ];
                        })}

                        {/* Summary columns */}
                        {SUMMARY_BRACKETS.flatMap(b => {
                          const mv = sumSummaryBracket(field,'M',b);
                          const fv = sumSummaryBracket(field,'F',b);
                          return [
                            <td key={'sum'+b+'M'} className={`${tdBase} text-purple-700 w-6`}>{cell(mv)}</td>,
                            <td key={'sum'+b+'F'} className={`${tdBase} text-purple-700 w-6`}>{cell(fv)}</td>,
                          ];
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
              <span>Prepared by: Dr. Maria Santos, Dentist · Barangay Tanyag Dental Clinic</span>
              <span>{MONTHS[reportMonth-1]} {reportYear}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERNAL REPORTS ── */}
      {activeReportTab === 'internal' && (
        <div className="space-y-4">
          {/* Section sub-tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([['treatment','Treatment Summary'],['conditions','Condition Summary'],['admin','Overview']] as const).map(([k,l]) => (
              <button key={k} onClick={() => setInternalSection(k)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${internalSection===k ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* ── TREATMENT SUMMARY ── */}
          {internalSection === 'treatment' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(['monthly','biannual','annual'] as const).map(p => (
                    <button key={p} onClick={() => setPeriodType(p)}
                      className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${periodType===p ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500'}`}>
                      {p === 'biannual' ? 'Bi-annual' : p}
                    </button>
                  ))}
                </div>
                <select value={intAgeFilter} onChange={e => { setIntAgeFilter(e.target.value); setIntGradeFilter('all'); }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Ages</option>
                  <option value="4 & below">4 & below</option>
                  <option value="5-9">5-9</option>
                  <option value="10-14">10-14</option>
                  <option value="15-19">15-19</option>
                  <option value="20 & above">20 & above</option>
                </select>
                <select value={intGradeFilter} onChange={e => { setIntGradeFilter(e.target.value); setIntAgeFilter('all'); }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Grades</option>
                  {ALL_GRADES_INT.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={intGenderFilter} onChange={e => setIntGenderFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Genders</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
                {hasIntFilters && (
                  <button onClick={clearIntFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto">{MONTHS[reportMonth-1]} {reportYear}{periodType==='biannual'?' (6-month period)':periodType==='annual'?' (full year)':''}</span>
              </div>

              {/* Summary cards */}
              {(() => {
                const totals = PROCEDURES.map(p => cnt(treatmentMatrix, p, intGenderFilter));
                const grandTotal = totals.reduce((a,b) => a+b, 0);
                const topIdx = totals.indexOf(Math.max(...totals));
                // With no real per-procedure breakdown, every total is 0 --
                // indexOf(max) would misleadingly point at PROCEDURES[0] as
                // if it were genuinely "most common". Only claim a most-
                // common procedure when there's real data behind it.
                const mostCommon = grandTotal > 0 ? PROCEDURES[topIdx] : 'N/A';
                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label:'Total Procedures', value: grandTotal, color:'text-blue-700 bg-blue-50 border-blue-200' },
                      { label:'Most Common', value: mostCommon, color:'text-green-700 bg-green-50 border-green-200', small: true },
                      { label:'Sessions', value: mockSessions.length, color:'text-cyan-700 bg-cyan-50 border-cyan-200' },
                      { label:'Students Treated', value: realTreatmentCount, color:'text-purple-700 bg-purple-50 border-purple-200' },
                    ].map((c,i) => (
                      <div key={i} className={`rounded-xl border p-4 ${c.color}`}>
                        <div className={`font-bold mt-1 ${(c as any).small ? 'text-sm' : 'text-2xl'}`}>{c.value}</div>
                        <div className="text-xs mt-0.5 opacity-70">{c.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Procedures Performed</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={PROCEDURES.map(p => ({ name: p, count: cnt(treatmentMatrix, p, intGenderFilter) }))}
                    margin={{top:4,right:8,bottom:40,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fontSize:10}} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" fill="#1E40AF" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Procedure Counts</h3>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                    <Printer className="w-3 h-3" /> Print
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Procedure</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-blue-500 uppercase tracking-wide text-[10px]">Male</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-pink-500 uppercase tracking-wide text-[10px]">Female</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wide text-[10px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {PROCEDURES.map(p => {
                      const m = cnt(treatmentMatrix, p, 'M');
                      const f = cnt(treatmentMatrix, p, 'F');
                      const t = m + f;
                      return (
                        <tr key={p} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{p}</td>
                          <td className="px-4 py-2.5 text-center text-blue-700">{m}</td>
                          <td className="px-4 py-2.5 text-center text-pink-700">{f}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-gray-900">{t}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 border-t-2 border-gray-300">
                      <td className="px-4 py-2.5 font-bold text-gray-900">TOTAL</td>
                      <td className="px-4 py-2.5 text-center font-bold text-blue-700">{PROCEDURES.reduce((s,p)=>s+cnt(treatmentMatrix,p,'M'),0)}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-pink-700">{PROCEDURES.reduce((s,p)=>s+cnt(treatmentMatrix,p,'F'),0)}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-900">{PROCEDURES.reduce((s,p)=>s+cnt(treatmentMatrix,p,'all'),0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CONDITION SUMMARY ── */}
          {internalSection === 'conditions' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
                <select value={intAgeFilter} onChange={e => { setIntAgeFilter(e.target.value); setIntGradeFilter('all'); }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Ages</option>
                  <option value="4 & below">4 & below</option>
                  <option value="5-9">5-9</option>
                  <option value="10-14">10-14</option>
                  <option value="15-19">15-19</option>
                  <option value="20 & above">20 & above</option>
                </select>
                <select value={intGradeFilter} onChange={e => { setIntGradeFilter(e.target.value); setIntAgeFilter('all'); }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Grades</option>
                  {ALL_GRADES_INT.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={intGenderFilter} onChange={e => setIntGenderFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Genders</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
                {hasIntFilters && (
                  <button onClick={clearIntFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              {/* Summary cards */}
              {(() => {
                const orallyFit = cnt(conditionMatrix,'Orally Fit',intGenderFilter);
                const cariesP   = cnt(conditionMatrix,'Caries (Primary)',intGenderFilter);
                const cariesPerm= cnt(conditionMatrix,'Caries (Permanent)',intGenderFilter);
                const gingivitis= cnt(conditionMatrix,'Gingivitis',intGenderFilter);
                return (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label:'Orally Fit',          value: orallyFit,          color:'text-green-700 bg-green-50 border-green-200' },
                      { label:'Caries (Primary)',     value: cariesP,            color:'text-red-700 bg-red-50 border-red-200' },
                      { label:'Caries (Permanent)',   value: cariesPerm,         color:'text-orange-700 bg-orange-50 border-orange-200' },
                      { label:'Gingivitis',           value: gingivitis,         color:'text-yellow-700 bg-yellow-50 border-yellow-200' },
                    ].map((c,i) => (
                      <div key={i} className={`rounded-xl border p-4 ${c.color}`}>
                        <div className="text-2xl font-bold mt-1">{c.value}</div>
                        <div className="text-xs mt-0.5 opacity-70">{c.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Condition Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={CONDITIONS.map(c => ({ name: c, count: cnt(conditionMatrix, c, intGenderFilter) }))}
                    margin={{top:4,right:8,bottom:36,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fontSize:10}} angle={-20} textAnchor="end" interval={0} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" fill="#0D9488" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table — by grade */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Condition Counts by Grade</h3>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                    <Printer className="w-3 h-3" /> Print
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px] sticky left-0 bg-gray-50">Condition</th>
                        {displayGrades.map(g => <th key={g} className="text-center px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">{g}</th>)}
                        <th className="text-center px-4 py-2.5 font-semibold text-gray-700 uppercase tracking-wide text-[10px]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {CONDITIONS.map(cond => (
                        <tr key={cond} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800 sticky left-0 bg-white">{cond}</td>
                          {displayGrades.map(g => (
                            <td key={g} className="px-3 py-2.5 text-center text-gray-700">{getCount(conditionMatrix, cond, g, intGenderFilter)}</td>
                          ))}
                          <td className="px-4 py-2.5 text-center font-bold text-gray-900">{cnt(conditionMatrix, cond, intGenderFilter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ADMIN ── */}
          {internalSection === 'admin' && (
            <div className="space-y-4">
              {/* Quick Stats + Consent */}
              {(() => {
                const highRisk = realStudents.filter((s) => s.riskLevel === 'High').length;
                const mediumRisk = realStudents.filter((s) => s.riskLevel === 'Medium').length;
                const consentBySchool = REPORT_SCHOOLS.map((school) => {
                  const inSchool = realStudents.filter((s) => s.school === school);
                  const complete = inSchool.filter((s) => s.consentStatus === 'complete').length;
                  return { school, complete, total: inSchool.length };
                });
                const totalComplete = realStudents.filter((s) => s.consentStatus === 'complete').length;
                const totalPending = realStudents.filter((s) => s.consentStatus === 'pending').length;
                return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label:'High Risk Students',   value: highRisk,  color:'red',   Icon:AlertTriangle },
                      { label:'Medium Risk Students', value: mediumRisk,  color:'amber', Icon:AlertCircle   },
                      { label:'Sessions This Month',  value: 0,  color:'blue',  Icon:Calendar      },
                      { label:'Students Treated',     value: realTreatmentCount, color:'green', Icon:Users         },
                    ].map(s => (
                      <div key={s.label} className={`bg-${s.color}-50 rounded-xl p-4`}>
                        <s.Icon className={`w-5 h-5 text-${s.color}-600 mb-2`} />
                        <div className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</div>
                        <div className={`text-xs text-${s.color}-600 mt-0.5`}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Consent Compliance by School</h3>
                  <div className="space-y-4">
                    {consentBySchool.map((s, i) => {
                      const pct = s.total ? Math.round((s.complete/s.total)*100) : 0;
                      const color = ['#1E40AF', '#0D9488', '#EA580C'][i % 3];
                      return (
                        <div key={s.school}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{getSchoolShortName(s.school)}</span>
                            <span className="text-xs font-bold" style={{color}}>{s.complete}/{s.total} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:color}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center text-xs">
                    <div><div className="text-base font-bold text-green-600">{totalComplete}</div><div className="text-gray-400">Complete</div></div>
                    <div><div className="text-base font-bold text-yellow-600">{totalPending}</div><div className="text-gray-400">Pending</div></div>
                  </div>
                </div>
              </div>
                );
              })()}

              {/* Treatment Sessions */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Treatment Sessions</h3>
                  <span className="text-xs text-gray-400">{mockSessions.length} sessions recorded</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Date','School','Grade / Section','Students','Treated','Procedures'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mockSessions.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No treatment sessions recorded yet.</td></tr>
                      ) : mockSessions.map((s, i) => {
                        const pct = Math.round((s.treated / s.students) * 100);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{s.date}</td>
                            <td className="px-4 py-2.5 text-gray-600 max-w-[140px] truncate">{getSchoolShortName(s.school)}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 font-medium text-gray-900">
                                <GradePill grade={s.grade} />
                                <span>{s.section}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">{s.students}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-gray-900">{s.treated}</span>
                              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pct===100?'bg-green-100 text-green-700':pct>=80?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{pct}%</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {s.procedures.map((p, pi) => <span key={pi} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">{p}</span>)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Referral Tracking */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Referral Tracking</h3>
                  <span className="text-xs text-gray-400">{mockReferrals.length} referrals issued</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Student','School','Grade','Date Issued','Facility','Reason','Follow-up','Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mockReferrals.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No referrals recorded yet.</td></tr>
                      ) : mockReferrals.map((r, i) => (
                        <>
                        <tr key={i} onClick={() => setExpandedReferral(expandedReferral === i ? null : i)}
                          className="hover:bg-orange-50/40 cursor-pointer select-none">
                          <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{r.student}</td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-[120px] truncate">{getSchoolShortName(r.school)}</td>
                          <td className="px-4 py-2.5">
                            <GradePill grade={r.grade} />
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.date}</td>
                          <td className="px-4 py-2.5 text-gray-600">{r.facility}</td>
                          <td className="px-4 py-2.5 text-gray-600 max-w-[160px] truncate">{r.reason}</td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.followUp}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full font-semibold capitalize text-[10px] ${r.status==='completed'?'bg-green-100 text-green-700':r.status==='no-show'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                          </td>
                        </tr>
                        {expandedReferral === i && (
                          <tr key={`${i}-detail`} className="bg-orange-50/60">
                            <td colSpan={8} className="px-6 py-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div><span className="font-semibold text-gray-600 block mb-0.5">Full Reason</span><span className="text-gray-800">{r.reason}</span></div>
                                <div><span className="font-semibold text-gray-600 block mb-0.5">Referred To</span><span className="text-gray-800">{r.facility}</span></div>
                                <div><span className="font-semibold text-gray-600 block mb-0.5">School</span><span className="text-gray-800">{r.school}</span></div>
                                <div><span className="font-semibold text-gray-600 block mb-0.5">Date Issued</span><span className="text-gray-800">{r.date}</span></div>
                                <div><span className="font-semibold text-gray-600 block mb-0.5">Expected Follow-up</span><span className="text-gray-800">{r.followUp || '—'}</span></div>
                                <div><span className="font-semibold text-gray-600 block mb-0.5">Status</span>
                                  <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${r.status==='completed'?'bg-green-100 text-green-700':r.status==='no-show'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
