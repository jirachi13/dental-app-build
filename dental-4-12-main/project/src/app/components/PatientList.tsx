import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Plus, Eye, FileText, X, School as SchoolIcon, List, ChevronRight, Users, Upload, CheckCircle, AlertCircle, ScanLine, Download } from 'lucide-react';
import { exportToCsv, type ExportColumn } from '../utils/exportCsv';
import { exportToXlsx } from '../utils/exportXlsx';
import { ExportMenu, type ExportFormat } from './ExportMenu';
import { toLocalDateString } from '../utils/localDate';
import { OCR_CONFIDENCE_THRESHOLD, type IptrOcrFieldKey } from '../utils/iptrOcrShared';
import { getGradeColor } from '../utils/gradeColors';
import { formatStudentName } from '../utils/formatStudentName';
import { getSchoolColor, getSchoolShortName } from '../utils/schoolColors';
import { GradePill } from './GradePill';
import { SkeletonPageHeader, SkeletonTable } from './Skeleton';
import { useToast } from './Toast';
import { activatable } from '../utils/a11y';
import { GradeTableCell } from './GradeTableCell';
import { ListSearchInput } from './ListSearchInput';
import { studentListTableStyles } from './StudentListTableStyles';
import { addQueuedStudentId, getQueuedStudentIds, removeQueuedStudentId, setQueuedStudentIds as persistQueuedStudentIds } from '../utils/queueStorage';
import { useStudents } from '../hooks/useStudents';
import { apiClient, ApiError } from '../api/client';
import type { ApiSchool } from '../api/types';

const SCHOOLS = [
  'Bagong Tanyag Integrated School',
  'Bagong Tanyag Elementary School Annex A',
  'South Daang Hari Elementary School Main',
];
const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];


export const PatientList = () => {
  const navigate = useNavigate();
  const { user, selectedSchool } = useAuth();
  const toast = useToast();
  const canAddStudent = user?.role === 'dentist' || user?.role === 'dental_aide';



  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // List view filters
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ firstName:'', lastName:'', middleName:'', birthdate:'', gender:'', grade:'', section:'', school:'', guardianName:'', guardianContact:'', address:'', contactNumber:'', philhealthNumber:'', philhealthStatus:'None', is4Ps:false, fourPsId:'', consentStatus:'pending' });
  const [addPatientError, setAddPatientError] = useState<string | null>(null);
  const [addingPatient, setAddingPatient] = useState(false);
  const [schools, setSchools] = useState<ApiSchool[]>([]);
  const [showOcrUpload, setShowOcrUpload] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrConfidences, setOcrConfidences] = useState<Partial<Record<IptrOcrFieldKey, number>>>({});
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkStep, setBulkStep] = useState<'upload'|'preview'|'done'>('upload');
  const [queuedStudentIds, setQueuedStudentIds] = useState<string[]>(() => getQueuedStudentIds());
  // tick-box selection for queueing several students at once
  const [tickedIds, setTickedIds] = useState<Set<string>>(new Set());

  const toggleTicked = (id: string) => {
    setTickedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const queueTicked = () => {
    const merged = [...new Set([...getQueuedStudentIds(), ...tickedIds])];
    persistQueuedStudentIds(merged);
    setQueuedStudentIds(merged);
    setTickedIds(new Set());
  };

  const unqueueTicked = () => {
    const next = getQueuedStudentIds().filter(id => !tickedIds.has(id));
    persistQueuedStudentIds(next);
    setQueuedStudentIds(next);
    setTickedIds(new Set());
  };

  // when every ticked student is already queued the bulk action flips to
  // unqueue; otherwise (none or mixed) it queues them all
  const allTickedQueued = tickedIds.size > 0 && [...tickedIds].every(id => queuedStudentIds.includes(id));

  const calculateAge = (birthdate: string) => {
    const today = new Date(); const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getAgeGroup = (age: number | null) => {
    if (age === null) return 'Unknown';
    if (age <= 4) return '4 & below';
    if (age <= 9) return '5-9';
    if (age <= 14) return '10-14';
    if (age <= 19) return '15-19';
    return '20 & above';
  };

  const { students: allStudents, loading: studentsLoading, reload: reloadStudents } = useStudents();

  useEffect(() => {
    apiClient.get<ApiSchool[]>('/schools').then(setSchools).catch(() => {});
  }, []);

  const handleAddStudent = async () => {
    setAddPatientError(null);
    // birthdate/gender/address/section are all required on the backend
    // (Student model) and already marked with * in this form's labels, but
    // weren't actually enforced here -- a student could be submitted
    // without them, either failing with a raw Mongoose validation error
    // message online, or (worse) queuing successfully offline and only
    // failing to sync later with a confusing 400 -- instead of being
    // caught at entry time like the other required fields already were.
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.school || !newPatient.grade
      || !newPatient.birthdate || !newPatient.gender || !newPatient.address || !newPatient.section) {
      setAddPatientError('Please fill in all required fields.');
      return;
    }
    const school = schools.find((s) => s.school_name === newPatient.school);
    if (!school) {
      setAddPatientError('Selected school not found.');
      return;
    }
    setAddingPatient(true);
    try {
      const full_name = [newPatient.firstName, newPatient.middleName, newPatient.lastName].filter(Boolean).join(' ');
      await apiClient.post('/students', {
        school_id: school._id,
        full_name,
        birthday: newPatient.birthdate,
        sex: newPatient.gender,
        address: newPatient.address,
        contact_number: newPatient.contactNumber,
        grade_level: newPatient.grade,
        section: newPatient.section,
        guardian_name: newPatient.guardianName,
        guardian_contact: newPatient.guardianContact,
        philhealth_number: newPatient.philhealthNumber,
        philhealth_status: newPatient.philhealthStatus,
        is_4ps: newPatient.is4Ps,
        fourps_id: newPatient.fourPsId,
        consent_status: newPatient.consentStatus,
      });
      await reloadStudents();
      toast.success(`Student added: ${newPatient.lastName}, ${newPatient.firstName}`);
      setShowAddForm(false);
      setNewPatient({ firstName:'', lastName:'', middleName:'', birthdate:'', gender:'', grade:'', section:'', school:'', guardianName:'', guardianContact:'', address:'', contactNumber:'', philhealthNumber:'', philhealthStatus:'None', is4Ps:false, fourPsId:'', consentStatus:'pending' });
      setOcrConfidences({});
    } catch (err) {
      setAddPatientError(err instanceof ApiError ? err.message : 'Failed to add student');
    } finally {
      setAddingPatient(false);
    }
  };

  const handleOcrFile = async (file: File) => {
    setOcrError(null);
    setOcrProcessing(true);
    setOcrProgress(0);
    try {
      // Dynamic import keeps tesseract.js + pdfjs-dist (~1.5MB) out of the
      // main bundle — only staff who actually scan a form download them
      const { extractIptrFields } = await import('../utils/iptrOcr');
      const result = await extractIptrFields(file, setOcrProgress);
      setNewPatient((prev) => ({
        ...prev,
        firstName: result.fields.firstName ?? prev.firstName,
        middleName: result.fields.middleName ?? prev.middleName,
        lastName: result.fields.lastName ?? prev.lastName,
        birthdate: result.fields.birthdate ?? prev.birthdate,
        gender: result.fields.gender ?? prev.gender,
        address: result.fields.address ?? prev.address,
        contactNumber: result.fields.contactNumber ?? prev.contactNumber,
        grade: result.fields.grade ?? prev.grade,
        section: result.fields.section ?? prev.section,
      }));
      setOcrConfidences(result.confidences);
      setShowOcrUpload(false);
      setShowAddForm(true);
    } catch {
      setOcrError('Could not read the image. Try a clearer photo or enter details manually.');
    } finally {
      setOcrProcessing(false);
    }
  };

  const ocrFieldClass = (key: IptrOcrFieldKey) => {
    const conf = ocrConfidences[key];
    if (conf === undefined) return 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
    return conf < OCR_CONFIDENCE_THRESHOLD
      ? 'w-full border-2 border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500'
      : 'w-full border border-green-300 bg-green-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  };

  const ocrHint = (key: IptrOcrFieldKey) => {
    const conf = ocrConfidences[key];
    if (conf === undefined) return null;
    return conf < OCR_CONFIDENCE_THRESHOLD
      ? <span className="text-xs text-yellow-700 ml-1">⚠ scanned, please verify ({conf}%)</span>
      : <span className="text-xs text-green-700 ml-1">✓ scanned ({conf}%)</span>;
  };

  // Filter by selected school context
  const schoolStudents = selectedSchool
    ? allStudents.filter(s => s.school === selectedSchool)
    : allStudents;

  // School view computed data
  const schoolData = [selectedSchool].filter(Boolean).map(school => {
    const students = schoolStudents.filter(s => s.school === school);
    const grades = [...new Set(students.map(s => s.grade))].sort();
    return { name: school, count: students.length, grades };
  });

  const gradesForSchool = selectedSchool
    ? [...new Set(allStudents.filter(s => s.school === selectedSchool).map(s => s.grade))].sort()
    : [];

  const sectionsForGrade = (selectedGrade)
    ? [...new Set(schoolStudents.filter(s => s.grade === selectedGrade).map(s => s.section))].sort()
    : [];

  const studentsForSection = (selectedGrade && selectedSection)
    ? schoolStudents.filter(s => s.grade === selectedGrade && s.section === selectedSection)
    : [];

  // List view filtered
  const allSections = useMemo(() => {
    let base = gradeFilter !== 'all' ? schoolStudents.filter(s => s.grade === gradeFilter) : schoolStudents;
    return [...new Set(base.map(s => s.section))].sort();
  }, [gradeFilter]);

  const filtered = useMemo(() => schoolStudents.filter(s => {
    const age = calculateAge(s.birthdate);
    const ag = getAgeGroup(age);
    if (gradeFilter !== 'all' && s.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && s.section !== sectionFilter) return false;
    if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
    if (ageGroupFilter !== 'all' && ag !== ageGroupFilter) return false;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const formattedName = formatStudentName(s.name).toLowerCase();
      if (!formattedName.includes(query) && !s.grade.toLowerCase().includes(query) && !s.section.toLowerCase().includes(query)) return false;
    }
    return true;
  // schoolStudents was missing from this dependency array -- filtered went
  // stale (kept showing old data) whenever the underlying student list
  // changed for any reason (new pending offline write merged in, a reload
  // after sync, even switching schools) unless a filter dropdown was also
  // touched, since that was the only thing that could trigger a recompute.
  }), [schoolStudents, gradeFilter, sectionFilter, genderFilter, ageGroupFilter, searchTerm]);

  const hasActiveFilters = gradeFilter !== 'all' || sectionFilter !== 'all' || genderFilter !== 'all' || ageGroupFilter !== 'all' || searchTerm !== '';

  const clearFilters = () => {
    setGradeFilter('all'); setSectionFilter('all');
    setGenderFilter('all'); setAgeGroupFilter('all'); setSearchTerm('');
  };

  // Exports exactly what's currently visible (respects active filters) --
  // excludes not-yet-synced offline rows since they don't have a real ID yet.
  const handleExport = (format: ExportFormat) => {
    const rows = filtered.filter((s) => !s.pending);
    const columns: ExportColumn<(typeof rows)[number]>[] = [
      { label: 'Name', value: (s) => formatStudentName(s.name) },
      { label: 'Birthdate', value: (s) => s.birthdate },
      { label: 'Gender', value: (s) => s.gender },
      { label: 'Grade', value: (s) => s.grade },
      { label: 'Section', value: (s) => s.section },
      { label: 'School', value: (s) => s.school },
      { label: 'Risk Level', value: (s) => s.riskLevel ?? 'Not Screened' },
      { label: 'Oral Status', value: (s) => s.oralStatus },
      { label: 'Last Visit', value: (s) => s.lastVisit?.slice(0, 10) ?? '' },
      { label: 'Consent Status', value: (s) => s.consentStatus },
    ];
    const base = `students_${toLocalDateString(new Date())}`;
    if (format === 'xlsx') void exportToXlsx(rows, columns, `${base}.xlsx`, 'Students');
    else exportToCsv(rows, columns, `${base}.csv`);
  };

  const riskBadge = (level: string) => {
    const c: Record<string,string> = { 'High':'bg-red-100 text-red-800', 'Medium':'bg-yellow-100 text-yellow-800', 'Low':'bg-green-100 text-green-800' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c[level]||'bg-gray-100 text-gray-700'}`}>{level}</span>;
  };

  const statusBadge = (status: string) => {
    const c: Record<string,string> = { 'Orally Fit':'bg-green-100 text-green-800', 'Needs Treatment':'bg-red-100 text-red-800', 'Under Treatment':'bg-blue-100 text-blue-800', 'Needs Follow-up':'bg-yellow-100 text-yellow-800' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c[status]||'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  const FilterSelect = ({ value, onChange, options, label }: { value: string; onChange: (v:string) => void; options: {value:string;label:string}[]; label: string }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="all">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const SchoolCard = ({ school, count, onClick }: { school: string; count: number; onClick: () => void }) => {
    const sc = getSchoolColor(school);
    return (
      <button onClick={onClick} style={{ borderColor: sc.border }} className="w-full text-left bg-white rounded-xl border-2 p-5 hover:shadow-md transition-all group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: sc.light }} className="w-10 h-10 rounded-lg flex items-center justify-center">
              <SchoolIcon style={{ color: sc.solid }} className="w-5 h-5" />
            </div>
            <div>
              <div style={{ color: sc.text }} className="font-bold text-sm">{school}</div>
              <div className="text-xs text-gray-500 mt-0.5">{count} students enrolled</div>
            </div>
          </div>
          <ChevronRight style={{ color: sc.solid }} className="w-5 h-5 transition-colors" />
        </div>
        <div style={{ backgroundColor: sc.light, color: sc.text }} className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold">
          {getSchoolShortName(school)}
        </div>
      </button>
    );
  };

  const Breadcrumb = () => {
    if (!selectedGrade && !selectedSection) return null;
    return (
      <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <button onClick={() => { setSelectedGrade(null); setSelectedSection(null); }} className="hover:text-[#1E40AF]">All Schools</button>
        {selectedGrade && <><ChevronRight className="w-4 h-4" /><button onClick={() => { setSelectedGrade(null); setSelectedSection(null); }} style={{ color: selectedSchool ? getSchoolColor(selectedSchool).solid : undefined }} className="truncate max-w-[160px] font-medium">{selectedSchool ? getSchoolShortName(selectedSchool) : ''}</button></>}
        {selectedGrade && <><ChevronRight className="w-4 h-4" /><button onClick={() => setSelectedSection(null)} className="hover:text-[#1E40AF]"><GradePill grade={selectedGrade} /></button></>}
        {selectedSection && <><ChevronRight className="w-4 h-4" /><span className="text-gray-900 font-medium">{selectedSection}</span></>}
      </div>
    );
  };

  if (studentsLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading students">
        <SkeletonPageHeader />
        <SkeletonTable rows={7} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">{schoolStudents.length} students{selectedSchool ? '' : ' across 3 schools'}</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportMenu onExport={handleExport} />
{canAddStudent && (
            <>
              <button onClick={() => { setOcrError(null); setShowOcrUpload(true); }} className="flex items-center gap-2 px-4 py-2 border border-[#1E40AF] text-[#1E40AF] rounded-lg hover:bg-blue-50 text-sm font-medium">
                <ScanLine className="w-4 h-4" /> Scan IPTR Form
              </button>
              <button onClick={() => { setOcrConfidences({}); setShowAddForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Student
              </button>
            </>
          )}
        </div>
      </div>


      {/* LIST VIEW */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <ListSearchInput value={searchTerm} onChange={setSearchTerm} />
              <FilterSelect value={gradeFilter} onChange={v => { setGradeFilter(v); setSectionFilter('all'); }} label="All Grades"
                options={GRADES.map(g => ({ value: g, label: g }))} />
              <FilterSelect value={sectionFilter} onChange={setSectionFilter} label="All Sections"
                options={allSections.map(s => ({ value: s, label: s }))} />
              <FilterSelect value={genderFilter} onChange={setGenderFilter} label="All Genders"
                options={[{ value:'Male', label:'Male' }, { value:'Female', label:'Female' }]} />
              <FilterSelect value={ageGroupFilter} onChange={setAgeGroupFilter} label="All Age Groups"
                options={[{ value:'4 & below', label:'4 & below' }, { value:'5-9', label:'5-9' }, { value:'10-14', label:'10-14' }, { value:'15-19', label:'15-19' }, { value:'20 & above', label:'20 & above' }]} />
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                  <X className="w-3 h-3" /> Clear All
                </button>
              )}
              {tickedIds.size > 0 && (
                <button
                  onClick={allTickedQueued ? unqueueTicked : queueTicked}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg ml-auto ${allTickedQueued ? 'text-[#1E40AF] border border-[#1E40AF] hover:bg-blue-50' : 'text-white bg-[#1E40AF] hover:bg-blue-700'}`}
                >
                  {allTickedQueued ? 'Unqueue' : 'Queue'} Selected ({tickedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className={studentListTableStyles.wrapper}>
            <div className={studentListTableStyles.scroller}>
              <table className={studentListTableStyles.table}>
                <thead className={studentListTableStyles.head}>
                  <tr>
                    <th className={studentListTableStyles.headerCell}>
                      <input
                        type="checkbox"
                        aria-label="Select all visible students for queueing"
                        checked={filtered.length > 0 && filtered.every(s => s.pending || tickedIds.has(s.id))}
                        onChange={(e) => {
                          if (e.target.checked) setTickedIds(new Set(filtered.filter(s => !s.pending).map(s => s.id)));
                          else setTickedIds(new Set());
                        }}
                        className="w-4 h-4 accent-[#1E40AF] align-middle"
                      />
                    </th>
                    <th className={studentListTableStyles.headerCell}>Student</th>
                    <th className={studentListTableStyles.headerCell}>Grade</th>
                    <th className={studentListTableStyles.headerCell}>Section</th>
                    <th className={studentListTableStyles.headerCell}>Gender</th>
                    <th className={studentListTableStyles.headerCell}>Age</th>
                    <th className={studentListTableStyles.headerCell}>Actions</th>
                  </tr>
                </thead>
                <tbody className={studentListTableStyles.body}>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className={studentListTableStyles.emptyCell}>{hasActiveFilters ? <>No students match your filters. <button onClick={clearFilters} className="text-[#1E40AF] hover:underline font-medium">Clear filters</button></> : 'No students at this school yet — use Add Student to register one.'}</td></tr>
                  ) : filtered.map(student => {
                    const age = calculateAge(student.birthdate);
                    const isQueued = queuedStudentIds.includes(student.id);
                    return (
                      <tr key={student.id} {...activatable(() => { if (!student.pending) navigate(`/dental-chart/${student.id}?tab=history`); })} className={`${studentListTableStyles.row} ${student.pending ? 'opacity-70' : ''}`}>
                        <td className={studentListTableStyles.secondaryCell} onClick={(e) => e.stopPropagation()}>
                          {!student.pending && (
                            <input
                              type="checkbox"
                              aria-label={`Select ${formatStudentName(student.name)} for queueing`}
                              checked={tickedIds.has(student.id)}
                              onChange={() => toggleTicked(student.id)}
                              className="w-4 h-4 accent-[#1E40AF] align-middle"
                            />
                          )}
                        </td>
                        <td className={studentListTableStyles.primaryCell}>
                          {formatStudentName(student.name)}
                          {student.pending && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">Pending sync</span>
                          )}
                        </td>
                        <GradeTableCell grade={student.grade} />
                        <td className={studentListTableStyles.secondaryCell}>{student.section}</td>
                        <td className={studentListTableStyles.secondaryCell}>{student.gender}</td>
                        <td className={studentListTableStyles.secondaryCell}>{age ?? '—'}</td>
                        <td className={studentListTableStyles.secondaryCell}>
                          {!student.pending && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQueuedStudentIds(
                                  isQueued ? removeQueuedStudentId(student.id) : addQueuedStudentId(student.id)
                                );
                              }}
                              title={isQueued ? 'Remove from charting queue' : 'Add to charting queue'}
                              className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                                isQueued
                                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              {isQueued ? 'Queued ✓' : 'Queue for Charting'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className={studentListTableStyles.footer}>
                Showing {filtered.length} of {schoolStudents.length} students{selectedSchool ? ` at ${getSchoolShortName(selectedSchool)}` : ''}
              </div>
            )}
          </div>
        </div>

      {/* Scan IPTR Form Modal */}
      {showOcrUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Scan IPTR Form</h2>
              <button onClick={() => setShowOcrUpload(false)} className="text-gray-500 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                Upload a clear photo, scan (JPG/PNG), or PDF of the paper IPTR form. Name, birthday, age, sex, address, contact number, grade level, and section will be extracted automatically — you'll review and correct before saving.
              </div>
              {!ocrProcessing ? (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('ocr-file-input')?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleOcrFile(file); }}
                >
                  <ScanLine className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Drop IPTR image here</p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                  <input id="ocr-file-input" type="file" accept="image/png,image/jpeg,image/jpg,application/pdf" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleOcrFile(e.target.files[0]); }} />
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1E40AF] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Scanning form… {ocrProgress}%</p>
                </div>
              )}
              {ocrError && <p className="text-sm text-red-600">{ocrError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Add New Student</h2>
              <button onClick={() => { setShowAddForm(false); setOcrConfidences({}); }} className="text-gray-500 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {Object.keys(ocrConfidences).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                  <ScanLine className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Pre-filled from scanned IPTR form. Fields outlined in yellow had low scan confidence — double-check them before saving.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name * {ocrHint('lastName')}</label><input type="text" value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} className={ocrFieldClass('lastName')} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name * {ocrHint('firstName')}</label><input type="text" value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} className={ocrFieldClass('firstName')} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Middle Name {ocrHint('middleName')}</label><input type="text" value={newPatient.middleName} onChange={e => setNewPatient({...newPatient, middleName: e.target.value})} className={ocrFieldClass('middleName')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Birthdate * {ocrHint('birthdate')}</label><input type="date" value={newPatient.birthdate} onChange={e => setNewPatient({...newPatient, birthdate: e.target.value})} className={ocrFieldClass('birthdate')} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender * {ocrHint('gender')}</label><select value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value})} className={ocrFieldClass('gender')}><option value="">Select</option><option>Male</option><option>Female</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">School *</label><select value={newPatient.school} onChange={e => setNewPatient({...newPatient, school: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select School</option>{SCHOOLS.map(s => <option key={s}>{s}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Grade * {ocrHint('grade')}</label><select value={newPatient.grade} onChange={e => setNewPatient({...newPatient, grade: e.target.value})} className={ocrFieldClass('grade')}><option value="">Select Grade</option>{GRADES.map(g => <option key={g}>{g}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Section * {ocrHint('section')}</label><input type="text" value={newPatient.section} onChange={e => setNewPatient({...newPatient, section: e.target.value})} placeholder="e.g. Sampaguita" className={ocrFieldClass('section')} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Number {ocrHint('contactNumber')}</label><input type="text" value={newPatient.contactNumber} onChange={e => setNewPatient({...newPatient, contactNumber: e.target.value})} placeholder="09XX-XXX-XXXX" className={ocrFieldClass('contactNumber')} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name *</label><input type="text" value={newPatient.guardianName} onChange={e => setNewPatient({...newPatient, guardianName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Guardian Contact</label><input type="text" value={newPatient.guardianContact} onChange={e => setNewPatient({...newPatient, guardianContact: e.target.value})} placeholder="09XX-XXX-XXXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">PhilHealth Number</label><input type="text" value={newPatient.philhealthNumber} onChange={e => setNewPatient({...newPatient, philhealthNumber: e.target.value})} placeholder="XX-XXXXXXXXX-X" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">PhilHealth Status</label><select value={newPatient.philhealthStatus} onChange={e => setNewPatient({...newPatient, philhealthStatus: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="None">None</option><option value="Principal">Principal</option><option value="Dependent">Dependent</option></select></div>
              <div className="flex items-center gap-3 pt-2"><input type="checkbox" id="is4ps" checked={newPatient.is4Ps} onChange={e => setNewPatient({...newPatient, is4Ps: e.target.checked})} className="w-4 h-4 rounded accent-blue-600" /><label htmlFor="is4ps" className="text-sm font-medium text-gray-700">4Ps / NHTS Member</label></div>
              {newPatient.is4Ps && <div><label className="block text-sm font-medium text-gray-700 mb-1">4Ps ID</label><input type="text" value={newPatient.fourPsId} onChange={e => setNewPatient({...newPatient, fourPsId: e.target.value})} placeholder="4PS-XXXXXXXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address {ocrHint('address')}</label><input type="text" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} className={ocrFieldClass('address')} /></div>
              {addPatientError && <p className="text-sm text-red-600">{addPatientError}</p>}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => { setShowAddForm(false); setOcrConfidences({}); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
              <button onClick={handleAddStudent} disabled={addingPatient} className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium">{addingPatient ? 'Adding…' : 'Add Student'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD MODAL ── */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Bulk Upload Students</h2>
              <button onClick={() => { setShowBulkUpload(false); setBulkStep('upload'); setBulkPreview([]); setBulkFile(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              {bulkStep === 'upload' && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    Upload a CSV or Excel file. Required columns: <strong>Last Name, First Name, Sex, Grade Level, Section</strong>. Optional: Middle Name, Birthday, Address, Contact Number.
                  </div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('bulk-file-input')?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) { setBulkFile(file); }
                    }}
                  >
                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">{bulkFile ? bulkFile.name : 'Drop CSV / Excel file here'}</p>
                    <p className="text-xs text-gray-500 mt-1">{bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : 'or click to browse'}</p>
                    <input id="bulk-file-input" type="file" accept=".csv,.xlsx,.xls" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) setBulkFile(e.target.files[0]); }} />
                  </div>
                  {bulkFile && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-600 mb-2">CSV Template (expected format):</div>
                      <div className="font-mono text-xs text-gray-500 overflow-x-auto whitespace-nowrap">
                        last_name,first_name,middle_name,sex,grade_level,section,birthday,contact_number<br/>
                        Dela Cruz,Juan,Santos,Male,Grade 4,Sampaguita,2016-03-15,09171234567<br/>
                        Santos,Maria,Reyes,Female,Grade 3,Jasmine,2017-07-22,09281234567
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => { setShowBulkUpload(false); setBulkFile(null); }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
                    <button
                      disabled={!bulkFile}
                      onClick={() => {
                        // Mock parse — generate preview students
                        const mock = [
                          { lastName:'Dela Cruz', firstName:'Juan', sex:'Male', grade:'Grade 4', section:'Sampaguita' },
                          { lastName:'Santos', firstName:'Maria', sex:'Female', grade:'Grade 3', section:'Jasmine' },
                          { lastName:'Reyes', firstName:'Pedro', sex:'Male', grade:'Grade 2', section:'Rose' },
                          { lastName:'Garcia', firstName:'Ana', sex:'Female', grade:'Grade 5', section:'Sunflower' },
                          { lastName:'Martinez', firstName:'Jose', sex:'Male', grade:'Grade 1', section:'Sampaguita' },
                        ];
                        setBulkPreview(mock);
                        setBulkStep('preview');
                      }}
                      className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-40">
                      Parse File →
                    </button>
                  </div>
                </>
              )}

              {bulkStep === 'preview' && (
                <>
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800">{bulkPreview.length} students parsed from <strong>{bulkFile?.name}</strong></span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Name</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Sex</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Grade</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bulkPreview.map((s, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{s.lastName}, {s.firstName}</td>
                            <td className="px-3 py-2 text-gray-600">{s.sex}</td>
                            <td className="px-3 py-2">
                              <GradePill grade={s.grade} />
                            </td>
                            <td className="px-3 py-2 text-gray-600">{s.section}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                    All uploaded students will be assigned: consent status = <strong>Pending</strong>, risk level = <strong>Low</strong>, status = <strong>Active</strong>.
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setBulkStep('upload')}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">← Back</button>
                    <button onClick={() => setBulkStep('done')}
                      className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                      Import {bulkPreview.length} Students
                    </button>
                  </div>
                </>
              )}

              {bulkStep === 'done' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{bulkPreview.length} Students Imported!</h3>
                  <p className="text-sm text-gray-500 mb-6">Students have been added to the system with pending consent status.</p>
                  <button onClick={() => { setShowBulkUpload(false); setBulkStep('upload'); setBulkPreview([]); setBulkFile(null); }}
                    className="px-6 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
