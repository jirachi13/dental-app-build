import { useState } from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';

export const AuditTrail = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-13');

  const auditLogs = [
    {
      id: '1',
      timestamp: '2026-03-13 14:35:22',
      user: 'Dr. Maria Santos',
      action: 'Updated dental chart',
      module: 'Dental Chart',
      details: 'Modified tooth #36 condition to Decayed (D)',
      ipAddress: '192.168.1.45',
    },
    {
      id: '2',
      timestamp: '2026-03-13 13:20:15',
      user: 'Ana Reyes',
      action: 'Created appointment',
      module: 'Appointments',
      details: 'Scheduled fluoride varnish for Juan Dela Cruz on 2026-03-15',
      ipAddress: '192.168.1.46',
    },
    {
      id: '3',
      timestamp: '2026-03-13 10:15:08',
      user: 'Dr. Maria Santos',
      action: 'Added treatment log',
      module: 'Treatment Log',
      details: 'Recorded extraction procedure for patient ID 001',
      ipAddress: '192.168.1.45',
    },
    {
      id: '4',
      timestamp: '2026-03-12 16:45:30',
      user: 'System Admin',
      action: 'Created user account',
      module: 'Account Management',
      details: 'New account for Dr. Jose Reyes (Dentist)',
      ipAddress: '192.168.1.1',
    },
    {
      id: '5',
      timestamp: '2026-03-12 14:22:18',
      user: 'Dr. Elena Martinez',
      action: 'Generated report',
      module: 'Reports',
      details: 'Monthly Oral Health Report for February 2026',
      ipAddress: '192.168.1.50',
    },
    {
      id: '6',
      timestamp: '2026-03-12 11:30:45',
      user: 'Ana Reyes',
      action: 'Sent SMS notification',
      module: 'Follow-up Alerts',
      details: 'Bulk SMS sent to 5 students with overdue fluoride',
      ipAddress: '192.168.1.46',
    },
    {
      id: '7',
      timestamp: '2026-03-11 15:10:33',
      user: 'Dr. Maria Santos',
      action: 'Validated AI recommendation',
      module: 'AI Analytics',
      details: 'Confirmed high-risk classification for patient ID 002',
      ipAddress: '192.168.1.45',
    },
    {
      id: '8',
      timestamp: '2026-03-11 09:55:20',
      user: 'Principal Jose Cruz',
      action: 'Viewed dashboard',
      module: 'Dashboard',
      details: 'Accessed school admin dashboard',
      ipAddress: '192.168.1.60',
    },
  ];

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUser = userFilter === 'all' || log.user === userFilter;
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const logDate = new Date(log.timestamp);
    const matchesDate = logDate >= new Date(startDate) && logDate <= new Date(endDate + ' 23:59:59');
    
    return matchesSearch && matchesUser && matchesModule && matchesDate;
  });

  const users = ['all', ...new Set(auditLogs.map(log => log.user))];
  const modules = ['all', ...new Set(auditLogs.map(log => log.module))];

  const getActionColor = (action: string) => {
    if (action.includes('Created') || action.includes('Added')) return 'text-green-600';
    if (action.includes('Updated') || action.includes('Modified')) return 'text-blue-600';
    if (action.includes('Deleted') || action.includes('Deactivated')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">{filteredLogs.length} activity logs</p>
        </div>
        
        <button 
          onClick={() => {
            alert('Exporting audit logs as CSV...');
          }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
              {users.map(user => (
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
              {modules.map(module => (
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
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{log.user}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-gray-900">{log.user}</div>
                <div className="text-xs text-gray-500 mt-1">{log.timestamp}</div>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {log.module}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              <div className="text-sm text-gray-600">{log.details}</div>
              <div className="text-xs text-gray-500">IP: {log.ipAddress}</div>
            </div>
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No audit logs found matching your filters.</p>
        </div>
      )}
    </div>
  );
};