import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, FileText, Calendar, ClipboardList, User, Heart, Utensils, AlertCircle, Edit, TrendingUp, Plus } from 'lucide-react';

export const PatientProfile = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('medical');

  // Mock data - Updated with DOH IPTR-compliant fields
  const patient = {
    id: id,
    name: 'Juan Dela Cruz',
    dateOfBirth: '2016-03-15',
    age: 10,
    sex: 'Male',
    grade: 'Grade 4',
    section: 'Sampaguita',
    school: 'Bagong Tanyag Integrated School',
    philhealthId: 'PH-12345678',
    fourPsId: '4PS-87654321',
    indigenousGroup: 'None',
    parentGuardian: 'Maria Dela Cruz',
    contact: '0917-123-4567',
    email: 'guardian@email.com',
    address: '123 Tanyag St., Barangay Tanyag, Taguig City',
    riskLevel: 'High',
    recommendedAction: 'Immediate extraction needed for tooth #36. Schedule fluoride varnish application.',
  };

  // DOH IPTR-Compliant Medical History
  const medicalHistory = {
    // Medical Conditions
    heartDisease: false,
    hypertension: false,
    diabetes: false,
    asthma: true,
    tuberculosis: false,
    hepatitis: false,
    epilepsy: false,
    kidneyDisease: false,
    liverDisease: false,
    bleedingDisorder: false,
    pregnant: false, // For females
    lactating: false, // For females
    
    // Allergies
    drugAllergies: 'Penicillin',
    foodAllergies: 'None',
    latexAllergy: false,
    
    // Current Medications
    currentMedications: 'Salbutamol inhaler (as needed for asthma)',
    
    // Hospitalization History
    previousHospitalization: 'Admitted for asthma attack - January 2025',
    surgeryHistory: 'None',
    
    // Vital Signs (last recorded)
    bloodPressure: '110/70',
    heartRate: '78 bpm',
    temperature: '36.5°C',
    
    // Additional Notes
    specialNeeds: 'None',
    otherConditions: 'None',
  };

  const dietarySocialHabits = {
    // Dietary Habits
    sweetIntake: 'High - consumes candy and soda daily',
    mealFrequency: '3 meals per day',
    snackingHabits: 'Frequent between-meal snacking',
    waterIntake: '4-6 glasses per day',
    
    // Oral Hygiene Practices
    brushingFrequency: 'Once a day (morning only)',
    brushingTechnique: 'Horizontal scrubbing',
    toothpasteUsed: 'Fluoride toothpaste',
    dentalFlossing: 'Never',
    mouthwashUse: 'No',
    
    // Social Habits
    thumbSucking: 'No',
    tongueThrusting: 'No',
    mouthBreathing: 'Yes - occasional due to asthma',
    nailBiting: 'Sometimes',
    
    // Dental Visit History
    lastDentalVisit: '2025-09-15 (6 months ago)',
    reasonForLastVisit: 'Toothache',
    previousTreatments: 'Extraction of primary tooth #75',
    fluorideHistory: 'Last fluoride application: August 2025',
  };

  const oralHealthConditions = [
    { code: 'IPTR-001', name: 'Severe Caries', teeth: '#36, #46, #16', severity: 'High' },
    { code: 'IPTR-012', name: 'Gingivitis', location: 'Generalized', severity: 'Medium' },
    { code: 'IPTR-015', name: 'Calculus Build-up', location: 'Lower anterior', severity: 'Medium' },
  ];

  const dmftByYear = [
    { year: '2023-2024', d: 2, m: 0, f: 1, x: 0, t: 3, D: 1, M: 0, F: 0, X: 0, T: 1, oralStatus: 'Needs Treatment' },
    { year: '2024-2025', d: 1, m: 1, f: 2, x: 0, t: 4, D: 2, M: 0, F: 1, X: 0, T: 3, oralStatus: 'Under Treatment' },
    { year: '2025-2026', d: 1, m: 0, f: 2, x: 1, t: 4, D: 3, M: 0, F: 1, X: 1, T: 5, oralStatus: 'Needs Treatment' },
  ];

  const treatmentHistory = [
    { date: '2026-03-10', complaint: 'Toothache on lower right molar', diagnosis: 'Deep caries on tooth #36', treatment: 'Temporary filling; scheduled for extraction', dentist: 'Dr. Maria Santos', remarks: 'Avoid hard foods. Follow-up in 1 week.' },
    { date: '2026-02-15', complaint: 'Routine checkup', diagnosis: 'Gingivitis, multiple caries', treatment: 'Oral prophylaxis, fluoride varnish application', dentist: 'Dr. Maria Santos', remarks: 'Oral hygiene instruction given.' },
    { date: '2025-11-20', complaint: 'Bleeding gums', diagnosis: 'Moderate gingivitis', treatment: 'Scaling, oral hygiene instruction', dentist: 'Dr. Ana Cruz', remarks: 'Recommended twice-daily brushing.' },
    { date: '2025-08-05', complaint: 'Routine screening', diagnosis: 'Dental caries (primary) — teeth 84, 85', treatment: 'Fluoride varnish, SDF application', dentist: 'Dr. Maria Santos', remarks: 'Consent obtained. No adverse reactions.' },
    { date: '2025-03-12', complaint: 'Toothache', diagnosis: 'Irreversible pulpitis — tooth #75', treatment: 'Extraction of primary tooth #75', dentist: 'Dr. Ana Cruz', remarks: 'Post-extraction instruction given.' },
  ];

  const [showAddTreatment, setShowAddTreatment] = useState(false);

  const tabs = [
    { id: 'medical', label: 'Medical History', icon: Heart },
    { id: 'dietary', label: 'Dietary & Social Habits', icon: Utensils },
    { id: 'oral', label: 'Oral Health Condition', icon: ClipboardList },
    { id: 'records', label: 'Dental Records', icon: TrendingUp },
    { id: 'treatments', label: 'Treatment History', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 text-[#1E40AF] hover:text-[#1E3A8A] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patient List
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Patient Profile</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors">
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Photo */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            <div className="text-center lg:text-left">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                patient.riskLevel === 'High' 
                  ? 'bg-red-100 text-red-700' 
                  : patient.riskLevel === 'Medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {patient.riskLevel} Risk
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{patient.name}</h2>
              <p className="text-gray-600">{patient.grade} - {patient.section} • {patient.school}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">Date of Birth:</span>
                <span className="text-gray-900 font-medium">{patient.dateOfBirth}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">Age/Sex:</span>
                <span className="text-gray-900 font-medium">{patient.age} years old / {patient.sex}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">Indigenous Group:</span>
                <span className="text-gray-900 font-medium">{patient.indigenousGroup}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">PhilHealth ID:</span>
                <span className="text-gray-900 font-medium">{patient.philhealthId}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">4Ps ID:</span>
                <span className="text-gray-900 font-medium">{patient.fourPsId}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">Parent/Guardian:</span>
                <span className="text-gray-900 font-medium">{patient.parentGuardian}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">Contact:</span>
                <span className="text-gray-900 font-medium">{patient.contact}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 w-32">Address:</span>
                <span className="text-gray-900 font-medium">{patient.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendation Alert */}
        {patient.recommendedAction && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-600 rounded">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">AI Recommendation</h3>
                <p className="text-sm text-red-800">{patient.recommendedAction}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#1E40AF] text-[#1E40AF]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Medical Conditions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Heart Disease', value: medicalHistory.heartDisease },
                  { label: 'Hypertension', value: medicalHistory.hypertension },
                  { label: 'Diabetes', value: medicalHistory.diabetes },
                  { label: 'Asthma', value: medicalHistory.asthma },
                  { label: 'Tuberculosis', value: medicalHistory.tuberculosis },
                  { label: 'Hepatitis', value: medicalHistory.hepatitis },
                  { label: 'Epilepsy', value: medicalHistory.epilepsy },
                  { label: 'Kidney Disease', value: medicalHistory.kidneyDisease },
                  { label: 'Liver Disease', value: medicalHistory.liverDisease },
                  { label: 'Bleeding Disorder', value: medicalHistory.bleedingDisorder },
                ].map((condition, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{condition.label}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      condition.value ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {condition.value ? 'Yes' : 'No'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Drug Allergies</h4>
                <p className="text-sm text-red-600 font-medium">{medicalHistory.drugAllergies}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Food Allergies</h4>
                <p className="text-sm text-gray-600">{medicalHistory.foodAllergies}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Latex Allergy</h4>
                <p className="text-sm text-gray-600">{medicalHistory.latexAllergy ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Current Medications</h4>
                <p className="text-sm text-gray-600">{medicalHistory.currentMedications}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Medical History</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Previous Hospitalization</h4>
                  <p className="text-sm text-gray-600">{medicalHistory.previousHospitalization}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Surgery History</h4>
                  <p className="text-sm text-gray-600">{medicalHistory.surgeryHistory}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Vital Signs (Last Recorded)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-xs text-gray-600 mb-1">Blood Pressure</h4>
                  <p className="text-xl font-bold text-gray-900">{medicalHistory.bloodPressure}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-xs text-gray-600 mb-1">Heart Rate</h4>
                  <p className="text-xl font-bold text-gray-900">{medicalHistory.heartRate}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-xs text-gray-600 mb-1">Temperature</h4>
                  <p className="text-xl font-bold text-gray-900">{medicalHistory.temperature}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dietary' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dietary Habits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Sweet Intake</h4>
                  <p className="text-sm text-red-600 font-medium">{dietarySocialHabits.sweetIntake}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Meal Frequency</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.mealFrequency}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Snacking Habits</h4>
                  <p className="text-sm text-yellow-600 font-medium">{dietarySocialHabits.snackingHabits}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Water Intake</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.waterIntake}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Oral Hygiene Practices</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Brushing Frequency</h4>
                  <p className="text-sm text-yellow-600 font-medium">{dietarySocialHabits.brushingFrequency}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Brushing Technique</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.brushingTechnique}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Toothpaste Used</h4>
                  <p className="text-sm text-green-600 font-medium">{dietarySocialHabits.toothpasteUsed}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Dental Flossing</h4>
                  <p className="text-sm text-red-600 font-medium">{dietarySocialHabits.dentalFlossing}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Mouthwash Use</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.mouthwashUse}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Social Habits & Behaviors</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Thumb Sucking', value: dietarySocialHabits.thumbSucking },
                  { label: 'Tongue Thrusting', value: dietarySocialHabits.tongueThrusting },
                  { label: 'Mouth Breathing', value: dietarySocialHabits.mouthBreathing },
                  { label: 'Nail Biting', value: dietarySocialHabits.nailBiting },
                ].map((habit, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-1 text-sm">{habit.label}</h4>
                    <p className="text-sm text-gray-600">{habit.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dental Visit History</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Last Dental Visit</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.lastDentalVisit}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Reason for Last Visit</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.reasonForLastVisit}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Previous Treatments</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.previousTreatments}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">Fluoride History</h4>
                  <p className="text-sm text-gray-600">{dietarySocialHabits.fluorideHistory}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'oral' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Diagnosed Oral Health Conditions</h3>
              <div className="space-y-3">
                {oralHealthConditions.map((condition, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border-l-4 border-red-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{condition.name}</h4>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{condition.code}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {condition.teeth && <span>Affected teeth: {condition.teeth}</span>}
                          {condition.location && <span>Location: {condition.location}</span>}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        condition.severity === 'High' ? 'bg-red-100 text-red-800' :
                        condition.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {condition.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                to={`/dental-chart/${patient.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Full Dental Chart
              </Link>
            </div>
          </div>
        )}

        {/* ── Dental Records — DMFT by Year ────────────────────────────────── */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">DMFT Progression by School Year</h3>
              <Link
                to={`/dental-chart/${patient.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Open IPTR
              </Link>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">School Year</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-red-50">d</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-slate-50">m</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-blue-50">f</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-orange-50">x</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-700 bg-gray-100">dmft</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-red-50">D</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-slate-50">M</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-blue-50">F</th>
                    <th className="px-3 py-3 text-center font-medium text-gray-600 bg-orange-50">X</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-700 bg-gray-100">DMFT</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Oral Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dmftByYear.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.year}</td>
                      <td className="px-3 py-3 text-center text-red-700 bg-red-50">{row.d || ''}</td>
                      <td className="px-3 py-3 text-center text-slate-700 bg-slate-50">{row.m || ''}</td>
                      <td className="px-3 py-3 text-center text-blue-700 bg-blue-50">{row.f || ''}</td>
                      <td className="px-3 py-3 text-center text-orange-700 bg-orange-50">{row.x || ''}</td>
                      <td className="px-3 py-3 text-center font-bold text-gray-900 bg-gray-100">{row.t}</td>
                      <td className="px-3 py-3 text-center text-red-700 bg-red-50">{row.D || ''}</td>
                      <td className="px-3 py-3 text-center text-slate-700 bg-slate-50">{row.M || ''}</td>
                      <td className="px-3 py-3 text-center text-blue-700 bg-blue-50">{row.F || ''}</td>
                      <td className="px-3 py-3 text-center text-orange-700 bg-orange-50">{row.X || ''}</td>
                      <td className="px-3 py-3 text-center font-bold text-gray-900 bg-gray-100">{row.T}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.oralStatus === 'Orally Fit' ? 'bg-green-100 text-green-800' :
                          row.oralStatus === 'Under Treatment' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{row.oralStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Latest dmft (primary)', value: dmftByYear[dmftByYear.length - 1].t, color: 'text-red-700 bg-red-50' },
                { label: 'Latest DMFT (permanent)', value: dmftByYear[dmftByYear.length - 1].T, color: 'text-blue-700 bg-blue-50' },
                { label: 'Total school years', value: dmftByYear.length, color: 'text-gray-700 bg-gray-100' },
                { label: 'Trend', value: dmftByYear[dmftByYear.length-1].T > dmftByYear[0].T ? '↑ Worsening' : '↓ Improving', color: dmftByYear[dmftByYear.length-1].T > dmftByYear[0].T ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50' },
              ].map((kpi, i) => (
                <div key={i} className={`rounded-lg p-4 ${kpi.color}`}>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="text-xs mt-1 opacity-80">{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Treatment History ─────────────────────────────────────────────── */}
        {activeTab === 'treatments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Treatment History</h3>
              <button
                onClick={() => setShowAddTreatment(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
            </div>

            {showAddTreatment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">New Treatment Entry</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Dentist</label>
                    <input type="text" placeholder="Dr. Maria Santos" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Chief Complaint</label>
                    <input type="text" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Diagnosis</label>
                    <textarea rows={2} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Treatment Done</label>
                    <textarea rows={2} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                    <input type="text" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddTreatment(false)} className="px-4 py-1.5 text-sm bg-[#1E40AF] text-white rounded-lg hover:bg-[#1E3A8A]">Save</button>
                  <button onClick={() => setShowAddTreatment(false)} className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date', 'Chief Complaint', 'Diagnosis', 'Treatment Done', 'Dentist', 'Remarks'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {treatmentHistory.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{new Date(t.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-3 text-gray-900">{t.complaint}</td>
                      <td className="px-4 py-3 text-gray-900">{t.diagnosis}</td>
                      <td className="px-4 py-3 text-gray-900">{t.treatment}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{t.dentist}</td>
                      <td className="px-4 py-3 text-gray-500">{t.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {treatmentHistory.map((t, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm">{new Date(t.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="text-xs text-gray-500">{t.dentist}</span>
                  </div>
                  <p className="text-xs text-gray-600"><span className="font-medium text-gray-700">CC:</span> {t.complaint}</p>
                  <p className="text-xs text-gray-600"><span className="font-medium text-gray-700">Dx:</span> {t.diagnosis}</p>
                  <p className="text-xs text-gray-600"><span className="font-medium text-gray-700">Tx:</span> {t.treatment}</p>
                  {t.remarks && <p className="text-xs text-gray-400 italic">{t.remarks}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
