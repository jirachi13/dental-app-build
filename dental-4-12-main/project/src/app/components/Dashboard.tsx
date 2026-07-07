import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import {
  Users,
  AlertCircle,
  School as SchoolIcon,
  Calendar,
  Shield,
  Plus,
  FileText,
  TrendingUp,
  Activity,
  Eye,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { SkeletonPageHeader, SkeletonStatGrid, SkeletonChartCards } from './Skeleton';
import { getGradeColor } from '../utils/gradeColors';
import { getSchoolColor, getSchoolShortName } from '../utils/schoolColors';
import { toLocalDateString } from '../utils/localDate';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart,
  Line,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { Link } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { useStudents } from '../hooks/useStudents';
import { useAppointments } from '../hooks/useAppointments';
import { useRPCTracking } from '../hooks/useRPCTracking';
import { apiClient } from '../api/client';
import type { ApiUser, ApiTreatment, ApiStudentIptr, ApiAuditTrail, ApiRiskStratification } from '../api/types';
import { treatmentCodes } from './DentalChart';

export const Dashboard = () => {
  const { user, selectedSchool, setSelectedSchool } = useAuth();
  const navigate = useNavigate();

  const handleSwitchSchool = () => {
    setSelectedSchool(null);
    navigate('/select-school');
  };

  const COLORS = {
    red: '#E31E24',
    blue: '#1E40AF',
    yellow: '#FBBF24',
    cyan: '#06B6D4',
    green: '#16A34A',
  };

  const { students: allStudentsRaw, loading: studentsLoading } = useStudents();
  const { sessions: allSessions, loading: appointmentsLoading } = useAppointments();
  const { records: rpcRecords, loading: rpcLoading } = useRPCTracking();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [treatmentCount, setTreatmentCount] = useState(0);
  const [iptrsByStudent, setIptrsByStudent] = useState<Map<string, string[]>>(new Map());
  const [chartedIptrIds, setChartedIptrIds] = useState<Set<string>>(new Set());
  const [auditEntries, setAuditEntries] = useState<ApiAuditTrail[]>([]);
  const [toothRecords, setToothRecords] = useState<{ chart_id: string; treatment_code?: string }[]>([]);
  const [riskStrats, setRiskStrats] = useState<ApiRiskStratification[]>([]);
  const [chartIptrById, setChartIptrById] = useState<Map<string, string>>(new Map());
  const [iptrStudentById, setIptrStudentById] = useState<Map<string, string>>(new Map());
  const [preventiveIptrById, setPreventiveIptrById] = useState<Map<string, string>>(new Map());
  const [extraLoading, setExtraLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // /users and /audit-trails are both system_admin-only on the backend
        // (Sprint 15 RBAC) — the other 4 roles got a 403 here, which threw
        // uncaught inside Promise.all and left extraLoading (and the whole
        // dashboard) stuck on "Loading dashboard…" forever, since
        // setExtraLoading(false) never ran. Only fetch them for the role
        // that actually needs them (System Admin dashboard only) and has
        // permission.
        const [apiUsers, treatments, iptrs, charts, audits, teeth, risks, preventives] = await Promise.all([
          user?.role === 'system_admin' ? apiClient.get<ApiUser[]>('/users') : Promise.resolve([]),
          apiClient.get<ApiTreatment[]>('/treatments'),
          apiClient.get<ApiStudentIptr[]>('/student-iptrs'),
          apiClient.get<{ _id: string; iptr_id: string }[]>('/dental-charts'),
          user?.role === 'system_admin' ? apiClient.get<ApiAuditTrail[]>('/audit-trails') : Promise.resolve([]),
          apiClient.get<{ chart_id: string; treatment_code?: string }[]>('/tooth-records'),
          apiClient.get<ApiRiskStratification[]>('/risk-stratifications'),
          apiClient.get<{ _id: string; iptr_id: string }[]>('/preventive-care-records'),
        ]);
        setUsers(apiUsers);
        setTreatmentCount(treatments.length);
        const byStudent = new Map<string, string[]>();
        for (const i of iptrs) {
          const list = byStudent.get(i.student_id) ?? [];
          list.push(i._id);
          byStudent.set(i.student_id, list);
        }
        setIptrsByStudent(byStudent);
        setChartedIptrIds(new Set(charts.map((c) => c.iptr_id)));
        setAuditEntries(audits);
        setToothRecords(teeth);
        setRiskStrats(risks);
        setChartIptrById(new Map(charts.map((c) => [c._id, c.iptr_id])));
        setIptrStudentById(new Map(iptrs.map((i) => [i._id, i.student_id])));
        setPreventiveIptrById(new Map(preventives.map((p) => [p._id, p.iptr_id])));
      } catch (err) {
        // Defense in depth: even if something else in this block fails,
        // never leave the dashboard stuck on the loading screen forever.
        console.error('Dashboard extra data fetch failed:', err);
      } finally {
        setExtraLoading(false);
      }
    })();
  }, []);

  const loading = studentsLoading || appointmentsLoading || rpcLoading || extraLoading;

  const allStudents = useMemo(
    () => (selectedSchool ? allStudentsRaw.filter((s) => s.school === selectedSchool) : allStudentsRaw),
    [allStudentsRaw, selectedSchool],
  );
  const todaySessions = useMemo(() => {
    const today = toLocalDateString(new Date());
    const sessions = selectedSchool ? allSessions.filter((s) => s.school === selectedSchool) : allSessions;
    return sessions.filter((s) => s.date === today);
  }, [allSessions, selectedSchool]);
  const scopedRpc = useMemo(
    () => (selectedSchool ? rpcRecords.filter((r) => r.school === selectedSchool) : rpcRecords),
    [rpcRecords, selectedSchool],
  );
  const highRiskCount = allStudents.filter((s) => s.riskLevel === 'High').length;
  const mediumRiskCount = allStudents.filter((s) => s.riskLevel === 'Medium').length;
  const lowRiskCount = allStudents.filter((s) => s.riskLevel === 'Low').length;
  const screenedCount = allStudents.filter((s) => s.riskLevel !== null).length;
  const rpcCompletionRate = scopedRpc.length ? Math.round((scopedRpc.filter((r) => r.status === 'complete').length / scopedRpc.length) * 100) : 0;
  const pendingChartsCount = allStudents.filter((s) => {
    const iptrIds = iptrsByStudent.get(s.id) ?? [];
    return iptrIds.length > 0 && !iptrIds.some((id) => chartedIptrIds.has(id));
  }).length;
  const rpcOverdueCount = scopedRpc.filter((r) => r.status === 'overdue').length;
  const rpcPendingCount = scopedRpc.filter((r) => r.status === 'pending').length;

  // School lookup for records that reach a student via chart→iptr or preventive→iptr chains
  const studentSchoolById = useMemo(
    () => new Map(allStudentsRaw.map((s) => [s.id, s.school])),
    [allStudentsRaw],
  );

  // Procedures actually recorded on dental charts (ToothRecord.treatment_code), school-scoped
  const procedureBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of toothRecords) {
      if (!t.treatment_code) continue;
      const studentId = iptrStudentById.get(chartIptrById.get(t.chart_id) ?? '');
      if (selectedSchool && (!studentId || studentSchoolById.get(studentId) !== selectedSchool)) continue;
      counts.set(t.treatment_code, 1 + (counts.get(t.treatment_code) ?? 0));
    }
    return [...counts.entries()]
      .map(([code, count]) => ({ code, label: treatmentCodes.find((c) => c.code === code)?.label ?? code, count }))
      .sort((a, b) => b.count - a.count);
  }, [toothRecords, chartIptrById, iptrStudentById, studentSchoolById, selectedSchool]);

  // Dentist-validated risk assessments grouped by month (validated_at is the only
  // real date on RISK_STRATIFICATION — unvalidated ones have no date, so they're
  // honestly excluded rather than given a fabricated one)
  const assessmentsByMonth = useMemo(() => {
    const byMonth = new Map<string, { High: number; Medium: number; Low: number }>();
    for (const r of riskStrats) {
      if (!r.validated_at) continue;
      const studentId = iptrStudentById.get(preventiveIptrById.get(r.preventive_id) ?? '');
      if (selectedSchool && (!studentId || studentSchoolById.get(studentId) !== selectedSchool)) continue;
      const month = r.validated_at.slice(0, 7); // YYYY-MM
      const bucket = byMonth.get(month) ?? { High: 0, Medium: 0, Low: 0 };
      bucket[r.risk_level]++;
      byMonth.set(month, bucket);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, c]) => ({
        month: new Date(month + '-02').toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
        ...c,
      }));
  }, [riskStrats, preventiveIptrById, iptrStudentById, studentSchoolById, selectedSchool]);

  // RPC follow-ups needing attention: overdue first, then due within 60 days
  const upcomingFollowUps = useMemo(() => {
    const due = scopedRpc.filter(
      (r) => r.status === 'overdue' || (r.status === 'pending' && r.daysUntilDue <= 60),
    );
    // daysUntilDue is negative when overdue, so ascending = most overdue first
    return due.sort((a, b) => a.daysUntilDue - b.daysUntilDue).slice(0, 6);
  }, [scopedRpc]);

  // Real appointment sessions for the current calendar week, bucketed by day + status.
  const weekAppointmentsByDay = useMemo(() => {
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const scoped = selectedSchool ? allSessions.filter((s) => s.school === selectedSchool) : allSessions;
    return DAY_LABELS.map((label, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dateStr = toLocalDateString(day);
      const daySessions = scoped.filter((s) => s.date === dateStr);
      return {
        day: label,
        completed: daySessions.filter((s) => s.status === 'Completed').length,
        scheduled: daySessions.filter((s) => s.status === 'Scheduled' || s.status === 'In Progress').length,
        cancelled: daySessions.filter((s) => s.status === 'Missed').length,
      };
    });
  }, [allSessions, selectedSchool]);

  const StatCard = ({ icon: Icon, label, value, color, trend, progress, linkTo }: any) => {
    const content = (
      <>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {trend && (
          <p className="text-xs text-success mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </p>
        )}
        {progress !== undefined && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${color.replace('text-', 'bg-')}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{progress}% completion</p>
          </div>
        )}
      </>
    );

    if (linkTo) {
      return (
        <Link to={linkTo} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer block">
          {content}
        </Link>
      );
    }

    return (
      <div className="bg-card rounded-xl border border-border p-4">
        {content}
      </div>
    );
  };

  // Shown in place of a chart/list when there's genuinely no real data
  // source to compute it from yet (e.g. no historical snapshots, no backing
  // model) -- never fabricate numbers just to make a chart look populated.
  const NoDataYet = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center text-center px-4" style={{ height: 220 }}>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  // School context banner
  const SchoolBanner = () => {
    if (!selectedSchool) return null;
    const sc = getSchoolColor(selectedSchool);
    return (
      <div style={{ backgroundColor: sc.light, borderColor: sc.border }} className="flex items-center justify-between px-4 py-3 rounded-xl border-2 mb-2">
        <div className="flex items-center gap-3">
          <SchoolIcon style={{ color: sc.solid }} className="w-5 h-5" />
          <div>
            <div style={{ color: sc.text }} className="font-bold text-sm">{getSchoolShortName(selectedSchool)}</div>
            <div className="text-xs text-muted-foreground">Current workspace</div>
          </div>
        </div>
        <button onClick={handleSwitchSchool} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card px-3 py-1.5 rounded-lg border border-border hover:border-border transition-colors">
          <ArrowLeft className="w-3 h-3" />
          Switch School
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
        <SkeletonPageHeader />
        <SkeletonStatGrid />
        <SkeletonChartCards />
      </div>
    );
  }

  // ===== DENTIST DASHBOARD =====
  if (user?.role === 'dentist') {
    const riskDistributionData = [
      { name: 'High Risk', value: highRiskCount, color: COLORS.red },
      { name: 'Medium Risk', value: mediumRiskCount, color: COLORS.yellow },
      { name: 'Low Risk', value: lowRiskCount, color: COLORS.green },
    ];
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dentist Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {user?.name} — {selectedSchool ? getSchoolShortName(selectedSchool) : 'All Schools'}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Patients"
            value={String(allStudents.length)}
            color="text-primary"
            linkTo="/patients"
          />
          <StatCard
            icon={Calendar}
            label="Today's Appointments"
            value={String(todaySessions.length)}
            color="text-cyan-600"
            trend={todaySessions[0] ? `Next: ${todaySessions[0].time}` : undefined}
            linkTo="/appointments"
          />
          <StatCard
            icon={AlertCircle}
            label="High-Risk Patients"
            value={String(highRiskCount)}
            color="text-destructive"
            trend={highRiskCount > 0 ? 'review in Risk Classification' : undefined}
            linkTo="/patients?risk=high"
          />
          <StatCard
            icon={Shield}
            label="RPC Completion Rate"
            value={`${rpcCompletionRate}%`}
            color="text-success"
            progress={rpcCompletionRate}
            linkTo="/rpc"
          />
        </div>

        {/* Charts Row: Risk Distribution (LEFT) + Oral Health Trend (RIGHT, illustrative — see note above) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={220} key="risk-dist-container">
              <PieChart id="risk-distribution-chart">
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  key="risk-pie"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`risk-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip key="risk-tooltip" content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {riskDistributionData.map((item, idx) => (
                <div key={`risk-legend-${idx}`} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Oral Health Trend (Last 6 Months)</h2>
            {/* No historical monthly snapshots exist yet to compute a real
                trend from -- an honest empty state, not fabricated numbers. */}
            <NoDataYet message="No historical trend data yet. This chart will populate once monthly snapshots begin accumulating." />
          </div>
        </div>

        {/* Charts Row 2: RPC funnel + procedures — both computed from real records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">RPC Two-Visit Funnel</h2>
              <Link to="/rpc" className="text-xs text-primary hover:underline">RPC Tracking →</Link>
            </div>
            {scopedRpc.length === 0 ? (
              <NoDataYet message="No enrolled students yet." />
            ) : (
              <div className="space-y-3">
                {/* One measure at deepening stages: sequential single-hue ramp, light→dark */}
                {[
                  { label: 'Enrolled', value: scopedRpc.length, color: '#60A5FA' },
                  { label: 'Visit 1 completed', value: scopedRpc.filter((r) => r.visit1Status === 'Completed').length, color: '#3B82F6' },
                  { label: 'Both visits completed', value: scopedRpc.filter((r) => r.visit2Status === 'Completed').length, color: '#1E40AF' },
                ].map((step) => (
                  <div key={step.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{step.label}</span>
                      <span className="font-medium text-foreground">{step.value} ({Math.round((step.value / scopedRpc.length) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full" style={{ width: `${(step.value / scopedRpc.length) * 100}%`, backgroundColor: step.color }} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">
                  {rpcOverdueCount > 0 ? `${rpcOverdueCount} student${rpcOverdueCount !== 1 ? 's' : ''} overdue for Visit 2` : 'No students overdue for Visit 2'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Procedures Performed</h2>
            {procedureBreakdown.length === 0 ? (
              <NoDataYet message="No procedures recorded on dental charts yet." />
            ) : (
              <div className="space-y-2.5">
                {procedureBreakdown.slice(0, 6).map((p) => (
                  <div key={p.code} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-40 truncate shrink-0" title={p.label}>{p.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-primary" style={{ width: `${(p.count / procedureBreakdown[0].count) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-6 text-right shrink-0">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 3: validated assessments over time + follow-ups due */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Validated Risk Assessments by Month</h2>
            {assessmentsByMonth.length === 0 ? (
              <NoDataYet message="No dentist-validated assessments yet — validated assessments will chart here by month." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={assessmentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {/* Risk levels use the app's established status colors; white strokes
                      give the 2px segment gap, legend + tooltip carry identity beyond color */}
                  <Bar dataKey="High" stackId="risk" fill={COLORS.red} stroke="#fff" strokeWidth={2} />
                  <Bar dataKey="Medium" stackId="risk" fill={COLORS.yellow} stroke="#fff" strokeWidth={2} />
                  <Bar dataKey="Low" stackId="risk" fill={COLORS.green} stroke="#fff" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">RPC Follow-ups Due</h2>
              <Link to="/rpc" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            {upcomingFollowUps.length === 0 ? (
              <NoDataYet message="No follow-ups overdue or due within 60 days." />
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingFollowUps.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.studentName}</p>
                      <p className="text-xs text-muted-foreground">{r.grade} · {r.section}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${r.status === 'overdue' ? 'bg-red-100 text-destructive' : 'bg-primary-surface text-primary'}`}>
                      {r.status === 'overdue' ? `${Math.abs(r.daysUntilDue)}d overdue` : `due in ${r.daysUntilDue}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== DENTAL AIDE DASHBOARD =====
  if (user?.role === 'dental_aide') {
    const appointmentsByStatusData = weekAppointmentsByDay;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dental Aide Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            label="Appointments Today"
            value={String(todaySessions.length)}
            color="text-primary"
            linkTo="/appointments"
          />
          <StatCard
            icon={FileText}
            label="Pending Charts"
            value={String(pendingChartsCount)}
            color="text-yellow-600"
            trend="to complete"
            linkTo="/dental-charts"
          />
          <StatCard
            icon={AlertCircle}
            label="RPC Follow-ups Overdue"
            value={String(rpcOverdueCount)}
            color="text-destructive"
            linkTo="/rpc"
          />
          <StatCard
            icon={Shield}
            label="RPC Visits Pending"
            value={String(rpcPendingCount)}
            color="text-cyan-600"
            linkTo="/rpc"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Appointments by Status - Stacked Bar Chart (real, current week) */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Appointments by Status (This Week)</h2>
            <ResponsiveContainer width="100%" height={220} key="appt-status-container">
              <BarChart data={appointmentsByStatusData} id="appointments-status-chart">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" key="appt-grid" />
                <XAxis dataKey="day" key="appt-xaxis" />
                <YAxis key="appt-yaxis" />
                <Tooltip key="appt-tooltip" content={<ChartTooltip />} />
                <Legend key="appt-legend" />
                <Bar dataKey="completed" stackId="a" fill={COLORS.green} name="Completed" key="appt-bar-completed" />
                <Bar dataKey="scheduled" stackId="a" fill={COLORS.blue} name="Scheduled" key="appt-bar-scheduled" />
                <Bar dataKey="cancelled" stackId="a" fill={COLORS.red} name="Cancelled" key="appt-bar-cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pending Tasks by Priority - no Task entity exists in the ERD,
              so there's no real data to chart -- honest empty state. */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Pending Tasks by Priority</h2>
            <NoDataYet message="No task-tracking system exists yet -- there's no Task entity in the data model to report on." />
          </div>
        </div>

        {/* Task List -- same reason as above, no backing model */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <h2 className="text-sm font-bold text-foreground mb-3">Pending Tasks</h2>
          <p className="text-sm text-muted-foreground text-center py-12">No task-tracking system exists yet.</p>
        </div>
      </div>
    );
  }

  // ===== SCHOOL ADMIN DASHBOARD =====
  if (user?.role === 'school_admin') {
    const schoolName = user.schools?.[0];
    const schoolStudents = schoolName ? allStudentsRaw.filter((s) => s.school === schoolName) : [];
    const schoolScreenedCount = schoolStudents.filter((s) => s.riskLevel !== null).length;
    const coveragePct = schoolStudents.length ? Math.round((schoolScreenedCount / schoolStudents.length) * 100) : 0;

    const screeningCoverageData = [
      { name: 'Screened', value: coveragePct, fill: COLORS.blue },
    ];

    const oralHealthStatusData = [
      { name: 'Orally Fit', value: schoolStudents.filter((s) => s.oralStatus === 'Orally Fit').length, color: COLORS.green },
      { name: 'Needs Treatment', value: schoolStudents.filter((s) => s.oralStatus === 'Needs Treatment').length, color: COLORS.red },
      { name: 'Under Treatment', value: schoolStudents.filter((s) => s.oralStatus === 'Under Treatment').length, color: COLORS.blue },
      { name: 'Not Yet Screened', value: schoolStudents.filter((s) => s.oralStatus === 'Not Yet Screened').length, color: COLORS.yellow },
    ];

    const schoolSessions = schoolName ? allSessions.filter((s) => s.school === schoolName) : [];
    const today = toLocalDateString(new Date());
    const upcomingEvents = schoolSessions
      .filter((s) => s.type === 'Bayanihan Mission' && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ name: s.type, date: s.date, school: s.school, students: s.studentCount }));
    const nextUpcomingSession = [...schoolSessions].filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">School Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">{user.schools?.[0]}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Students Enrolled"
            value={String(schoolStudents.length)}
            color="text-primary"
            linkTo="/reports"
          />
          <StatCard
            icon={CheckCircle}
            label="Students Screened"
            value={String(schoolScreenedCount)}
            color="text-success"
            trend={`${coveragePct}% coverage`}
            linkTo="/reports"
          />
          <StatCard
            icon={Activity}
            label="Treatments Completed"
            value={String(treatmentCount)}
            color="text-cyan-600"
            linkTo="/reports"
          />
          <StatCard
            icon={Calendar}
            label="Upcoming Visits"
            value={nextUpcomingSession ? nextUpcomingSession.date : 'None scheduled'}
            color="text-yellow-600"
            linkTo="/appointments"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Screening Coverage - Radial Chart */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Screening Coverage</h2>
            <ResponsiveContainer width="100%" height={220} key="screening-coverage-container">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="60%" 
                outerRadius="90%" 
                data={screeningCoverageData}
                startAngle={90}
                endAngle={-270}
                id="screening-coverage-chart"
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                  key="screening-radial-bar"
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-gray-900">
                  {coveragePct}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-muted-foreground mt-2">Students Screened</p>
          </div>

          {/* Oral Health Status - Pie Chart */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Oral Health Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={220} key="oral-health-status-container">
              <PieChart id="oral-health-status-chart">
                <Pie
                  data={oralHealthStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label
                  key="oral-health-pie"
                >
                  {oralHealthStatusData.map((entry, index) => (
                    <Cell key={`oral-health-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip key="oral-health-tooltip" content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {oralHealthStatusData.map((item, idx) => (
                <div key={`oral-health-legend-${idx}`} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Bayanihan Events */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <h2 className="text-sm font-bold text-foreground mb-3">Upcoming Bayanihan Events</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No upcoming Bayanihan Mission events scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-primary-surface rounded-lg">
                  <div>
                    <div className="font-medium text-foreground">{event.name}</div>
                    <div className="text-sm text-muted-foreground">{event.date} • {event.school}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{event.students}</div>
                    <div className="text-xs text-muted-foreground">students expected</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== BARANGAY HEALTH OFFICE DASHBOARD =====
  if (user?.role === 'bho_staff') {
    const SCHOOLS_SHORT: Record<string, string> = {
      'Bagong Tanyag Integrated School': 'Bagong Tanyag Integrated',
      'Bagong Tanyag Elementary School Annex A': 'Annex A',
      'South Daang Hari Elementary School Main': 'South Daang Hari',
    };
    const schoolComparisonData = Object.entries(SCHOOLS_SHORT).map(([full, short]) => {
      const students = allStudentsRaw.filter((s) => s.school === full);
      return {
        school: short,
        screened: students.filter((s) => s.riskLevel !== null).length,
        treated: 0, // no real Treatment records exist yet — see HANDOFF
        highRisk: students.filter((s) => s.riskLevel === 'High').length,
      };
    });


    const bracketOf = (birthdate: string) => {
      const age = new Date().getFullYear() - new Date(birthdate).getFullYear();
      if (age <= 5) return '0-5 years';
      if (age <= 14) return '6-14 years';
      return '15-19 years';
    };
    const ageGroupData = ['0-5 years', '6-14 years', '15-19 years'].map((bracket) => {
      const inBracket = allStudentsRaw.filter((s) => bracketOf(s.birthdate) === bracket);
      return {
        bracket,
        total: inBracket.length,
        orallyFit: inBracket.filter((s) => s.oralStatus === 'Orally Fit').length,
        needsTreatment: inBracket.filter((s) => s.oralStatus === 'Needs Treatment').length,
      };
    });

    const totalStudents = allStudentsRaw.length;
    const totalScreened = allStudentsRaw.filter((s) => s.riskLevel !== null).length;
    const programCoveragePct = totalStudents ? Math.round((totalScreened / totalStudents) * 100) : 0;
    const orallyFitPct = totalStudents ? Math.round((allStudentsRaw.filter((s) => s.oralStatus === 'Orally Fit').length / totalStudents) * 100) : 0;
    const schoolsParticipating = new Set(allStudentsRaw.map((s) => s.school)).size;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Barangay Health Office Dashboard</h1>
          <p className="text-muted-foreground mt-1">Aggregated data across all schools</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Students Served"
            value={String(totalStudents)}
            color="text-primary"
            trend={`across ${schoolsParticipating} schools`}
            linkTo="/reports"
          />
          <StatCard
            icon={Activity}
            label="Program Coverage"
            value={`${programCoveragePct}%`}
            color="text-success"
            progress={programCoveragePct}
            linkTo="/reports"
          />
          <StatCard
            icon={CheckCircle}
            label="Orally Fit"
            value={`${orallyFitPct}%`}
            color="text-cyan-600"
            linkTo="/reports"
          />
          <StatCard
            icon={Shield}
            label="Schools Participating"
            value={`${schoolsParticipating} of 3`}
            color="text-muted-foreground"
            linkTo="/reports"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* School Comparison - Grouped Bar Chart */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">School Comparison</h2>
            <ResponsiveContainer width="100%" height={220} key="school-comparison-container">
              <BarChart data={schoolComparisonData} id="school-comparison-chart">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" key="school-grid" />
                <XAxis dataKey="school" angle={-15} textAnchor="end" height={80} key="school-xaxis" />
                <YAxis key="school-yaxis" />
                <Tooltip key="school-tooltip" content={<ChartTooltip />} />
                <Legend key="school-legend" />
                <Bar dataKey="screened" fill={COLORS.blue} name="Screened" key="school-bar-screened" />
                <Bar dataKey="treated" fill={COLORS.green} name="Treated" key="school-bar-treated" />
                <Bar dataKey="highRisk" fill={COLORS.red} name="High Risk" key="school-bar-risk" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Coverage Trend - Area Chart */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Monthly Program Coverage Trend</h2>
            {/* No historical monthly snapshots exist yet -- honest empty state. */}
            <NoDataYet message="No historical coverage data yet. This chart will populate once monthly snapshots begin accumulating." />
          </div>
        </div>

        {/* Age Group Breakdown Table */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <h2 className="text-sm font-bold text-foreground mb-3">Age Group Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Age Bracket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Orally Fit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Needs Treatment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fitness Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ageGroupData.map((group, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{group.bracket}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{group.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-success font-medium">{group.orallyFit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-destructive font-medium">{group.needsTreatment}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {group.total ? Math.round((group.orallyFit / group.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===== SYSTEM ADMIN DASHBOARD =====
  if (user?.role === 'system_admin') {
    const activeUsersCount = users.filter((u) => !u.isArchived).length;

    // Real, computed from users' last_login timestamps -- an approximation
    // (one login per user per day, not a full session log) but genuinely
    // real, not fabricated.
    const loginActivityData = (() => {
      const days: { key: string; label: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ key: toLocalDateString(d), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
      }
      return days.map(({ key, label }) => ({
        day: label,
        logins: users.filter((u) => u.last_login && toLocalDateString(new Date(u.last_login)) === key).length,
      }));
    })();

    // Real, computed from actual audit trail entries.
    const actionsByModuleData = (() => {
      const counts = new Map<string, number>();
      for (const a of auditEntries) {
        counts.set(a.affected_model, (counts.get(a.affected_model) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([module, actions]) => ({ module, actions }));
    })();

    // Real, 5 most recent audit trail entries.
    const userNameById = new Map(users.map((u) => [u._id, u.full_name]));
    const recentAudit = [...auditEntries]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 5)
      .map((a) => ({
        time: new Date(a.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        user: userNameById.get(a.user_id) ?? 'Unknown User',
        action: a.action,
        module: a.affected_model,
      }));

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System monitoring and management</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Active Users"
            value={String(activeUsersCount)}
            color="text-primary"
            linkTo="/accounts"
          />
          {/* System uptime and failed-login tracking aren't measured anywhere
              in this system — honest "N/A", not a fabricated specific number. */}
          <StatCard
            icon={CheckCircle}
            label="System Uptime"
            value="N/A"
            color="text-muted-foreground"
            trend="not monitored"
            linkTo="/audit"
          />
          <StatCard
            icon={AlertCircle}
            label="Failed Logins Today"
            value="N/A"
            color="text-muted-foreground"
            trend="not tracked"
            linkTo="/audit"
          />
          <StatCard
            icon={Clock}
            label="Pending Actions"
            value="N/A"
            color="text-muted-foreground"
            trend="no task-tracking system"
            linkTo="/audit"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Login Activity - Line Chart (real, from users' last_login) */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Login Activity (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={220} key="login-activity-container">
              <LineChart data={loginActivityData} id="login-activity-chart">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" key="login-grid" />
                <XAxis dataKey="day" key="login-xaxis" />
                <YAxis key="login-yaxis" allowDecimals={false} />
                <Tooltip key="login-tooltip" content={<ChartTooltip />} />
                <Line type="monotone" dataKey="logins" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 5 }} key="login-line" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Actions by Module - Horizontal Bar Chart (real, from audit trail) */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Actions by Module</h2>
            {actionsByModuleData.length === 0 ? (
              <NoDataYet message="No audit trail activity recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height={220} key="actions-module-container">
                <BarChart data={actionsByModuleData} layout="vertical" id="actions-module-chart">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" key="actions-grid" />
                  <XAxis type="number" key="actions-xaxis" allowDecimals={false} />
                  <YAxis dataKey="module" type="category" width={100} key="actions-yaxis" />
                  <Tooltip key="actions-tooltip" content={<ChartTooltip />} />
                  <Bar dataKey="actions" fill={COLORS.blue} key="actions-bar" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Audit Activity (real) */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <h2 className="text-sm font-bold text-foreground mb-3">Recent Audit Activity</h2>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No audit trail activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentAudit.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                      <span className="font-medium text-foreground">{log.user}</span>
                      <span className="text-sm text-muted-foreground">• {log.action}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Module: {log.module}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/audit"
            className="block mt-4 text-center text-sm text-primary hover:text-primary font-medium"
          >
            View Full Audit Trail →
          </Link>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
      </div>
      <div className="bg-card p-4 rounded-xl border border-border">
        <p className="text-muted-foreground">No dashboard configured for your role.</p>
      </div>
    </div>
  );
};