import { useAuth } from '../context/AuthContext';
import {
  Users,
  AlertCircle,
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
  ArrowRight
} from 'lucide-react';
import { SkeletonBlock } from './Skeleton';
import { getGradeColor } from '../utils/gradeColors';
import { CHART, RISK_COLORS } from '../utils/chartColors';
import { getSchoolShortName } from '../utils/schoolColors';
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
  LineChart,
  Line,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { Link } from 'react-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStudents } from '../hooks/useStudents';
import { useAppointments } from '../hooks/useAppointments';
import { useRPCTracking } from '../hooks/useRPCTracking';
import { apiClient } from '../api/client';
import type { ApiUser, ApiTreatment, ApiStudentIptr, ApiAuditTrail, ApiRiskStratification } from '../api/types';
import { treatmentCodes } from './DentalChart';

export const Dashboard = () => {
  const { user, selectedSchool } = useAuth();

  // Chart colors live in one shared module (Sprint 32 / audit U3) so every
  // screen's charts speak the same semantic color language.

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
    // No validations at all → empty array so the honest NoDataYet state shows
    if (byMonth.size === 0) return [];
    // Fixed rolling window: last 6 months up to the current month, zeros
    // included — a lone data month reads as a timeline ("started in July"),
    // not a single floating bar. Zero months are real zeros, not fabricated.
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
      });
    }
    // if any validations predate the window, chart them too (don't hide data)
    const older = [...byMonth.keys()].filter((k) => k < months[0].key).sort();
    const keys = [
      ...older.map((k) => ({ key: k, label: new Date(k + '-02').toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }) })),
      ...months,
    ];
    return keys.map(({ key, label }) => ({
      month: label,
      ...(byMonth.get(key) ?? { High: 0, Medium: 0, Low: 0 }),
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

  // Tiles are shaped by meaning, not four identical boxes (Sprint 23h / audit
  // U2): tinted icon chip, big tabular number, and status tiles (destructive/
  // success) carry their color on the number + footnote too. Chip/tint style
  // derives from the existing `color` prop so no call site changes.
  const STAT_CHIP: Record<string, { chip: string; val: string; foot: string }> = {
    'text-destructive': { chip: 'bg-danger-surface text-destructive', val: 'text-destructive', foot: 'text-destructive font-semibold' },
    'text-success': { chip: 'bg-success-surface text-success', val: 'text-success', foot: 'text-muted-foreground' },
    'text-cyan-600': { chip: 'bg-cyan-50 text-cyan-700', val: 'text-foreground', foot: 'text-muted-foreground' },
  };
  // `loading` (Sprint 23w / audit X3): the tile shell + icon + label render
  // immediately; only the value pulses until this tile's own data source
  // lands — stat tiles no longer wait on the slowest dashboard fetch.
  const StatCard = ({ icon: Icon, label, value, color, trend, progress, linkTo, loading }: any) => {
    const style = STAT_CHIP[color] ?? { chip: 'bg-primary-surface text-primary', val: 'text-foreground', foot: 'text-muted-foreground' };
    const content = (
      <>
        <div className="flex items-center justify-between mb-3">
          <span className={`w-9 h-9 rounded-lg grid place-items-center ${style.chip}`}>
            <Icon className="w-[18px] h-[18px]" />
          </span>
          {linkTo && (
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
        {loading ? (
          <SkeletonBlock className="h-[30px] w-16" />
        ) : (
          <p className={`text-3xl font-extrabold leading-none tracking-tight tabular-nums ${style.val}`}>{value}</p>
        )}
        <p className="text-xs text-muted-foreground font-medium mt-1.5">{label}</p>
        {!loading && trend && (
          <p className={`text-[11px] mt-2.5 flex items-center gap-1 ${style.foot}`}>
            {trend}
          </p>
        )}
        {!loading && progress !== undefined && (
          <div className="mt-2.5 w-full bg-muted rounded-full h-1.5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-1.5 rounded-full grow-x ${color.replace('text-', 'bg-')}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </>
    );

    if (linkTo) {
      return (
        <Link to={linkTo} className="group bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer block">
          {content}
        </Link>
      );
    }

    return (
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
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

  // Per-region loading (Sprint 23w / audit X3): each chart card swaps its own
  // body from skeleton to content as its data source arrives, instead of one
  // global gate on the slowest of 8 parallel fetches. The `.rise` on arrival
  // is the X4 state motion for "this region's data just landed".
  const ChartBody = ({ ready, children }: { ready: boolean; children: ReactNode }) =>
    ready ? (
      <div className="rise">{children}</div>
    ) : (
      <div aria-busy="true">
        <SkeletonBlock className="h-[220px] w-full" />
      </div>
    );

  // NOTE: a `SchoolBanner` component used to be defined here and was never
  // rendered anywhere -- dead code. It was the only mobile-reachable way to
  // switch schools, which is why switching was impossible on a phone. Sprint 33
  // put the switcher in the mobile drawer (Root.tsx), so it is removed rather
  // than wired up; the drawer covers every screen, not just the dashboard.

  // ===== DENTIST DASHBOARD =====
  if (user?.role === 'dentist') {
    // High first — the tier that needs attention reads first (audit U3:
    // horizontal bars over pie slices; easier magnitude comparison for
    // older/non-technical staff, colors stay the semantic risk palette)
    const riskDistributionData = [
      { name: 'High', value: highRiskCount, color: RISK_COLORS.high },
      { name: 'Medium', value: mediumRiskCount, color: RISK_COLORS.medium },
      { name: 'Low', value: lowRiskCount, color: RISK_COLORS.low },
    ];
    const riskTotal = highRiskCount + mediumRiskCount + lowRiskCount;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 rise">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dentist Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {user?.name} — {selectedSchool ? getSchoolShortName(selectedSchool) : 'All Schools'}</p>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground hidden sm:block">
            <span className="block text-[13px] font-semibold text-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {appointmentsLoading ? (
              <SkeletonBlock className="h-4 w-32 ml-auto" />
            ) : (
              <>{todaySessions.length} appointment{todaySessions.length !== 1 ? 's' : ''} today</>
            )}
          </div>
          <Link
            to="/appointments?new=1"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rise rise-1">
          <StatCard
            icon={Users}
            label="Total Patients"
            value={String(allStudents.length)}
            color="text-primary"
            linkTo="/patients"
            loading={studentsLoading}
          />
          <StatCard
            icon={Calendar}
            label="Today's Appointments"
            value={String(todaySessions.length)}
            color="text-cyan-600"
            trend={todaySessions[0] ? `Next: ${todaySessions[0].time}` : undefined}
            linkTo="/appointments"
            loading={appointmentsLoading}
          />
          <StatCard
            icon={AlertCircle}
            label="High-Risk Patients"
            value={String(highRiskCount)}
            color="text-destructive"
            trend={highRiskCount > 0 ? 'review in Risk Classification' : undefined}
            linkTo="/patients?risk=high"
            loading={studentsLoading}
          />
          <StatCard
            icon={Shield}
            label="RPC Completion Rate"
            value={`${rpcCompletionRate}%`}
            color="text-success"
            progress={rpcCompletionRate}
            linkTo="/rpc"
            loading={rpcLoading}
          />
        </div>

        {/* Charts Row: Risk Distribution (LEFT) + Oral Health Trend (RIGHT, illustrative — see note above) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-2">
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground">Risk Distribution</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Validated caries-risk classification</p>
            <ChartBody ready={!studentsLoading}>
            {riskTotal === 0 ? (
              <NoDataYet message="No students with a validated risk level yet." />
            ) : (
              <div className="space-y-2.5">
                {/* same horizontal-bar idiom as the RPC funnel/procedures cards:
                    label · track · count inside the bar when it fits */}
                {riskDistributionData.map((item) => {
                  const pct = Math.round((item.value / riskTotal) * 100);
                  const fits = pct >= 22;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{item.name} risk</span>
                      <div className="flex-1 bg-muted rounded-md h-7 relative overflow-hidden">
                        <div className="h-full rounded-md grow-x" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                        <span
                          className="absolute inset-y-0 flex items-center text-xs font-bold tabular-nums whitespace-nowrap"
                          style={fits ? { right: `calc(${100 - pct}% + 8px)`, color: '#FFFFFF' } : { left: `calc(${pct}% + 8px)`, color: 'var(--foreground)' }}
                        >
                          {item.value} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-1">
                  {riskTotal} student{riskTotal !== 1 ? 's' : ''} with a validated risk level
                  {screenedCount !== riskTotal ? ` · ${screenedCount} screened in total` : ''}
                </p>
              </div>
            )}
            </ChartBody>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground">Oral Health Trend</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Mean DMFT index · last 6 months</p>
            {/* No historical monthly snapshots exist yet to compute a real
                trend from -- an honest empty state, not fabricated numbers. */}
            <NoDataYet message="No historical trend data yet. This chart will populate once monthly snapshots begin accumulating." />
          </div>
        </div>

        {/* Charts Row 2: RPC funnel + procedures — both computed from real records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-3">
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">RPC Two-Visit Funnel</h2>
                <p className="text-[11px] text-muted-foreground">Preventive care progression</p>
              </div>
              <Link to="/rpc" className="text-xs text-primary hover:underline">RPC Tracking →</Link>
            </div>
            <ChartBody ready={!rpcLoading}>
            {scopedRpc.length === 0 ? (
              <NoDataYet message="No enrolled students yet." />
            ) : (
              <div className="space-y-2.5">
                {/* One measure at deepening stages: single-hue depth ramp,
                    darkest = widest. Count sits inside the bar when it fits,
                    beside it in ink when the bar is too short. */}
                {[
                  { label: 'Enrolled', value: scopedRpc.length, color: '#1E40AF', ink: '#FFFFFF' },
                  { label: 'Visit 1 completed', value: scopedRpc.filter((r) => r.visit1Status === 'Completed').length, color: '#4E74D6', ink: '#FFFFFF' },
                  { label: 'Both visits completed', value: scopedRpc.filter((r) => r.visit2Status === 'Completed').length, color: '#9DB2EC', ink: '#26355C' },
                ].map((step) => {
                  const pct = Math.round((step.value / scopedRpc.length) * 100);
                  const fits = pct >= 22;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{step.label}</span>
                      <div className="flex-1 bg-muted rounded-md h-7 relative overflow-hidden">
                        <div className="h-full rounded-md grow-x" style={{ width: `${pct}%`, backgroundColor: step.color }} />
                        <span
                          className="absolute inset-y-0 flex items-center text-xs font-bold tabular-nums whitespace-nowrap"
                          style={fits ? { right: `calc(${100 - pct}% + 8px)`, color: step.ink } : { left: `calc(${pct}% + 8px)`, color: 'var(--foreground)' }}
                        >
                          {step.value} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-1">
                  {rpcOverdueCount > 0 ? `${rpcOverdueCount} student${rpcOverdueCount !== 1 ? 's' : ''} overdue for Visit 2` : 'No students overdue for Visit 2'}
                </p>
              </div>
            )}
            </ChartBody>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground">Procedures Performed</h2>
            <p className="text-[11px] text-muted-foreground mb-3">From dental chart treatment records</p>
            <ChartBody ready={!extraLoading}>
            {procedureBreakdown.length === 0 ? (
              <NoDataYet message="No procedures recorded on dental charts yet." />
            ) : (
              <div className="space-y-2.5">
                {procedureBreakdown.slice(0, 6).map((p) => (
                  <div key={p.code} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36 truncate shrink-0" title={p.label}>{p.label}</span>
                    <div className="flex-1 bg-muted rounded-md h-5">
                      <div className="h-full rounded-md bg-primary grow-x" style={{ width: `${(p.count / procedureBreakdown[0].count) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-foreground w-8 text-right shrink-0">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
            </ChartBody>
          </div>
        </div>

        {/* Charts Row 3: validated assessments over time + follow-ups due */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-4">
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground">Validated Risk Assessments</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Dentist-validated each month</p>
            <ChartBody ready={!extraLoading}>
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
                  {/* maxBarSize keeps a lone month from stretching into a slab */}
                  <Bar dataKey="High" stackId="risk" fill={RISK_COLORS.high} stroke="#fff" strokeWidth={2} maxBarSize={48} />
                  <Bar dataKey="Medium" stackId="risk" fill={RISK_COLORS.medium} stroke="#fff" strokeWidth={2} maxBarSize={48} />
                  <Bar dataKey="Low" stackId="risk" fill={RISK_COLORS.low} stroke="#fff" strokeWidth={2} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
            </ChartBody>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">RPC Follow-ups Due</h2>
                <p className="text-[11px] text-muted-foreground">Overdue and due within 60 days</p>
              </div>
              <Link to="/rpc" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            <ChartBody ready={!rpcLoading}>
            {upcomingFollowUps.length === 0 ? (
              <NoDataYet message="No follow-ups overdue or due within 60 days." />
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingFollowUps.map((r) => {
                  // urgency reads as form, not just number: overdue red, due
                  // within a week amber, further out calm gray
                  const pill = r.status === 'overdue'
                    ? 'bg-danger-surface text-destructive'
                    : r.daysUntilDue <= 7
                      ? 'bg-warning-surface text-warning'
                      : 'bg-muted text-muted-foreground';
                  const initials = r.studentName
                    .split(/[\s,]+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w: string) => w[0])
                    .join('')
                    .toUpperCase();
                  return (
                    <div key={r.id} className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-primary-surface transition-colors">
                      <span className="w-8 h-8 rounded-lg bg-primary-surface text-primary grid place-items-center text-[11px] font-bold shrink-0">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground">{r.grade} · {r.section}</p>
                      </div>
                      <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${pill}`}>
                        {r.status === 'overdue' ? `${Math.abs(r.daysUntilDue)}d overdue` : r.daysUntilDue === 0 ? 'due today' : `due in ${r.daysUntilDue}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            </ChartBody>
          </div>
        </div>
      </div>
    );
  }

  // ===== DENTAL AIDE DASHBOARD =====
  if (user?.role === 'dental_aide') {
    const appointmentsByStatusData = weekAppointmentsByDay;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 rise">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dental Aide Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {user?.name}{selectedSchool ? ` — ${getSchoolShortName(selectedSchool)}` : ''}</p>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground hidden sm:block">
            <span className="block text-[13px] font-semibold text-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {appointmentsLoading ? (
              <SkeletonBlock className="h-4 w-32 ml-auto" />
            ) : (
              <>{todaySessions.length} appointment{todaySessions.length !== 1 ? 's' : ''} today</>
            )}
          </div>
          <Link
            to="/appointments?new=1"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rise rise-1">
          <StatCard
            icon={Calendar}
            label="Appointments Today"
            value={String(todaySessions.length)}
            color="text-primary"
            linkTo="/appointments"
            loading={appointmentsLoading}
          />
          <StatCard
            icon={FileText}
            label="Pending Charts"
            value={String(pendingChartsCount)}
            color="text-yellow-600"
            trend="to complete"
            linkTo="/dental-charts"
            loading={studentsLoading || extraLoading}
          />
          <StatCard
            icon={AlertCircle}
            label="RPC Follow-ups Overdue"
            value={String(rpcOverdueCount)}
            color="text-destructive"
            linkTo="/rpc"
            loading={rpcLoading}
          />
          <StatCard
            icon={Shield}
            label="RPC Visits Pending"
            value={String(rpcPendingCount)}
            color="text-cyan-600"
            linkTo="/rpc"
            loading={rpcLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-2">
          {/* Appointments by Status - Stacked Bar Chart (real, current week) */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-0.5">Appointments by Status (This Week)</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Completed · scheduled · missed, per day</p>
            <ChartBody ready={!appointmentsLoading}>
            <ResponsiveContainer width="100%" height={220} key="appt-status-container">
              <BarChart data={appointmentsByStatusData} id="appointments-status-chart">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" key="appt-grid" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} key="appt-xaxis" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} key="appt-yaxis" />
                <Tooltip key="appt-tooltip" content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} key="appt-legend" />
                <Bar dataKey="completed" stackId="a" fill={CHART.success} name="Completed" key="appt-bar-completed" maxBarSize={48} />
                <Bar dataKey="scheduled" stackId="a" fill={CHART.brand} name="Scheduled" key="appt-bar-scheduled" maxBarSize={48} />
                <Bar dataKey="cancelled" stackId="a" fill={CHART.danger} name="Missed" key="appt-bar-cancelled" maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
            </ChartBody>
          </div>

          {/* Pending Tasks by Priority - no Task entity exists in the ERD,
              so there's no real data to chart -- honest empty state. */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Pending Tasks by Priority</h2>
            <NoDataYet message="No task-tracking system exists yet -- there's no Task entity in the data model to report on." />
          </div>
        </div>

        {/* Task List -- same reason as above, no backing model */}
        <div className="bg-card p-4 rounded-xl border border-border rise rise-3">
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
      { name: 'Screened', value: coveragePct, fill: CHART.brand },
    ];

    const oralHealthStatusData = [
      // semantic status colors (Sprint 23o): good=green, needs-care=red,
      // in-progress=brand blue, no-data-yet=neutral gray (not warning-amber)
      { name: 'Orally Fit', value: schoolStudents.filter((s) => s.oralStatus === 'Orally Fit').length, color: CHART.success },
      { name: 'Needs Treatment', value: schoolStudents.filter((s) => s.oralStatus === 'Needs Treatment').length, color: CHART.danger },
      { name: 'Under Treatment', value: schoolStudents.filter((s) => s.oralStatus === 'Under Treatment').length, color: CHART.brand },
      { name: 'Not Yet Screened', value: schoolStudents.filter((s) => s.oralStatus === 'Not Yet Screened').length, color: CHART.neutral },
    ];

    const schoolSessions = schoolName ? allSessions.filter((s) => s.school === schoolName) : [];
    const today = toLocalDateString(new Date());
    const upcomingEvents = schoolSessions
      .filter((s) => s.type === 'Bayanihan Mission' && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ name: s.type, date: s.date, school: s.school, students: s.studentCount }));
    const nextUpcomingSession = [...schoolSessions].filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 rise">
          <div>
            <h1 className="text-2xl font-bold text-foreground">School Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user.schools?.[0]}</p>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground hidden sm:block">
            <span className="block text-[13px] font-semibold text-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {studentsLoading ? (
              <SkeletonBlock className="h-4 w-32 ml-auto" />
            ) : (
              <>{schoolStudents.length} student{schoolStudents.length !== 1 ? 's' : ''} enrolled</>
            )}
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
          >
            <FileText className="w-4 h-4" />
            View Reports
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rise rise-1">
          <StatCard
            icon={Users}
            label="Students Enrolled"
            value={String(schoolStudents.length)}
            color="text-primary"
            linkTo="/reports"
            loading={studentsLoading}
          />
          <StatCard
            icon={CheckCircle}
            label="Students Screened"
            value={String(schoolScreenedCount)}
            color="text-success"
            trend={`${coveragePct}% coverage`}
            linkTo="/reports"
            loading={studentsLoading}
          />
          <StatCard
            icon={Activity}
            label="Treatments Completed"
            value={String(treatmentCount)}
            color="text-cyan-600"
            linkTo="/reports"
            loading={extraLoading}
          />
          <StatCard
            icon={Calendar}
            label="Upcoming Visits"
            value={nextUpcomingSession ? nextUpcomingSession.date : 'None scheduled'}
            color="text-yellow-600"
            linkTo="/appointments"
            loading={appointmentsLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-2">
          {/* Screening Coverage - Radial Chart */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-0.5">Screening Coverage</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Share of enrolled students already screened</p>
            <ChartBody ready={!studentsLoading}>
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
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-foreground">
                  {coveragePct}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-muted-foreground mt-2">Students Screened</p>
            </ChartBody>
          </div>

          {/* Oral Health Status - horizontal bars (Sprint 32) */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-0.5">Oral Health Status Breakdown</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Latest recorded status per student</p>
            <ChartBody ready={!studentsLoading}>
            {schoolStudents.length === 0 ? (
              <NoDataYet message="No students enrolled at this school yet." />
            ) : (
              <div className="space-y-2.5">
                {/* horizontal bars (audit U3) — same idiom as the dentist
                    dashboard's risk/funnel cards, semantic status colors */}
                {oralHealthStatusData.map((item) => {
                  const pct = Math.round((item.value / schoolStudents.length) * 100);
                  const fits = pct >= 22;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{item.name}</span>
                      <div className="flex-1 bg-muted rounded-md h-7 relative overflow-hidden">
                        <div className="h-full rounded-md grow-x" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                        <span
                          className="absolute inset-y-0 flex items-center text-xs font-bold tabular-nums whitespace-nowrap"
                          style={fits ? { right: `calc(${100 - pct}% + 8px)`, color: '#FFFFFF' } : { left: `calc(${pct}% + 8px)`, color: 'var(--foreground)' }}
                        >
                          {item.value} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-1">
                  {schoolStudents.length} student{schoolStudents.length !== 1 ? 's' : ''} enrolled
                </p>
              </div>
            )}
            </ChartBody>
          </div>
        </div>

        {/* Upcoming Bayanihan Events */}
        <div className="bg-card p-4 rounded-xl border border-border rise rise-3">
          <h2 className="text-sm font-bold text-foreground mb-0.5">Upcoming Bayanihan Events</h2>
          <p className="text-[11px] text-muted-foreground mb-3">Scheduled outreach missions at this school</p>
          <ChartBody ready={!appointmentsLoading}>
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
          </ChartBody>
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
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 rise">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Barangay Health Office Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Aggregated data across all schools</p>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground hidden sm:block">
            <span className="block text-[13px] font-semibold text-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {studentsLoading ? (
              <SkeletonBlock className="h-4 w-40 ml-auto" />
            ) : (
              <>{totalStudents} student{totalStudents !== 1 ? 's' : ''} across {schoolsParticipating} school{schoolsParticipating !== 1 ? 's' : ''}</>
            )}
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
          >
            <FileText className="w-4 h-4" />
            View Reports
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rise rise-1">
          <StatCard
            icon={Users}
            label="Total Students Served"
            value={String(totalStudents)}
            color="text-primary"
            trend={`across ${schoolsParticipating} schools`}
            linkTo="/reports"
            loading={studentsLoading}
          />
          <StatCard
            icon={Activity}
            label="Program Coverage"
            value={`${programCoveragePct}%`}
            color="text-success"
            progress={programCoveragePct}
            linkTo="/reports"
            loading={studentsLoading}
          />
          <StatCard
            icon={CheckCircle}
            label="Orally Fit"
            value={`${orallyFitPct}%`}
            color="text-cyan-600"
            linkTo="/reports"
            loading={studentsLoading}
          />
          <StatCard
            icon={Shield}
            label="Schools Participating"
            value={`${schoolsParticipating} of 3`}
            color="text-muted-foreground"
            linkTo="/reports"
            loading={studentsLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-2">
          {/* School Comparison - Grouped Bar Chart */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-0.5">School Comparison</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Screened · treated · high-risk counts per school</p>
            <ChartBody ready={!studentsLoading}>
            <ResponsiveContainer width="100%" height={220} key="school-comparison-container">
              <BarChart data={schoolComparisonData} id="school-comparison-chart">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" key="school-grid" />
                <XAxis dataKey="school" angle={-15} textAnchor="end" height={80} tick={{ fontSize: 12 }} key="school-xaxis" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} key="school-yaxis" />
                <Tooltip key="school-tooltip" content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} key="school-legend" />
                <Bar dataKey="screened" fill={CHART.brand} name="Screened" key="school-bar-screened" maxBarSize={40} />
                <Bar dataKey="treated" fill={CHART.success} name="Treated" key="school-bar-treated" maxBarSize={40} />
                <Bar dataKey="highRisk" fill={CHART.danger} name="High Risk" key="school-bar-risk" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
            </ChartBody>
          </div>

          {/* Monthly Coverage Trend - Area Chart */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-3">Monthly Program Coverage Trend</h2>
            {/* No historical monthly snapshots exist yet -- honest empty state. */}
            <NoDataYet message="No historical coverage data yet. This chart will populate once monthly snapshots begin accumulating." />
          </div>
        </div>

        {/* Age Group Breakdown Table */}
        <div className="bg-card p-4 rounded-xl border border-border rise rise-3">
          <h2 className="text-sm font-bold text-foreground mb-0.5">Age Group Breakdown</h2>
          <p className="text-[11px] text-muted-foreground mb-3">Oral health status by DOH age bracket, all schools</p>
          <ChartBody ready={!studentsLoading}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                {/* header vocabulary matches the shared table convention
                    (studentListTableStyles, 23q) — no tracked-uppercase one-off */}
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Age Bracket</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Total Students</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Orally Fit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Needs Treatment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">Fitness Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
          </ChartBody>
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
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 rise">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">System monitoring and management</p>
          </div>
          <div className="ml-auto text-right text-xs text-muted-foreground hidden sm:block">
            <span className="block text-[13px] font-semibold text-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {extraLoading ? (
              <SkeletonBlock className="h-4 w-24 ml-auto" />
            ) : (
              <>{activeUsersCount} active user{activeUsersCount !== 1 ? 's' : ''}</>
            )}
          </div>
          <Link
            to="/accounts"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Users className="w-4 h-4" />
            Manage Accounts
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rise rise-1">
          <StatCard
            icon={Users}
            label="Active Users"
            value={String(activeUsersCount)}
            color="text-primary"
            linkTo="/accounts"
            loading={extraLoading}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rise rise-2">
          {/* Login Activity - Line Chart (real, from users' last_login) */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-0.5">Login Activity (Last 7 Days)</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Users seen per day, from last-login timestamps</p>
            <ChartBody ready={!extraLoading}>
            <ResponsiveContainer width="100%" height={220} key="login-activity-container">
              <LineChart data={loginActivityData} id="login-activity-chart">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" key="login-grid" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} key="login-xaxis" />
                <YAxis tick={{ fontSize: 12 }} key="login-yaxis" allowDecimals={false} />
                <Tooltip key="login-tooltip" content={<ChartTooltip />} />
                <Line type="monotone" dataKey="logins" stroke={CHART.brand} strokeWidth={2} dot={{ r: 5 }} key="login-line" />
              </LineChart>
            </ResponsiveContainer>
            </ChartBody>
          </div>

          {/* Actions by Module - Horizontal Bar Chart (real, from audit trail) */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h2 className="text-sm font-bold text-foreground mb-0.5">Actions by Module</h2>
            <p className="text-[11px] text-muted-foreground mb-3">Audit-trail entries per data model</p>
            <ChartBody ready={!extraLoading}>
            {actionsByModuleData.length === 0 ? (
              <NoDataYet message="No audit trail activity recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height={220} key="actions-module-container">
                <BarChart data={actionsByModuleData} layout="vertical" id="actions-module-chart">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" key="actions-grid" />
                  <XAxis type="number" tick={{ fontSize: 12 }} key="actions-xaxis" allowDecimals={false} />
                  <YAxis dataKey="module" type="category" width={100} tick={{ fontSize: 12 }} key="actions-yaxis" />
                  <Tooltip key="actions-tooltip" content={<ChartTooltip />} />
                  <Bar dataKey="actions" fill={CHART.brand} key="actions-bar" />
                </BarChart>
              </ResponsiveContainer>
            )}
            </ChartBody>
          </div>
        </div>

        {/* Recent Audit Activity (real) */}
        <div className="bg-card p-4 rounded-xl border border-border rise rise-3">
          <h2 className="text-sm font-bold text-foreground mb-0.5">Recent Audit Activity</h2>
          <p className="text-[11px] text-muted-foreground mb-3">Five most recent recorded actions</p>
          <ChartBody ready={!extraLoading}>
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
          </ChartBody>
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