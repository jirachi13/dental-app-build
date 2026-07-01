import { useMemo, useState } from 'react';
import { Search, Filter, Calendar, Download } from 'lucide-react';
import { useAuditTrail } from '../hooks/useAuditTrail';
import { exportToCsv } from '../utils/exportCsv';
import { toLocalDateString } from '../utils/localDate';

export const AuditTrail = () => {
  const { logs, loading, error } = useAuditTrail();
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const users = useMemo(() => ['all', ...new Set(logs.map((log) => log.user))], [logs]);
  const modules = useMemo(() => ['all', ...new Set(logs.map((log) => log.module))], [logs]);

  const filteredLogs = useMemo(() => logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUser = userFilter === 'all' || log.user === userFilter;
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const logDate = new Date(log.timestamp);
    const matchesStart = !startDate || logDate >= new Date(startDate);
    const matchesEnd = !endDate || logDate <= new Date(endDate + ' 23:59:59');

    return matchesSearch && matchesUser && matchesModule && matchesStart && matchesEnd;
  }), [logs, searchTerm, userFilter, moduleFilter, startDate, endDate]);

  const getActionColor = (action: string) => {
    if (action.startsWith('Created')) return 'text-green-600';
    if (action.startsWith('Updated')) return 'text-blue-600';
    if (action.startsWith('Archived')) return 'text-red-600';
    if (action.startsWith('Restored')) return 'text-purple-600';
    return 'text-gray-600';
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const handleExportCsv = () => {
    exportToCsv(
      filteredLogs,
      [
        { label: 'Timestamp', value: (log) => formatTimestamp(log.timestamp) },
        { label: 'User', value: (log) => log.user },
        { label: 'Action', value: (log) => log.action },
        { label: 'Module', value: (log) => log.module },
        { label: 'Record ID', value: (log) => log.affectedRecordId },
      ],
      `audit_trail_${toLocalDateString(new Date())}.csv`,
    );
  };

  if (loading) {
    return <div className="text-sm text-gray-500 p-8 text-center">Loading audit trail…</div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-gray-500 mt-1">Audit trail is restricted to System Admin — make sure you're logged in with that role.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">{filteredLogs.length} activity logs</p>
        </div>
        <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            >
              {users.map((user) => (
                <option key={user} value={user}>
                  {user === 'all' ? 'All Users' : user}
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            >
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module === 'all' ? 'All Modules' : module}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent text-sm"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatTimestamp(log.timestamp)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{log.user}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getActionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{log.module}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">{log.affectedRecordId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-gray-900">{log.user}</div>
                <div className="text-xs text-gray-500 mt-1">{formatTimestamp(log.timestamp)}</div>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{log.module}</span>
            </div>
            <div className="space-y-2">
              <div>
                <span className={`text-sm font-medium ${getActionColor(log.action)}`}>{log.action}</span>
              </div>
              <div className="text-xs text-gray-400 font-mono">{log.affectedRecordId}</div>
            </div>
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="py-12 text-center text-gray-400">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No audit logs found matching your filters.</p>
        </div>
      )}
    </div>
  );
};
