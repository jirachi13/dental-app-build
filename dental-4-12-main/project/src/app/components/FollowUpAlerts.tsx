import { useState } from 'react';
import { Bell, MessageSquare, Send, CheckSquare } from 'lucide-react';

export const FollowUpAlerts = () => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsRecipients, setSmsRecipients] = useState<any[]>([]);

  const overdueFluoride = [
    {
      id: '1',
      name: 'Juan Dela Cruz',
      grade: 'Grade 4',
      school: 'Bagong Tanyag Integrated School',
      lastFluoride: '2025-08-15',
      monthsOverdue: 7,
      contact: '0917-123-4567',
    },
    {
      id: '2',
      name: 'Pedro Reyes',
      grade: 'Grade 5',
      school: 'South Daang Hari Elementary School Main',
      lastFluoride: '2025-09-01',
      monthsOverdue: 6.5,
      contact: '0918-234-5678',
    },
    {
      id: '3',
      name: 'Rosa Fernandez',
      grade: 'Grade 1',
      school: 'Bagong Tanyag Integrated School',
      lastFluoride: '2025-07-20',
      monthsOverdue: 8,
      contact: '0919-345-6789',
    },
  ];

  const missedAppointments = [
    {
      id: '4',
      name: 'Ana Garcia',
      grade: 'Grade 2',
      school: 'Bagong Tanyag Integrated School',
      appointmentDate: '2026-03-08',
      appointmentType: 'Extraction',
      contact: '0917-456-7890',
    },
    {
      id: '5',
      name: 'Jose Martinez',
      grade: 'Grade 6',
      school: 'Bagong Tanyag Elementary School Annex A',
      appointmentDate: '2026-03-05',
      appointmentType: 'Checkup',
      contact: '0918-567-8901',
    },
  ];

  const handleSelectStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id)
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (ids: string[]) => {
    const allSelected = ids.every(id => selectedStudents.includes(id));
    if (allSelected) {
      setSelectedStudents(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedStudents(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const allOverdueIds = overdueFluoride.map(s => s.id);
  const allMissedIds = missedAppointments.map(s => s.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Follow-up Alerts</h1>
        <p className="text-gray-600 mt-1">Students requiring follow-up attention</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Overdue Fluoride</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">{overdueFluoride.length}</div>
          <div className="text-xs text-orange-700 mt-1">Beyond 6 months since last application</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-6 h-6 text-red-600" />
            <span className="text-sm font-medium text-red-900">Missed Appointments</span>
          </div>
          <div className="text-3xl font-bold text-red-900">{missedAppointments.length}</div>
          <div className="text-xs text-red-700 mt-1">No-shows requiring rescheduling</div>
        </div>
      </div>

      {/* Overdue Fluoride Treatment */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Overdue Fluoride Treatment</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleSelectAll(allOverdueIds)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                {allOverdueIds.every(id => selectedStudents.includes(id)) ? 'Deselect All' : 'Select All'}
              </button>
              <button
                disabled={selectedStudents.filter(id => allOverdueIds.includes(id)).length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-[#06B6D4] text-white rounded-lg hover:bg-[#0891B2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Send SMS to Selected ({selectedStudents.filter(id => allOverdueIds.includes(id)).length})
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allOverdueIds.every(id => selectedStudents.includes(id))}
                    onChange={() => handleSelectAll(allOverdueIds)}
                    className="rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Fluoride
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {overdueFluoride.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleSelectStudent(student.id)}
                      className="rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.grade}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.school}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(student.lastFluoride).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      {student.monthsOverdue} months
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => {
                        alert(`SMS reminder sent to ${student.name}'s guardian at ${student.contact}`);
                      }}
                      className="text-sm text-[#06B6D4] hover:text-[#0891B2] font-medium flex items-center gap-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      SMS
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-4">
          {overdueFluoride.map((student) => (
            <div key={student.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => handleSelectStudent(student.id)}
                  className="mt-1 rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.grade} • {student.school}</p>
                </div>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  {student.monthsOverdue}mo
                </span>
              </div>
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Fluoride:</span>
                  <span className="text-gray-900">{new Date(student.lastFluoride).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contact:</span>
                  <span className="text-gray-900">{student.contact}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  alert(`SMS reminder sent to ${student.name}'s guardian at ${student.contact}`);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#06B6D4] text-white rounded-lg hover:bg-[#0891B2] transition-colors text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Send SMS Reminder
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Missed Appointments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Missed Appointments</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleSelectAll(allMissedIds)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                {allMissedIds.every(id => selectedStudents.includes(id)) ? 'Deselect All' : 'Select All'}
              </button>
              <button
                disabled={selectedStudents.filter(id => allMissedIds.includes(id)).length === 0}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-[#06B6D4] text-white rounded-lg hover:bg-[#0891B2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Send SMS to Selected ({selectedStudents.filter(id => allMissedIds.includes(id)).length})
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allMissedIds.every(id => selectedStudents.includes(id))}
                    onChange={() => handleSelectAll(allMissedIds)}
                    className="rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {missedAppointments.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleSelectStudent(student.id)}
                      className="rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.grade}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.school}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(student.appointmentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {student.appointmentType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => {
                        alert(`SMS reminder sent to ${student.name}'s guardian at ${student.contact}`);
                      }}
                      className="text-sm text-[#06B6D4] hover:text-[#0891B2] font-medium flex items-center gap-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      SMS
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-4">
          {missedAppointments.map((student) => (
            <div key={student.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => handleSelectStudent(student.id)}
                  className="mt-1 rounded border-gray-300 text-[#1E40AF] focus:ring-[#1E40AF]"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.grade} • {student.school}</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {student.appointmentType}
                </span>
              </div>
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Missed Date:</span>
                  <span className="text-gray-900">{new Date(student.appointmentDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contact:</span>
                  <span className="text-gray-900">{student.contact}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  alert(`SMS reminder sent to ${student.name}'s guardian at ${student.contact}`);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#06B6D4] text-white rounded-lg hover:bg-[#0891B2] transition-colors text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Send SMS Reminder
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};