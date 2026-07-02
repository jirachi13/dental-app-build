import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Brain, CheckCircle2, ChevronRight, Loader2, Minus,
  Search, ShieldCheck, TrendingDown, TrendingUp,
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRiskClassification, type RiskCandidate } from '../hooks/useRiskClassification';

// Sprint 21f — Risk Classification UI. Predictions come from the ML service
// via POST /api/predictions/assess (Express → FastAPI → predictor.py); a
// dentist MUST validate before anything is saved as clinical data
// (RISK_STRATIFICATION with validated_by_dentist), per CLAUDE.md's core rule.

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
  const { user } = useAuth();
  const { candidates, loading, error, reload } = useRiskClassification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [serviceDown, setServiceDown] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);
  // validation panel state
  const [decision, setDecision] = useState<'accept' | 'override'>('accept');
  const [overrideLevel, setOverrideLevel] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isDentist = user?.role === 'dentist';

  useEffect(() => {
    apiClient
      .get<ModelStatus>('/predictions/status')
      .then((s) => setModelStatus(s))
      .catch(() => setServiceDown(true));
  }, []);

  const filtered = useMemo(
    () =>
      candidates.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [candidates, searchTerm]
  );
  const selected: RiskCandidate | null =
    candidates.find((c) => c.id === selectedId) ?? null;

  const selectStudent = (id: string) => {
    setSelectedId(id);
    setPrediction(null);
    setPredictError(null);
    setSaveMessage(null);
    setNotes('');
    setDecision('accept');
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
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>The prediction service is currently unavailable. Assessments cannot be generated right now.</span>
        </div>
      )}
      {modelStatus?.model?.synthetic_data && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            The current model ({modelStatus.model.display_name}) was trained on{' '}
            <strong>synthetic placeholder data</strong> — predictions are for demonstration and
            pipeline testing only until it is retrained on real IPTR records.
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm py-12 text-center">Loading student data…</div>
      ) : error ? (
        <div className="text-red-500 text-sm py-12 text-center">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Student picker */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col max-h-[70vh]">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="overflow-y-auto divide-y divide-gray-100">
              {filtered.length === 0 && (
                <div className="text-gray-400 text-sm py-12 text-center">No students found</div>
              )}
              {filtered.map((c) => {
                const latest = c.history[c.history.length - 1];
                return (
                  <button
                    key={c.id}
                    onClick={() => selectStudent(c.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 ${
                      c.id === selectedId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {c.school} · Grade {c.grade}-{c.section}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {latest && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_BADGE[latest.riskLevel]}`}>
                          {latest.riskLevel}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </button>
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
                      <span className="text-xs text-gray-400">{prediction.algorithm}</span>
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
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          This student has no RPC (preventive care) visit on record — a risk
                          assessment attaches to an RPC visit per the record structure. Record
                          Visit 1 in RPC Tracking first, then validate here.
                        </p>
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
                    <p className="text-gray-400 text-sm py-6 text-center">
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
                              <span className="text-gray-400">DMF {h.dmfScore}</span>
                            </div>
                            <span className={`text-xs ${h.validated ? 'text-green-700' : 'text-gray-400'}`}>
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
      )}
    </div>
  );
};
