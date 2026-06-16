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
import { getGradeColor } from '../utils/gradeColors';
import { getSchoolColor, getSchoolShortName } from '../utils/schoolColors';
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
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Link } from 'react-router';

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

  const StatCard = ({ icon: Icon, label, value, color, trend, progress, linkTo }: any) => {
    const content = (
      <>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{label}</span>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
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
            <p className="text-xs text-gray-500 mt-1">{progress}% completion</p>
          </div>
        )}
      </>
    );

    if (linkTo) {
      return (
        <Link to={linkTo} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer block">
          {content}
        </Link>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {content}
      </div>
    );
  };


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
            <div className="text-xs text-gray-500">Current workspace</div>
          </div>
        </div>
        <button onClick={handleSwitchSchool} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
          <ArrowLeft className="w-3 h-3" />
          Switch School
        </button>
      </div>
    );
  };

  // ===== DENTIST DASHBOARD =====
  if (user?.role === 'dentist') {
    const riskDistributionData = [
      { name: 'High Risk', value: 24, color: COLORS.red },
      { name: 'Medium Risk', value: 58, color: COLORS.yellow },
      { name: 'Low Risk', value: 138, color: COLORS.green },
    ];

    const oralHealthTrendData = [
      { month: 'Jan', decayed: 45, treated: 28, orallyFit: 127 },
      { month: 'Feb', decayed: 52, treated: 35, orallyFit: 133 },
      { month: 'Mar', decayed: 48, treated: 42, orallyFit: 140 },
      { month: 'Apr', decayed: 38, treated: 48, orallyFit: 154 },
      { month: 'May', decayed: 35, treated: 52, orallyFit: 163 },
      { month: 'Jun', decayed: 28, treated: 58, orallyFit: 174 },
    ];

    const todaysAppointments = [
      { id: 1, school: 'Bagong Tanyag Integrated', grade: 'Grade 4', section: 'Sampaguita', time: '9:00 AM', studentCount: 32, status: 'Scheduled' },
      { id: 2, school: 'Bagong Tanyag Annex A', grade: 'Grade 2', section: 'Rose', time: '10:30 AM', studentCount: 28, status: 'In Progress' },
      { id: 3, school: 'South Daang Hari Main', grade: 'Grade 5', section: 'Narra', time: '1:00 PM', studentCount: 30, status: 'Scheduled' },
      { id: 4, school: 'Bagong Tanyag Integrated', grade: 'Grade 1', section: 'Tulip', time: '3:00 PM', studentCount: 25, status: 'Completed' },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dentist Dashboard</h1>
          <p className="text-sm text-gray-600 mt-0.5">Welcome back, {user?.name} — {selectedSchool ? getSchoolShortName(selectedSchool) : 'All Schools'}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Patients"
            value="215"
            color="text-blue-600"
            trend="↑ 12 this month"
            linkTo="/patients"
          />
          <StatCard
            icon={Calendar}
            label="Today's Appointments"
            value="7"
            color="text-cyan-600"
            trend="Next: 9:00 AM"
            linkTo="/appointments"
          />
          <StatCard
            icon={AlertCircle}
            label="High-Risk Patients"
            value="24"
            color="text-red-600"
            trend="Needs validation"
            linkTo="/patients?risk=high"
          />
          <StatCard
            icon={Shield}
            label="RPC Completion Rate"
            value="87%"
            color="text-green-600"
            progress={87}
            linkTo="/rpc"
          />
        </div>

        {/* Charts Row: Risk Distribution (LEFT) + Oral Health Trend (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Risk Distribution</h2>
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
                <Tooltip key="risk-tooltip" />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {riskDistributionData.map((item, idx) => (
                <div key={`risk-legend-${idx}`} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Oral Health Trend (Last 6 Months)</h2>
            <ResponsiveContainer width="100%" height={220} key="trend-container">
              <LineChart data={oralHealthTrendData} id="oral-health-trend-chart">
                <CartesianGrid strokeDasharray="3 3" key="trend-grid" />
                <XAxis dataKey="month" key="trend-xaxis" tick={{ fontSize: 11 }} />
                <YAxis key="trend-yaxis" tick={{ fontSize: 11 }} />
                <Tooltip key="trend-tooltip" />
                <Legend key="trend-legend" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="decayed" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} name="Decayed" key="trend-line-decayed" />
                <Line type="monotone" dataKey="treated" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} name="Treated" key="trend-line-treated" />
                <Line type="monotone" dataKey="orallyFit" stroke={COLORS.green} strokeWidth={2} dot={{ r: 3 }} name="Orally Fit" key="trend-line-fit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // ===== DENTAL AIDE DASHBOARD =====
  if (user?.role === 'dental_aide') {
    const appointmentsByStatusData = [
      { day: 'Mon', completed: 12, scheduled: 8, cancelled: 2 },
      { day: 'Tue', completed: 15, scheduled: 10, cancelled: 1 },
      { day: 'Wed', completed: 10, scheduled: 12, cancelled: 3 },
      { day: 'Thu', completed: 14, scheduled: 9, cancelled: 2 },
      { day: 'Fri', completed: 16, scheduled: 11, cancelled: 1 },
      { day: 'Sat', completed: 8, scheduled: 5, cancelled: 0 },
      { day: 'Sun', completed: 5, scheduled: 3, cancelled: 1 },
    ];

    const tasksByPriorityData = [
      { priority: 'High', count: 12 },
      { priority: 'Medium', count: 28 },
      { priority: 'Low', count: 45 },
    ];

    const pendingTasks = [
      { patient: 'Juan Dela Cruz', task: 'Complete Dental Chart', dueDate: '2026-04-12', priority: 'High' },
      { patient: 'Maria Santos', task: 'Schedule Follow-up', dueDate: '2026-04-13', priority: 'Medium' },
      { patient: 'Pedro Reyes', task: 'Send RPC Reminder', dueDate: '2026-04-14', priority: 'High' },
      { patient: 'Ana Garcia', task: 'Update Medical History', dueDate: '2026-04-15', priority: 'Low' },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dental Aide Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            label="Appointments Today"
            value="12"
            color="text-blue-600"
            linkTo="/appointments"
          />
          <StatCard
            icon={FileText}
            label="Pending Charts"
            value="8"
            color="text-yellow-600"
            trend="to complete"
            linkTo="/dental-charts"
          />
          <StatCard
            icon={AlertCircle}
            label="Follow-ups Due"
            value="15"
            color="text-red-600"
            trend="this week"
            linkTo="/patients"
          />
          <StatCard
            icon={Shield}
            label="RPC Visits Pending"
            value="23"
            color="text-cyan-600"
            linkTo="/rpc"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Appointments by Status - Stacked Bar Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Appointments by Status (This Week)</h2>
            <ResponsiveContainer width="100%" height={220} key="appt-status-container">
              <BarChart data={appointmentsByStatusData} id="appointments-status-chart">
                <CartesianGrid strokeDasharray="3 3" key="appt-grid" />
                <XAxis dataKey="day" key="appt-xaxis" />
                <YAxis key="appt-yaxis" />
                <Tooltip key="appt-tooltip" />
                <Legend key="appt-legend" />
                <Bar dataKey="completed" stackId="a" fill={COLORS.green} name="Completed" key="appt-bar-completed" />
                <Bar dataKey="scheduled" stackId="a" fill={COLORS.blue} name="Scheduled" key="appt-bar-scheduled" />
                <Bar dataKey="cancelled" stackId="a" fill={COLORS.red} name="Cancelled" key="appt-bar-cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pending Tasks by Priority - Horizontal Bar Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Pending Tasks by Priority</h2>
            <ResponsiveContainer width="100%" height={220} key="tasks-priority-container">
              <BarChart data={tasksByPriorityData} layout="vertical" id="tasks-priority-chart">
                <CartesianGrid strokeDasharray="3 3" key="tasks-grid" />
                <XAxis type="number" key="tasks-xaxis" />
                <YAxis dataKey="priority" type="category" key="tasks-yaxis" />
                <Tooltip key="tasks-tooltip" />
                <Bar dataKey="count" fill={COLORS.blue} key="tasks-bar">
                  {tasksByPriorityData.map((entry, index) => (
                    <Cell key={`task-cell-${index}`} fill={
                      entry.priority === 'High' ? COLORS.red :
                      entry.priority === 'Medium' ? COLORS.yellow :
                      COLORS.green
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Pending Tasks</h2>
          <div className="space-y-3">
            {pendingTasks.map((task, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{task.patient}</div>
                  <div className="text-sm text-gray-600">{task.task} • Due: {task.dueDate}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    task.priority === 'High' ? 'bg-red-100 text-red-800' :
                    task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== SCHOOL ADMIN DASHBOARD =====
  if (user?.role === 'clinic_staff') {
    const screeningCoverageData = [
      { name: 'Screened', value: 85, fill: COLORS.blue },
    ];

    const oralHealthStatusData = [
      { name: 'Orally Fit', value: 142, color: COLORS.green },
      { name: 'Needs Treatment', value: 68, color: COLORS.red },
      { name: 'Under Treatment', value: 45, color: COLORS.blue },
      { name: 'Needs Follow-up', value: 32, color: COLORS.yellow },
    ];

    const upcomingEvents = [
      { name: 'Bayanihan Dental Mission', date: '2026-04-20', school: 'Bagong Tanyag Integrated', students: 120 },
      { name: 'Fluoride Application Day', date: '2026-04-25', school: 'Bagong Tanyag Integrated', students: 85 },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">School Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">{user.schools?.[0]}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Students Enrolled"
            value="320"
            color="text-blue-600"
            linkTo="/reports"
          />
          <StatCard
            icon={CheckCircle}
            label="Students Screened"
            value="272"
            color="text-green-600"
            trend="85% coverage"
            linkTo="/reports"
          />
          <StatCard
            icon={Activity}
            label="Treatments Completed"
            value="156"
            color="text-cyan-600"
            linkTo="/reports"
          />
          <StatCard
            icon={Calendar}
            label="Upcoming Visits"
            value="Apr 20"
            color="text-yellow-600"
            linkTo="/appointments"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Screening Coverage - Radial Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Screening Coverage</h2>
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
                  85%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-center text-sm text-gray-600 mt-2">Students Screened</p>
          </div>

          {/* Oral Health Status - Pie Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Oral Health Status Breakdown</h2>
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
                <Tooltip key="oral-health-tooltip" />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {oralHealthStatusData.map((item, idx) => (
                <div key={`oral-health-legend-${idx}`} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Bayanihan Events */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Upcoming Bayanihan Events</h2>
          <div className="space-y-3">
            {upcomingEvents.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{event.name}</div>
                  <div className="text-sm text-gray-600">{event.date} • {event.school}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{event.students}</div>
                  <div className="text-xs text-gray-600">students expected</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== BARANGAY HEALTH OFFICE DASHBOARD =====
  if (user?.role === 'school_admin') {
    const schoolComparisonData = [
      { school: 'Bagong Tanyag Integrated', screened: 272, treated: 156, highRisk: 24 },
      { school: 'Annex A', screened: 245, treated: 138, highRisk: 18 },
      { school: 'South Daang Hari', screened: 298, treated: 175, highRisk: 28 },
    ];

    const coverageTrendData = [
      { month: 'Jan', coverage: 65 },
      { month: 'Feb', coverage: 68 },
      { month: 'Mar', coverage: 72 },
      { month: 'Apr', coverage: 75 },
      { month: 'May', coverage: 79 },
      { month: 'Jun', coverage: 82 },
    ];

    const ageGroupData = [
      { bracket: '0-5 years', total: 85, orallyFit: 58, needsTreatment: 27 },
      { bracket: '6-14 years', total: 612, orallyFit: 378, needsTreatment: 234 },
      { bracket: '15-19 years', total: 118, orallyFit: 82, needsTreatment: 36 },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Barangay Health Office Dashboard</h1>
          <p className="text-gray-600 mt-1">Aggregated data across all schools</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Students Served"
            value="815"
            color="text-blue-600"
            trend="across 3 schools"
            linkTo="/reports"
          />
          <StatCard
            icon={Activity}
            label="Program Coverage"
            value="82%"
            color="text-green-600"
            progress={82}
            linkTo="/reports"
          />
          <StatCard
            icon={CheckCircle}
            label="Orally Fit"
            value="63%"
            color="text-cyan-600"
            linkTo="/reports"
          />
          <StatCard
            icon={Shield}
            label="Schools Participating"
            value="3 of 3"
            color="text-gray-600"
            linkTo="/reports"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* School Comparison - Grouped Bar Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">School Comparison</h2>
            <ResponsiveContainer width="100%" height={220} key="school-comparison-container">
              <BarChart data={schoolComparisonData} id="school-comparison-chart">
                <CartesianGrid strokeDasharray="3 3" key="school-grid" />
                <XAxis dataKey="school" angle={-15} textAnchor="end" height={80} key="school-xaxis" />
                <YAxis key="school-yaxis" />
                <Tooltip key="school-tooltip" />
                <Legend key="school-legend" />
                <Bar dataKey="screened" fill={COLORS.blue} name="Screened" key="school-bar-screened" />
                <Bar dataKey="treated" fill={COLORS.green} name="Treated" key="school-bar-treated" />
                <Bar dataKey="highRisk" fill={COLORS.red} name="High Risk" key="school-bar-risk" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Coverage Trend - Area Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Monthly Program Coverage Trend</h2>
            <ResponsiveContainer width="100%" height={220} key="coverage-trend-container">
              <AreaChart data={coverageTrendData} id="coverage-trend-chart">
                <CartesianGrid strokeDasharray="3 3" key="coverage-grid" />
                <XAxis dataKey="month" key="coverage-xaxis" />
                <YAxis key="coverage-yaxis" />
                <Tooltip key="coverage-tooltip" />
                <Area type="monotone" dataKey="coverage" stroke={COLORS.blue} fill={COLORS.cyan} fillOpacity={0.6} key="coverage-area" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Group Breakdown Table */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Age Group Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age Bracket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orally Fit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Needs Treatment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fitness Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ageGroupData.map((group, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.bracket}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{group.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{group.orallyFit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{group.needsTreatment}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round((group.orallyFit / group.total) * 100)}%
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
    const loginActivityData = [
      { day: 'Apr 4', logins: 45 },
      { day: 'Apr 5', logins: 52 },
      { day: 'Apr 6', logins: 48 },
      { day: 'Apr 7', logins: 58 },
      { day: 'Apr 8', logins: 62 },
      { day: 'Apr 9', logins: 55 },
      { day: 'Apr 10', logins: 51 },
    ];

    const actionsByModuleData = [
      { module: 'Patients', actions: 342 },
      { module: 'Charts', actions: 278 },
      { module: 'Appointments', actions: 456 },
      { module: 'Reports', actions: 185 },
      { module: 'Accounts', actions: 92 },
    ];

    const recentAudit = [
      { time: '10:24 AM', user: 'Dr. Santos', action: 'Created Dental Chart', module: 'Charts', status: 'Success' },
      { time: '10:18 AM', user: 'Aide Cruz', action: 'Updated Patient Profile', module: 'Patients', status: 'Success' },
      { time: '10:12 AM', user: 'Dr. Reyes', action: 'Generated Report', module: 'Reports', status: 'Success' },
      { time: '10:05 AM', user: 'Admin Garcia', action: 'Created User Account', module: 'Accounts', status: 'Success' },
      { time: '09:58 AM', user: 'Unknown', action: 'Failed Login Attempt', module: 'System', status: 'Failed' },
    ];

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System monitoring and management</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Active Users"
            value="28"
            color="text-blue-600"
            linkTo="/accounts"
          />
          <StatCard
            icon={CheckCircle}
            label="System Uptime"
            value="99.8%"
            color="text-green-600"
            linkTo="/audit"
          />
          <StatCard
            icon={AlertCircle}
            label="Failed Logins Today"
            value="3"
            color="text-red-600"
            trend="security alert"
            linkTo="/audit"
          />
          <StatCard
            icon={Clock}
            label="Pending Actions"
            value="7"
            color="text-yellow-600"
            linkTo="/audit"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Login Activity - Line Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Login Activity (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={220} key="login-activity-container">
              <LineChart data={loginActivityData} id="login-activity-chart">
                <CartesianGrid strokeDasharray="3 3" key="login-grid" />
                <XAxis dataKey="day" key="login-xaxis" />
                <YAxis key="login-yaxis" />
                <Tooltip key="login-tooltip" />
                <Line type="monotone" dataKey="logins" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 5 }} key="login-line" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Actions by Module - Horizontal Bar Chart */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Actions by Module</h2>
            <ResponsiveContainer width="100%" height={220} key="actions-module-container">
              <BarChart data={actionsByModuleData} layout="vertical" id="actions-module-chart">
                <CartesianGrid strokeDasharray="3 3" key="actions-grid" />
                <XAxis type="number" key="actions-xaxis" />
                <YAxis dataKey="module" type="category" width={100} key="actions-yaxis" />
                <Tooltip key="actions-tooltip" />
                <Bar dataKey="actions" fill={COLORS.blue} key="actions-bar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Recent Audit Activity</h2>
          <div className="space-y-3">
            {recentAudit.map((log, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{log.time}</span>
                    <span className="font-medium text-gray-900">{log.user}</span>
                    <span className="text-sm text-gray-600">• {log.action}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Module: {log.module}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  log.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/audit"
            className="block mt-4 text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
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
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-600">No dashboard configured for your role.</p>
      </div>
    </div>
  );
};