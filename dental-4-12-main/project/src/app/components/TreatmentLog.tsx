import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Plus, Calendar, FileText } from 'lucide-react';
import { GradePill } from './GradePill';
import { useAuth } from '../context/AuthContext';

export const TreatmentLog = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [staffName, setStaffName] = useState('');
  const staffNameLabel = user?.role === 'dental_aide' ? 'Dental Aide' : 'Dentist';

  useEffect(() => {
    if (!user?.name) return;
    setStaffName(prev => prev || user.name);
  }, [user?.name]);

  const patient = {
    name: 'Juan Dela Cruz',
    grade: 'Grade 4',
  };

  const treatments = [
    {
      date: '2026-03-10',
      chiefComplaint: 'Toothache on lower right molar',
      diagnosis: 'Deep caries on tooth #36',
      treatment: 'Temporary filling applied, scheduled for extraction',
      dentist: 'Dr. Maria Santos',
      remarks: 'Patient advised to avoid hard foods. Follow-up in 1 week.',
    },
    {
      date: '2026-02-15',
      chiefComplaint: 'Routine checkup',
      diagnosis: 'Gingivitis, multiple caries',
      treatment: 'Oral prophylaxis, fluoride varnish application',
      dentist: 'Dr. Maria Santos',
      remarks: 'Oral hygiene instruction given to patient and guardian.',
    },
    {
      date: '2025-11-20',
      chiefComplaint: 'Bleeding gums',
      diagnosis: 'Moderate gingivitis',
      treatment: 'Scaling, oral hygiene instruction',
      dentist: 'Dr. Ana Cruz',
      remarks: 'Recommended twice-daily brushing with soft toothbrush.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/patients/${id}`}
          className="inline-flex items-center gap-2 text-[#1E40AF] hover:text-[#1E3A8A] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patient Profile
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Treatment Log</h1>
            <div className="mt-1 flex items-center gap-2 text-gray-600">
              <span>{patient.name}</span>
              <GradePill grade={patient.grade} />
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Treatment Entry
          </button>
        </div>
      </div>

      {/* Add Treatment Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Treatment Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{staffNameLabel}</label>
              <input
                type="text"
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
              <input
                type="text"
                placeholder="Patient's main concern..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
              <textarea
                rows={2}
                placeholder="Clinical findings and diagnosis..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Done</label>
              <textarea
                rows={2}
                placeholder="Treatment procedures performed..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                rows={2}
                placeholder="Additional notes, instructions, or follow-up details..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => {
                alert('Treatment entry saved successfully!');
                setStaffName(user?.name ?? '');
                setShowAddForm(false);
              }}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
            >
              Save Entry
            </button>
            <button
              onClick={() => { setStaffName(user?.name ?? ''); setShowAddForm(false); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Treatment History - Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chief Complaint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diagnosis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Treatment Done
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dentist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {treatments.map((treatment, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(treatment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {treatment.chiefComplaint}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {treatment.diagnosis}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {treatment.treatment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {treatment.dentist}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {treatment.remarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Treatment History - Mobile Cards */}
      <div className="md:hidden space-y-4">
        {treatments.map((treatment, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">
                {new Date(treatment.date).toLocaleDateString()}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-600 mb-1">Chief Complaint</div>
                <div className="text-sm text-gray-900">{treatment.chiefComplaint}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Diagnosis</div>
                <div className="text-sm text-gray-900">{treatment.diagnosis}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Treatment Done</div>
                <div className="text-sm text-gray-900">{treatment.treatment}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Dentist</div>
                <div className="text-sm text-gray-900">{treatment.dentist}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Remarks</div>
                <div className="text-sm text-gray-600">{treatment.remarks}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
