import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Check, Clock, Users, Stethoscope, AlertCircle, RotateCcw, FileText, Download } from 'lucide-react';
import { getGradeColor } from '../utils/gradeColors';
import { getSchoolColor, getSchoolShortName } from '../utils/schoolColors';
import { GradePill } from './GradePill';
import { useAppointments, type AppointmentSession } from '../hooks/useAppointments';
import { useDentistRotations } from '../hooks/useDentistRotations';
import { useStudents } from '../hooks/useStudents';
import { apiClient } from '../api/client';
import { toLocalDateString } from '../utils/localDate';
import { exportToCsv } from '../utils/exportCsv';
import type { ApiSchool } from '../api/types';

const SCHOOLS = [
  'Bagong Tanyag Integrated School',
  'Bagong Tanyag Elementary School Annex A',
  'South Daang Hari Elementary School Main',
];

const TODAY = toLocalDateString(new Date());

export const Appointments = () => {
  const { user, selectedSchool } = useAuth();
  const navigate = useNavigate();
  const staffNameLabel = user?.role === 'dental_aide' ? 'Dental Aide' : 'Dentist';

  // Tabs
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed' | 'missed' | 'rotation'>('today');

  // Filters
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));

  // Create appointment form
  const [formSchool, setFormSchool] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [appointmentDentistId, setAppointmentDentistId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Rotation form
  const [rotSchool, setRotSchool] = useState('');
  const [rotDentistId, setRotDentistId] = useState('');
  const [rotWeekStart, setRotWeekStart] = useState('');
  const [rotWeekEnd, setRotWeekEnd] = useState('');
  const [rotNotes, setRotNotes] = useState('');
  const [rotError, setRotError] = useState<string | null>(null);
  const [rotSaving, setRotSaving] = useState(false);

  const { sessions, dentists, loading: appointmentsLoading, error: appointmentsError, updateSessionStatus, reload: reloadAppointments } = useAppointments();
  const { rotations, loading: rotationsLoading, reload: reloadRotations } = useDentistRotations();
  const { students: allRealStudents } = useStudents();
  const [schools, setSchools] = useState<ApiSchool[]>([]);

  useEffect(() => {
    apiClient.get<ApiSchool[]>('/schools').then(setSchools).catch(() => {});
  }, []);

  // Default the dentist pickers to the logged-in dentist, once dentists have loaded
  useEffect(() => {
    if (!user || dentists.length === 0) return;
    const own = dentists.find(d => d.user_id === user.id);
    const defaultId = own?._id ?? dentists[0]._id;
    setAppointmentDentistId(prev => prev || defaultId);
    setRotDentistId(prev => prev || defaultId);
  }, [user, dentists]);

  const resetCreateAppointmentForm = () => {
    setFormSchool('');
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedStudents([]);
    setAppointmentDate('');
    setAppointmentTime('');
    setAppointmentType('');
    setCreateError(null);
  };

  const resetRotationForm = () => {
    setRotSchool('');
    setRotWeekStart('');
    setRotWeekEnd('');
    setRotNotes('');
    setRotError(null);
  };

  const handleCreateAppointment = async () => {
    setCreateError(null);
    if (!formSchool || !selectedGrade || !selectedSection || !appointmentDate || !appointmentTime || !appointmentType || !appointmentDentistId || selectedStudents.length === 0) {
      setCreateError('Please fill in all fields and select at least one student.');
      return;
    }
    setCreating(true);
    try {
      const appointment_datetime = new Date(`${appointmentDate}T${appointmentTime}`).toISOString();
      await Promise.all(
        selectedStudents.map(student_id =>
          apiClient.post('/appointments', {
            student_id,
            dentist_id: appointmentDentistId,
            appointment_datetime,
            status: 'Scheduled',
            appointment_type: appointmentType,
          }),
        ),
      );
      await reloadAppointments();
      resetCreateAppointmentForm();
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRotation = async () => {
    setRotError(null);
    if (!rotSchool || !rotDentistId || !rotWeekStart || !rotWeekEnd) {
      setRotError('School, dentist, and week start/end are required.');
      return;
    }
    setRotSaving(true);
    try {
      const school = schools.find(s => s.school_name === rotSchool);
      if (!school) throw new Error('Selected school not found');
      await apiClient.post('/dentist-rotations', {
        school_id: school._id,
        dentist_id: rotDentistId,
        week_start: rotWeekStart,
        week_end: rotWeekEnd,
        notes: rotNotes,
      });
      await reloadRotations();
      resetRotationForm();
      setShowRotationModal(false);
      setActiveTab('rotation');
    } catch (err) {
      setRotError(err instanceof Error ? err.message : 'Failed to save rotation');
    } finally {
      setRotSaving(false);
    }
  };

  const grades = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'];
  const studentsInSection = (formSchool && selectedGrade && selectedSection)
    ? allRealStudents.filter(s => s.school === formSchool && s.grade === selectedGrade && s.section === selectedSection)
    : [];
  const sectionsForGrade = (formSchool && selectedGrade)
    ? [...new Set(allRealStudents.filter(s => s.school === formSchool && s.grade === selectedGrade).map(s => s.section))].sort()
    : [];

  const appointments: AppointmentSession[] = selectedSchool
    ? sessions.filter(a => a.school === selectedSchool)
    : sessions;
  const calendarLegendGrades = [...new Set(appointments.map(a => a.grade))]
    .sort((a, b) => grades.indexOf(a) - grades.indexOf(b));

  const getStatus = (a: AppointmentSession) => a.status;

  // Tab filters
  const todayAppts = appointments.filter(a => a.date === TODAY);
  const upcomingAppts = appointments.filter(a => a.date > TODAY && getStatus(a) === 'Scheduled');
  const completedAppts = appointments.filter(a => getStatus(a) === 'Completed');
  const missedAppts = appointments.filter(a => getStatus(a) === 'Missed');

  const filteredAppointments = appointments.filter(a => {
    if (gradeFilter !== 'all' && a.grade !== gradeFilter) return false;
    if (statusFilter !== 'all' && getStatus(a) !== statusFilter) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (searchTerm && !a.grade.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !a.section.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleExportCsv = () => {
    exportToCsv(
      filteredAppointments.filter((a) => !a.pending),
      [
        { label: 'Date', value: (a) => a.date },
        { label: 'Time', value: (a) => a.time },
        { label: 'School', value: (a) => a.school },
        { label: 'Grade', value: (a) => a.grade },
        { label: 'Section', value: (a) => a.section },
        { label: 'Students', value: (a) => a.studentCount },
        { label: 'Type', value: (a) => a.type },
        { label: 'Status', value: (a) => getStatus(a) },
        { label: 'Dentist', value: (a) => a.dentist },
      ],
      `appointments_${toLocalDateString(new Date())}.csv`,
    );
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };
  const getAppointmentsForDay = (date: Date | null) => {
    if (!date) return [];
    const ds = toLocalDateString(date);
    return filteredAppointments.filter(a => a.date === ds);
  };
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1));
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);

  const markStatus = (session: AppointmentSession, status: string) => {
    updateSessionStatus(session, status);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Scheduled': 'bg-blue-100 text-blue-700',
      'In Progress': 'bg-yellow-100 text-yellow-700',
      'Completed': 'bg-green-100 text-green-700',
      'Missed': 'bg-red-100 text-red-700',
      'Cancelled': 'bg-gray-100 text-gray-500',
    };
    return map[status] || 'bg-gray-100 text-gray-500';
  };

  const AppointmentCard = ({ a, showActions = false }: { a: AppointmentSession; showActions?: boolean }) => {
    const gc = getGradeColor(a.grade);
    const sc = getSchoolColor(a.school);
    const status = getStatus(a);
    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div style={{ backgroundColor: gc.light, color: gc.solid }} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
            {a.grade.replace('Grade ', 'G')}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{a.section} — {a.grade}</div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span style={{ color: sc.solid }}>{getSchoolShortName(a.school)}</span>
              <span>·</span>
              <Clock className="w-3 h-3" />
              <span>{a.time}</span>
              <span>·</span>
              <Users className="w-3 h-3" />
              <span>{a.studentCount} students</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{a.type} · {a.dentist}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {a.pending && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Pending sync</span>
          )}
          <Link
            to="/dental-charts"
            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
            title="Open Dental Charts"
          >
            <FileText className="w-3.5 h-3.5" />
          </Link>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(status)}`}>{status}</span>
          {showActions && !a.pending && status === 'Scheduled' && (
            <>
              <button onClick={() => markStatus(a, 'Completed')}
                className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center transition-colors" title="Mark Attended">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => markStatus(a, 'Missed')}
                className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center transition-colors" title="Mark Missed">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {showActions && !a.pending && status === 'In Progress' && (
            <button onClick={() => markStatus(a, 'Completed')}
              className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center transition-colors" title="Mark Completed">
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {showActions && !a.pending && (status === 'Completed' || status === 'Missed') && (
            <button onClick={() => markStatus(a, 'Scheduled')}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors" title="Reset">
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (appointmentsLoading || rotationsLoading) {
    return <div className="text-sm text-gray-500 p-8 text-center">Loading appointments…</div>;
  }

  return (
    <div className="space-y-4">
      {appointmentsError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{appointmentsError}</div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* ── CALENDAR (always visible) ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Dentist Rotation Schedule</span>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4 text-gray-600"/></button>
            <span className="text-sm font-semibold text-gray-900 min-w-[110px] text-center">{monthName}</span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4 text-gray-600"/></button>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Grade Color Code</span>
            {calendarLegendGrades.map(grade => (
              <GradePill key={grade} grade={grade} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-600 py-2 bg-gray-50">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayAppts = getAppointmentsForDay(day);
            const isToday = day && toLocalDateString(day) === TODAY;
            return (
              <div key={idx} className={`min-h-[80px] p-1.5 border-r border-b border-gray-100 last:border-b-0 ${!day ? 'bg-gray-50/60' : ''} ${isToday ? 'bg-teal-50' : ''}`}>
                {day && (
                  <>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-teal-600 text-white' : 'text-gray-600'}`}>
                      {day.getDate()}
                    </div>
                    {dayAppts.map(a => {
                      const gc = getGradeColor(a.grade);
                      return (
                        <div key={a.id} style={{ backgroundColor: gc.light, color: gc.solid }}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded mb-0.5 truncate">
                          {a.time} {a.section}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TABS: Today / Upcoming / Completed / Missed ── */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'today',     label: `Today (${todayAppts.length})`            },
          { key: 'upcoming',  label: `Upcoming (${upcomingAppts.length})`      },
          { key: 'completed', label: `Completed (${completedAppts.length})`    },
          { key: 'missed',    label: `Missed (${missedAppts.length})`          },
          { key: 'rotation',  label: 'Rotation'                                },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* TODAY */}
      {activeTab === 'today' && (
        <>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-900">Today — {new Date(TODAY).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          {todayAppts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No appointments scheduled for today</p>
            </div>
          ) : (
            todayAppts.map(a => <AppointmentCard key={a.id} a={a} showActions />)
          )}
        </>
      )}

      {/* UPCOMING */}
      {activeTab === 'upcoming' && (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Upcoming Appointments</span>
          </div>
          {upcomingAppts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming appointments</p>
            </div>
          ) : (
            upcomingAppts.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className="text-center min-w-[48px]">
                  <div className="text-lg font-bold text-[#1E40AF]">{a.date.split('-')[2]}</div>
                  <div className="text-xs text-gray-400">{new Date(a.date).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <AppointmentCard a={a} showActions />
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* COMPLETED */}
      {activeTab === 'completed' && (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Completed Appointments</span>
          </div>
          {completedAppts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No completed appointments</p>
            </div>
          ) : (
            completedAppts.map(a => <AppointmentCard key={a.id} a={a} showActions />)
          )}
        </>
      )}

      {/* MISSED */}
      {activeTab === 'missed' && (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Missed Appointments</span>
          </div>
          {missedAppts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No missed appointments</p>
            </div>
          ) : (
            missedAppts.map(a => <AppointmentCard key={a.id} a={a} showActions />)
          )}
        </>
      )}

      {/* ROTATION */}
      {activeTab === 'rotation' && (
        <>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Dentist Rotation by School</span>
            <button onClick={() => setShowRotationModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
              <Plus className="w-3.5 h-3.5" /> Add Rotation
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {SCHOOLS.filter(s => !selectedSchool || s === selectedSchool).map(school => {
              const sc = getSchoolColor(school);
              const schoolRots = rotations.filter(r => r.school === school);
              return (
                <div key={school} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope style={{ color: sc.solid }} className="w-4 h-4" />
                    <span style={{ color: sc.text }} className="font-bold text-sm">{getSchoolShortName(school)}</span>
                  </div>
                  {schoolRots.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-6">No rotation schedule set</p>
                  ) : (
                    <div className="pl-6 space-y-1.5">
                      {schoolRots.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{r.dentist}</div>
                            <div className="text-xs text-gray-500">{r.weekStart} → {r.weekEnd}{r.notes && ` · ${r.notes}`}</div>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      </div>{/* end tab content box */}

      {/* ── CREATE APPOINTMENT MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Appointment</h2>
              <button onClick={() => { resetCreateAppointmentForm(); setShowCreateModal(false); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                Select a school, grade, and section. Students in that section will be listed for selection.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
                  <select value={formSchool} onChange={e => { setFormSchool(e.target.value); setSelectedGrade(''); setSelectedSection(''); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select school</option>
                    {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedSection(''); }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Grade</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                  <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Section</option>
                    {sectionsForGrade.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                  <input type="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Appointment Type</label>
                  <select value={appointmentType} onChange={e => setAppointmentType(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select type</option>
                    {['Regular Checkup','Screening','Bayanihan Mission','Fluoride Application','Extraction','Follow-up'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{staffNameLabel}</label>
                  <select value={appointmentDentistId} onChange={e => setAppointmentDentistId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {dentists.map(d => <option key={d._id} value={d._id}>Dr. {d.first_name} {d.last_name}</option>)}
                  </select>
                </div>
              </div>
              {studentsInSection.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Select Students ({selectedStudents.length} selected)</label>
                  <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {studentsInSection.map(s => (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedStudents.includes(s.id)}
                          onChange={() => setSelectedStudents(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                          className="w-4 h-4 rounded accent-blue-600" />
                        <span className="text-sm text-gray-700">{s.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{s.gender} · {new Date().getFullYear() - new Date(s.birthdate).getFullYear()}y</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { resetCreateAppointmentForm(); setShowCreateModal(false); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleCreateAppointment} disabled={creating}
                  className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium">
                  {creating ? 'Creating…' : 'Create Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SET ROTATION MODAL ── */}
      {showRotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Set Rotation Schedule</h2>
              <button onClick={() => { resetRotationForm(); setShowRotationModal(false); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
                <select value={rotSchool} onChange={e => setRotSchool(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select school</option>
                  {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{staffNameLabel}</label>
                <select value={rotDentistId} onChange={e => setRotDentistId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {dentists.map(d => <option key={d._id} value={d._id}>Dr. {d.first_name} {d.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Week Start</label>
                  <input type="date" value={rotWeekStart} onChange={e => setRotWeekStart(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Week End</label>
                  <input type="date" value={rotWeekEnd} onChange={e => setRotWeekEnd(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input type="text" value={rotNotes} onChange={e => setRotNotes(e.target.value)}
                  placeholder="e.g. Bayanihan week"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {rotError && <p className="text-sm text-red-600">{rotError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { resetRotationForm(); setShowRotationModal(false); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleSaveRotation} disabled={rotSaving}
                  className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm font-medium">
                  {rotSaving ? 'Saving…' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
