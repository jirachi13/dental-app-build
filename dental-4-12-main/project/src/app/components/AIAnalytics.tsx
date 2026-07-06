import { useEffect, useMemo, useState } from 'react';
import {
  Brain, CheckCircle2, ChevronRight, ListOrdered, Loader2, Minus,
  Search, ShieldCheck, TrendingDown, TrendingUp,
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRiskClassification, type RiskCandidate } from '../hooks/useRiskClassification';
import { SkeletonStatGrid, SkeletonTable } from './Skeleton';
import { Notice } from './Notice';

// Sprint 21f — Risk Classification UI. Predictions come from the ML service
// via POST /api/predictions/assess (Express → FastAPI → predictor.py); a
// dentist MUST validate before anything is saved as clinical data
// (RISK_STRATIFICATION with validated_by_dentist), per CLAUDE.md's core rule.
//
// Sprint 21g — dentist decision support on top of 21f: risk overview tiles,
// priority-ordered student queue, and bulk assessment (predictions generated
// for many students at once, each audit-logged server-side). Validation stays
// strictly per-student through the same dentist panel — bulk never saves.

interface PredictionResult {
  risk_level: 'High' | 'Medium' | 'Low';
  confidence: number;
  probabilities: Record<string, number>;
  top_features: string[];
  recommendation: string;
  algorithm: string;
  model?: { trained_at?: string; n_records?: number; synthetic_data?: boolean };
}

interface ModelStatus {
  status: string;
  model: { display_name?: string; trained_at?: string; n_records?: number; synthetic_data?: boolean };
}

const RISK_BADGE: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};

const FEATURE_LABELS: Record<string, string> = {
  dmf_score: 'DMF score',
  decayed_count: 'Decayed teeth',
  missing_count: 'Missing teeth',
  filled_count: 'Filled teeth',
  gingivitis: 'Gingivitis',
  periodontal_disease: 'Periodontal disease',
  debris: 'Debris',
  calculus: 'Calculus',
  abnormal_growth: 'Abnormal growth',
  sugar_beverages: 'Sugary beverages',
  tobacco_user: 'Tobacco use',
  age: 'Age',
  sex: 'Sex',
};

export const AIAnalytics = () => {
  const { user, selectedSchool } = useAuth();
  const { candidates: allCandidates, loading, error, reload } = useRiskClassification();
  // scope to the selected school context, same as every other tab
  const candidates = useMemo(
    () => (selectedSchool ? allCandidates.filter((c) => c.school === selectedSchool) : allCandidates),
    [allCandidates, selectedSchool]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  // Shown on the result card so re-generating visibly changes something
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);
  // validation panel state
  const [decision, setDecision] = useState<'accept' | 'override'>('accept');
  const [overrideLevel, setOverrideLevel] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Sprint 21g — priority queue + bulk assessment state
  const [sortMode, setSortMode] = useState<'priority' | 'name'>('priority');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkResults, setBulkResults] = useState<Record<string, PredictionResult>>({});
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkFailed, setBulkFailed] = useState<number>(0);

  const isDentist = user?.role === 'dentist';

  useEffect(() => {
    apiClient
      .get<ModelStatus>('/predictions/status')
      .then((s) => setModelStatus(s))
      .catch(() => setServiceDown(true));
  }, []);

  // Priority order for the queue: validated High first, then Medium, then
  // students with no assessment yet (ranked by DMF — highest clinical
  // uncertainty x severity), then Low. Ties break on DMF score descending.
  const priorityRank = (c: RiskCandidate) => {
    const latest = c.history[c.history.length - 1];
    if (!latest) return 2.5; // unassessed sits between Medium (2) and Low (3)
    return { High: 1, Medium: 2, Low: 3 }[latest.riskLevel];
  };

  const gradeOptions = useMemo(
    () => [...new Set(candidates.map((c) => c.grade))].sort(),
    [candidates]
  );
  const sectionOptions = useMemo(
    () =>
      [...new Set(
        candidates.filter((c) => gradeFilter === 'all' || c.grade === gradeFilter).map((c) => c.section)
      )].sort(),
    [candidates, gradeFilter]
  );

  const filtered = useMemo(() => {
    const list = candidates.filter((c) => {
      if (!c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (gradeFilter !== 'all' && c.grade !== gradeFilter) return false;
      if (sectionFilter !== 'all' && c.section !== sectionFilter) return false;
      if (riskFilter !== 'all') {
        const latest = c.history[c.history.length - 1];
        if (riskFilter === 'Unassessed' ? !!latest : latest?.riskLevel !== riskFilter) return false;
      }
      return true;
    });
    if (sortMode === 'name') return list.sort((a, b) => a.name.localeCompare(b.name));
    return list.sort(
      (a, b) => priorityRank(a) - priorityRank(b) || b.features.dmf_score - a.features.dmf_score
    );
  }, [candidates, searchTerm, sortMode, gradeFilter, sectionFilter, riskFilter]);

  // Risk overview tiles — latest assessment per student + trend counts
  const overview = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0, unassessed: 0, worsening: 0, improving: 0 };
    const order = { Low: 0, Medium: 1, High: 2 };
    for (const c of candidates) {
      const latest = c.history[c.history.length - 1];
      if (!latest) { counts.unassessed++; continue; }
      counts[latest.riskLevel]++;
      if (c.history.length >= 2) {
        const delta = order[latest.riskLevel] - order[c.history[c.history.length - 2].riskLevel];
        if (delta > 0) counts.worsening++;
        else if (delta < 0) counts.improving++;
      }
    }
    return counts;
  }, [candidates]);

  const selected: RiskCandidate | null =
    candidates.find((c) => c.id === selectedId) ?? null;

  const selectStudent = (id: string) => {
    setSelectedId(id);
    // a bulk-generated prediction for this student flows straight into the
    // normal assessment card so validation works identically
    const cached = bulkResults[id] ?? null;
    setPrediction(cached);
    setGeneratedAt(cached ? new Date() : null);
    if (cached) setOverrideLevel(cached.risk_level);
    setPredictError(null);
    setSaveMessage(null);
    setNotes('');
    setDecision('accept');
  };

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAssessment = async () => {
    const ids = filtered.filter((c) => checkedIds.has(c.id)).map((c) => c.id);
    if (ids.length === 0) return;
    setBulkProgress({ done: 0, total: ids.length });
    setBulkFailed(0);
    const results: Record<string, PredictionResult> = {};
    let failed = 0;
    // sequential on purpose: the free-tier ML service handles one request at a
    // time gracefully, and progress stays honest
    for (const [i, id] of ids.entries()) {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate) continue;
      try {
        results[id] = await apiClient.post<PredictionResult>('/predictions/assess', {
          student_id: id,
          features: candidate.features,
        });
      } catch {
        failed++;
      }
      setBulkProgress({ done: i + 1, total: ids.length });
    }
    setBulkResults((prev) => ({ ...prev, ...results }));
    setBulkFailed(failed);
    setBulkProgress(null);
    setCheckedIds(new Set());
    // if the currently open student was in the batch, surface their result
    if (selectedId && results[selectedId]) {
      setPrediction(results[selectedId]);
      setOverrideLevel(results[selectedId].risk_level);
    }
  };

  const generate = async () => {
    if (!selected) return;
    setPredicting(true);
    setPredictError(null);
    setSaveMessage(null);
    try {
      const result = await apiClient.post<PredictionResult>('/predictions/assess', {
        student_id: selected.id,
        features: selected.features,
      });
      setPrediction(result);
      setGeneratedAt(new Date());
      setOverrideLevel(result.risk_level);
    } catch (err) {
      setPredictError(
        err instanceof ApiError && err.status === 503
          ? 'The prediction service is unreachable. Try again shortly.'
          : 'Failed to generate a risk assessment.'
      );
    } finally {
      setPredicting(false);
    }
  };

  const saveValidated = async () => {
    if (!selected || !prediction || !selected.latestPreventiveId) return;
    setSaving(true);
    try {
      const finalLevel = decision === 'accept' ? prediction.risk_level : overrideLevel;
      await apiClient.post('/risk-stratifications', {
        preventive_id: selected.latestPreventiveId,
        risk_level: finalLevel,
        recommendation:
          `${prediction.recommendation}\n\nDentist notes: ${notes.trim()}` +
          (decision === 'override'
            ? ` [Dentist override: model predicted ${prediction.risk_level}, dentist assessed ${finalLevel}]`
            : ''),
        dmf_score: selected.features.dmf_score,
        dmf_index: selected.dmfIndex,
        validated_by_dentist: true,
        validated_at: new Date().toISOString(),
      });
      setSaveMessage(`Validated assessment saved: ${finalLevel} risk.`);
      setPrediction(null);
      setNotes('');
      setBulkResults((prev) => {
        const { [selected.id]: _validated, ...rest } = prev;
        return rest;
      });
      reload();
    } catch {
      setSaveMessage('Failed to save the validated assessment.');
    } finally {
      setSaving(false);
    }
  };

  const trend = (history: RiskCandidate['history']) => {
    if (history.length < 2) return null;
    const order = { Low: 0, Medium: 1, High: 2 };
    const delta =
      order[history[history.length - 1].riskLevel] - order[history[history.length - 2].riskLevel];
    if (delta < 0) return { icon: TrendingDown, label: 'Improving', cls: 'text-green-600' };
    if (delta > 0) return { icon: TrendingUp, label: 'Worsening', cls: 'text-red-600' };
    return { icon: Minus, label: 'Stable', cls: 'text-gray-500' };
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Classification</h1>
        <p className="text-sm text-gray-500 mt-0.5">Predictive dental health risk classification</p>
      </div>

      {/* Always-on safety disclaimer (sprint rule: show on all AI outputs) */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          AI-assisted screening, <strong>not a diagnosis</strong>. Predictions only assist the
          dentist — no clinical action is taken without dentist validation, and every assessment is
          recorded in the audit trail.
        </span>
      </div>

      {serviceDown && (
        <Notice variant="error">
          The prediction service is currently unavailable. Assessments cannot be generated right now.
        </Notice>
      )}
      {modelStatus?.model?.synthetic_data && (
        <Notice variant="warning">
          <span>
            The current model ({modelStatus.model.display_name}) was trained on{' '}
            <strong>synthetic placeholder data</strong> — predictions are for demonstration and
            pipeline testing only until it is retrained on real IPTR records.
          </span>
        </Notice>
      )}

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading student data">
          <SkeletonStatGrid count={4} />
          <SkeletonTable rows={5} />
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm py-12 text-center">{error}</div>
      ) : (
        <>
          {/* Risk overview — latest assessment per student (Sprint 21g) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {([
              { label: 'High Risk', value: overview.High, cls: 'text-red-600' },
              { label: 'Medium Risk', value: overview.Medium, cls: 'text-yellow-600' },
              { label: 'Low Risk', value: overview.Low, cls: 'text-green-600' },
              { label: 'Unassessed', value: overview.unassessed, cls: 'text-gray-500' },
              { label: 'Worsening', value: overview.worsening, cls: 'text-red-600' },
              { label: 'Improving', value: overview.improving, cls: 'text-green-600' },
            ] as const).map((t) => (
              <div key={t.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <span className="text-sm text-gray-600">{t.label}</span>
                <p className={`text-xl font-bold mt-1 ${t.cls}`}>{t.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Student picker / priority queue */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col max-h-[70vh]">
            <div className="p-3 border-b border-gray-200 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <select
                  value={gradeFilter}
                  onChange={(e) => { setGradeFilter(e.target.value); setSectionFilter('all'); }}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Filter by grade"
                >
                  <option value="all">All Grades</option>
                  {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Filter by section"
                >
                  <option value="all">All Sections</option>
                  {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Filter by risk level"
                >
                  <option value="all">All Risk Levels</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                  <option>Unassessed</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setSortMode(sortMode === 'priority' ? 'name' : 'priority')}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  {sortMode === 'priority' ? 'Priority order' : 'Name order'}
                </button>
                <button
                  onClick={runBulkAssessment}
                  disabled={checkedIds.size === 0 || bulkProgress !== null || serviceDown}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-blue-700 disabled:bg-gray-300 rounded-lg px-2.5 py-1.5"
                >
                  {bulkProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  {bulkProgress
                    ? `Assessing ${bulkProgress.done}/${bulkProgress.total}…`
                    : `Assess Selected (${checkedIds.size})`}
                </button>
              </div>
              {bulkFailed > 0 && (
                <p className="text-xs text-red-600">
                  {bulkFailed} assessment{bulkFailed > 1 ? 's' : ''} failed — re-select those students and try again.
                </p>
              )}
            </div>
            <div className="overflow-y-auto divide-y divide-gray-100">
              {filtered.length === 0 && (
                <div className="text-gray-500 text-sm py-12 text-center">No students found</div>
              )}
              {filtered.map((c) => {
                const latest = c.history[c.history.length - 1];
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 px-3 py-3 hover:bg-gray-50 ${
                      c.id === selectedId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedIds.has(c.id)}
                      onChange={() => toggleChecked(c.id)}
                      disabled={bulkProgress !== null}
                      className="shrink-0 w-4 h-4 accent-[#1E40AF]"
                      aria-label={`Select ${c.name} for bulk assessment`}
                    />
                    <button
                      onClick={() => selectStudent(c.id)}
                      className="flex-1 min-w-0 text-left flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {c.school} · Grade {c.grade}-{c.section}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {bulkResults[c.id] && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200"
                            title={`Model predicted ${bulkResults[c.id].risk_level} — open to review and validate`}
                          >
                            {bulkResults[c.id].risk_level} · review
                          </span>
                        )}
                        {latest ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_BADGE[latest.riskLevel]}`}>
                            {latest.riskLevel}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200">
                            Unassessed
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assessment panel */}
          <div className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Select a student to generate a risk assessment.</p>
              </div>
            ) : (
              <>
                {/* Feature summary (auto-populated from real records) */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">{selected.name}</h2>
                      <p className="text-xs text-gray-500">
                        Input data auto-populated from this student's dental records
                      </p>
                    </div>
                    <button
                      onClick={generate}
                      disabled={predicting || serviceDown}
                      className="flex items-center gap-2 bg-[#1E40AF] hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
                    >
                      {predicting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      {predicting ? 'Analyzing…' : 'Generate Risk Assessment'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {(Object.entries(selected.features) as [string, number][]).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="text-xs text-gray-500">{FEATURE_LABELS[k] ?? k}</div>
                        <div className="font-medium text-gray-900">
                          {k === 'sex' ? (v === 1 ? 'M' : 'F') : v}
                        </div>
                      </div>
                    ))}
                  </div>
                  {predictError && <p className="text-sm text-red-600 mt-3">{predictError}</p>}
                  {saveMessage && (
                    <p className={`text-sm mt-3 ${saveMessage.startsWith('Failed') ? 'text-red-600' : 'text-green-700'}`}>
                      {saveMessage}
                    </p>
                  )}
                </div>

                {/* Result card */}
                {prediction && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Model Assessment</h3>
                      <span className="text-xs text-gray-500">
                        {prediction.algorithm}
                        {generatedAt && ` · generated ${generatedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${RISK_BADGE[prediction.risk_level]}`}>
                        {prediction.risk_level.toUpperCase()} RISK
                      </span>
                      <span className="text-sm text-gray-600">
                        Confidence: {(prediction.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      {(['High', 'Medium', 'Low'] as const).map((lvl) => (
                        <div key={lvl} className="flex items-center gap-2 text-xs">
                          <span className="w-14 text-gray-500">{lvl}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                lvl === 'High' ? 'bg-red-400' : lvl === 'Medium' ? 'bg-yellow-400' : 'bg-green-400'
                              }`}
                              style={{ width: `${(prediction.probabilities[lvl] ?? 0) * 100}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-gray-500">
                            {((prediction.probabilities[lvl] ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    {prediction.top_features.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1.5">Top contributing factors</div>
                        <div className="flex flex-wrap gap-1.5">
                          {prediction.top_features.map((f) => (
                            <span key={f} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              {FEATURE_LABELS[f] ?? f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      <span className="font-medium">Suggested recommendation: </span>
                      {prediction.recommendation}
                    </div>

                    {/* Dentist validation — the only path to saving anything */}
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Dentist Validation</h4>
                      {!isDentist ? (
                        <p className="text-sm text-gray-500">
                          Only a dentist can validate and save this assessment.
                        </p>
                      ) : !selected.latestPreventiveId ? (
                        <Notice variant="warning">
                          This student has no RPC (preventive care) visit on record — a risk
                          assessment attaches to an RPC visit per the record structure. Record
                          Visit 1 in RPC Tracking first, then validate here.
                        </Notice>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-4 text-sm">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={decision === 'accept'}
                                onChange={() => setDecision('accept')}
                              />
                              Accept model assessment ({prediction.risk_level})
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={decision === 'override'}
                                onChange={() => setDecision('override')}
                              />
                              Override:
                              <select
                                value={overrideLevel}
                                onChange={(e) => setOverrideLevel(e.target.value as 'High' | 'Medium' | 'Low')}
                                disabled={decision !== 'override'}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                              >
                                <option>High</option>
                                <option>Medium</option>
                                <option>Low</option>
                              </select>
                            </label>
                          </div>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Clinical notes (required) — basis for accepting or overriding this assessment"
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={saveValidated}
                            disabled={saving || notes.trim().length === 0}
                            className="flex items-center gap-2 bg-[#1E40AF] hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Save Validated Assessment
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risk history timeline */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Risk History</h3>
                    {(() => {
                      const t = trend(selected.history);
                      if (!t) return null;
                      const Icon = t.icon;
                      return (
                        <span className={`flex items-center gap-1 text-sm ${t.cls}`}>
                          <Icon className="w-4 h-4" /> {t.label}
                        </span>
                      );
                    })()}
                  </div>
                  {selected.history.length === 0 ? (
                    <p className="text-gray-500 text-sm py-6 text-center">
                      No previous risk assessments for this student.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selected.history
                        .slice()
                        .reverse()
                        .map((h) => (
                          <li key={h.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_BADGE[h.riskLevel]}`}>
                                {h.riskLevel}
                              </span>
                              <span className="text-gray-600">Visit: {h.visitDate}</span>
                              <span className="text-gray-500">DMF {h.dmfScore}</span>
                            </div>
                            <span className={`text-xs ${h.validated ? 'text-green-700' : 'text-gray-500'}`}>
                              {h.validated ? 'Dentist-validated' : 'Not validated'}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
};
