import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, TrendingUp, CheckCircle, Filter, Eye, Brain } from 'lucide-react';
import { GradePill } from './GradePill';

const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];

export const AIAnalytics = () => {
  const { selectedSchool } = useAuth();
  const navigate = useNavigate();

  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [validationFilter, setValidationFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'risk' | 'full'>('risk');

  // Helper functions
  const calculateAge = (birthdate: string) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getAgeGroup = (age: number) => {
    if (age <= 4) return '4 & below';
    if (age <= 9) return '5-9';
    if (age <= 14) return '10-14';
    if (age <= 19) return '15-19';
    return '20 & above';
  };

  // ── Risk Scoring Algorithm (mirrors Base44 logic) ──────────────────────────
  const computeRiskScore = (s: any) => {
    let score = 0;
    const factors: string[] = [];

    const dmft = (s.dmft_D || 0) + (s.dmft_M || 0) + (s.dmft_F || 0);
    if (dmft >= 4) { score += 3; factors.push(`DMFT score: ${dmft}`); }
    if ((s.dmft_D || 0) >= 3) { score += 3; factors.push('Untreated decayed teeth ≥ 3'); }
    if (s.dmftIncreased) { score += 3; factors.push('DMFT increased ≥ 2 over time'); }
    if ((s.dmft_X || 0) > 0) { score += 3; factors.push('Unresolved DX teeth'); }
    if (!s.lastVisit) { score += 2; factors.push('No treatment visits recorded'); }
    else {
      const daysSince = (Date.now() - new Date(s.lastVisit).getTime()) / 86400000;
      if (daysSince > 365) { score += 2; factors.push('Last visit > 12 months ago'); }
    }
    if (s.recurringGingivitis) { score += 2; factors.push('Recurring gingivitis'); }
    if (s.recurringDebris) { score += 2; factors.push('Recurring debris'); }
    if (s.sugarHabit) { score += 2; factors.push('Sugar habit'); }
    if (s.tobaccoUser) { score += 2; factors.push('Tobacco use'); }
    if (s.betelNut) { score += 2; factors.push('Betel nut use'); }
    if (s.diabetes) { score += 2; factors.push('Diabetes'); }
    if (!s.preventiveTreatment) { score += 2; factors.push('No preventive treatment recorded'); }
    if (s.is4Ps) { score += 1; factors.push('4Ps/NHTS member'); }
    if (s.thumbsucking) { score += 1; factors.push('Thumbsucking'); }

    const riskLevel = score >= 6 ? 'High' : score >= 3 ? 'Medium' : 'Low';
    const predictedIssue = score >= 6 ? 'Dental Caries Progression / Tooth Loss Risk'
      : score >= 3 ? 'Moderate oral health concern' : 'Good oral health';
    const recommendedAction = score >= 6 ? 'Priority scheduling; refer to City Health Office'
      : score >= 3 ? 'Schedule preventive care; oral hygiene counseling'
      : 'Standard annual monitoring';

    return { score, factors, riskLevel, predictedIssue, recommendedAction };
  };

  const [students, setStudents] = useState([
    {
      id: '1', name: 'Juan Dela Cruz', birthdate: '2016-03-15', gender: 'Male',
      grade: 'Grade 4', section: 'Sampaguita', school: 'Bagong Tanyag Integrated School',
      oralCondition: 'Severe Caries (Tooth #36, #46), Gingivitis (Generalized)',
      riskLevel: 'High', confidenceScore: 94, lastVisit: '2026-02-15',
      validated: false, validatedBy: null, validationDate: null, validationStatus: null,
      aiDetectedConditions: ['Severe Caries', 'Gingivitis', 'Poor Oral Hygiene'], modelVersion: 'v2.3.1',
      dmft_D: 5, dmft_M: 1, dmft_F: 2, dmft_X: 1, dmftIncreased: true,
      recurringGingivitis: true, recurringDebris: true, sugarHabit: true,
      tobaccoUser: false, betelNut: false, diabetes: false,
      preventiveTreatment: false, is4Ps: true, thumbsucking: false,
    },
    {
      id: '2', name: 'Maria Santos', birthdate: '2017-07-22', gender: 'Female',
      grade: 'Grade 3', section: 'Topaz', school: 'Bagong Tanyag Elementary School Annex A',
      oralCondition: 'Deep caries (Tooth #16), Abscess present',
      riskLevel: 'High', confidenceScore: 98, lastVisit: '2026-03-01',
      validated: true, validatedBy: 'Dr. Maria Santos', validationDate: '2026-03-02', validationStatus: 'approved',
      aiDetectedConditions: ['Deep Caries', 'Abscess', 'Infection'], modelVersion: 'v2.3.1',
      dmft_D: 4, dmft_M: 0, dmft_F: 1, dmft_X: 1, dmftIncreased: false,
      recurringGingivitis: false, recurringDebris: true, sugarHabit: true,
      tobaccoUser: false, betelNut: false, diabetes: false,
      preventiveTreatment: false, is4Ps: false, thumbsucking: false,
    },
    {
      id: '3', name: 'Pedro Reyes', birthdate: '2014-11-08', gender: 'Male',
      grade: 'Grade 5', section: 'Yakal', school: 'South Daang Hari Elementary School Main',
      oralCondition: 'Multiple caries (Teeth #14, #24, #36), Calculus build-up',
      riskLevel: 'High', confidenceScore: 91, lastVisit: '2026-01-20',
      validated: false, validatedBy: null, validationDate: null, validationStatus: null,
      aiDetectedConditions: ['Multiple Caries', 'Calculus', 'Plaque'], modelVersion: 'v2.3.1',
      dmft_D: 3, dmft_M: 2, dmft_F: 3, dmft_X: 0, dmftIncreased: true,
      recurringGingivitis: false, recurringDebris: true, sugarHabit: false,
      tobaccoUser: false, betelNut: false, diabetes: false,
      preventiveTreatment: false, is4Ps: true, thumbsucking: false,
    },
    {
      id: '4', name: 'Ana Garcia', birthdate: '2018-05-12', gender: 'Female',
      grade: 'Grade 2', section: 'Dahlia', school: 'Bagong Tanyag Integrated School',
      oralCondition: 'Moderate gingivitis',
      riskLevel: 'Medium', confidenceScore: 87, lastVisit: '2026-03-10',
      validated: true, validatedBy: 'Dr. Maria Santos', validationDate: '2026-03-10', validationStatus: 'approved',
      aiDetectedConditions: ['Gingivitis'], modelVersion: 'v2.3.1',
      dmft_D: 1, dmft_M: 0, dmft_F: 1, dmft_X: 0, dmftIncreased: false,
      recurringGingivitis: true, recurringDebris: false, sugarHabit: true,
      tobaccoUser: false, betelNut: false, diabetes: false,
      preventiveTreatment: true, is4Ps: false, thumbsucking: false,
    },
    {
      id: '5', name: 'Jose Martinez', birthdate: '2013-09-30', gender: 'Male',
      grade: 'Grade 6', section: 'Garnet', school: 'Bagong Tanyag Elementary School Annex A',
      oralCondition: 'Mild calculus build-up, Early caries (Tooth #26)',
      riskLevel: 'Medium', confidenceScore: 85, lastVisit: '2026-02-28',
      validated: true, validatedBy: 'Dr. Elena Reyes', validationDate: '2026-03-01', validationStatus: 'modified',
      aiDetectedConditions: ['Calculus', 'Early Caries'], modelVersion: 'v2.3.1',
      dmft_D: 1, dmft_M: 0, dmft_F: 2, dmft_X: 0, dmftIncreased: false,
      recurringGingivitis: false, recurringDebris: true, sugarHabit: true,
      tobaccoUser: false, betelNut: false, diabetes: false,
      preventiveTreatment: true, is4Ps: false, thumbsucking: false,
    },
    {
      id: '6', name: 'Rosa Fernandez', birthdate: '2019-01-25', gender: 'Female',
      grade: 'Grade 1', section: 'Sampaguita', school: 'Bagong Tanyag Integrated School',
      oralCondition: 'Orally fit - No caries detected',
      riskLevel: 'Low', confidenceScore: 96, lastVisit: '2026-03-05',
      validated: true, validatedBy: 'Dr. Maria Santos', validationDate: '2026-03-05', validationStatus: 'approved',
      aiDetectedConditions: [], modelVersion: 'v2.3.1',
      dmft_D: 0, dmft_M: 0, dmft_F: 0, dmft_X: 0, dmftIncreased: false,
      recurringGingivitis: false, recurringDebris: false, sugarHabit: false,
      tobaccoUser: false, betelNut: false, diabetes: false,
      preventiveTreatment: true, is4Ps: false, thumbsucking: false,
    },
  ]);

  const contextStudents = selectedSchool
    ? students.filter(s => s.school === selectedSchool)
    : students;

  const riskQueueIds = useMemo(() => new Set(['1', '2', '3', '4']), []);
  const sourceStudents = useMemo(
    () => (viewMode === 'risk' ? contextStudents.filter((s) => riskQueueIds.has(s.id)) : contextStudents),
    [contextStudents, viewMode, riskQueueIds],
  );

  const filteredStudents = sourceStudents
    .filter(student => {
      const age = calculateAge(student.birthdate);
      const ageGroup = getAgeGroup(age);

      const matchesGrade = gradeFilter === 'all' || student.grade === gradeFilter;
      const matchesSection = sectionFilter === 'all' || student.section === sectionFilter;
      const matchesAgeGroup = ageGroupFilter === 'all' || ageGroup === ageGroupFilter;
      const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
      const matchesRisk = riskFilter === 'all' || student.riskLevel === riskFilter;
      const matchesValidation = validationFilter === 'all' ||
        (validationFilter === 'validated' && student.validated) ||
        (validationFilter === 'pending' && !student.validated);

      const matchesSearch = !searchTerm || student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.section.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGrade && matchesSection && matchesAgeGroup && matchesGender && matchesRisk && matchesValidation && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by risk level: High first, then Medium, then Low
      const riskOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
      return riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder];
    });

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'High': return <AlertCircle className="w-4 h-4" />;
      case 'Medium': return <TrendingUp className="w-4 h-4" />;
      case 'Low': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Classification</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} listed</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setViewMode('risk')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'risk' ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Risk Classification</button>
          <button onClick={() => setViewMode('full')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'full' ? 'bg-white text-[#1E40AF] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Full List</button>
        </div>
      </div>
      <div className="space-y-4">

      {/* AI Model Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 mb-1">AI Model: Floral Oral Health Classifier v2.3.1</h3>
            <p className="text-sm text-purple-800">
              Deep learning model trained on 50,000+ dental images with 94% accuracy. Confidence threshold: 75%. 
              All AI predictions require dentist validation for clinical decision-making.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <button
            onClick={() => {
              setStudents(prev => prev.map(s => {
                const { riskLevel } = computeRiskScore(s);
                return { ...s, riskLevel };
              }));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium">
            <Brain className="w-3.5 h-3.5" /> Update Risk Scores
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grade Level</label>
            <select
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setSectionFilter('all'); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] appearance-none bg-white text-sm"
            >
              <option value="all">All Grades</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Section</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] appearance-none bg-white text-sm"
            >
              <option value="all">All Sections</option>
              {[...new Set((gradeFilter !== 'all' ? contextStudents.filter(s => s.grade === gradeFilter) : contextStudents).map(s => s.section))].sort().map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Age Group</label>
            <select
              value={ageGroupFilter}
              onChange={(e) => setAgeGroupFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] appearance-none bg-white text-sm"
            >
              <option value="all">All Ages</option>
              <option value="4 & below">4 & below</option>
              <option value="5-9">5-9</option>
              <option value="10-14">10-14</option>
              <option value="15-19">15-19</option>
              <option value="20 & above">20 & above</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] appearance-none bg-white text-sm"
            >
              <option value="all">Both</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Risk Level</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] appearance-none bg-white text-sm"
            >
              <option value="all">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Search</label>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search student or section" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-white text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Validation</label>
            <select
              value={validationFilter}
              onChange={(e) => setValidationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] appearance-none bg-white text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Validation</option>
              <option value="validated">Validated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student List with Risk Classifications */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Risk Classification List <span className="font-normal text-gray-400">({filteredStudents.length} students)</span></h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Risk Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">AI Conditions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Validation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} onClick={() => navigate(`/dental-chart/${student.id}?tab=ai&context=risk`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <GradePill grade={student.grade} />
                      <span>{student.school}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(student.riskLevel)}`}>
                      {getRiskIcon(student.riskLevel)}
                      {student.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${student.confidenceScore >= 90 ? 'bg-green-600' : student.confidenceScore >= 75 ? 'bg-blue-600' : 'bg-yellow-600'}`}
                          style={{ width: `${student.confidenceScore}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{student.confidenceScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {student.aiDetectedConditions.length > 0 ? student.aiDetectedConditions.join(', ') : <span className="text-gray-400">None</span>}
                  </td>
                  <td className="px-4 py-3">
                    {student.validated ? (
                      student.validationStatus === 'approved'
                        ? <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">✓ Approved</span>
                        : <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">✎ Modified</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">⏳ Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
};
