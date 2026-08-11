// Single source of truth for chart colors (Sprint 32 / beautify audit U3).
// Semantic mapping matches the app's status tokens (theme.css): green always
// means done/healthy, red always means needs-attention, amber is the middle
// tier, brand blue is the primary data series. Charts never invent their own
// hues — import from here so the same status reads the same everywhere.
export const CHART = {
  brand: '#1E40AF', // brand blue — primary series, scheduled, screened
  success: '#15803D', // green-700 — completed, orally fit, low risk
  warning: '#B45309', // amber-700 — medium risk
  danger: '#DC2626', // red-600 — missed, needs treatment, high risk
  neutral: '#9CA3AF', // gray-400 — not-yet-screened, unassessed
  teal: '#0D9488', // secondary categorical (Reports demographics)
  orange: '#EA580C', // tertiary categorical (Reports demographics)
} as const;

// Ordered risk palette — risk charts always use these three, never a rainbow.
export const RISK_COLORS = {
  low: CHART.success,
  medium: CHART.warning,
  high: CHART.danger,
} as const;

// Single-hue depth ramp for nested-subset funnels (the RPC Two-Visit Funnel):
// one measure at deepening stages, darkest = widest. The single hue is
// deliberate — three DIFFERENT hues would imply category or status meaning the
// stages don't carry, and green/amber/red are reserved for clinical status
// (DESIGN.md, The Fixed Meaning Rule). These sit between the official-blue
// tonal-ramp steps because they were tuned against a label that used to sit ON
// each bar. Lived inline in Dashboard.tsx until 2026-08-06.
//
// The `ink` field is gone (2026-08-11). It carried the label color for each
// step — dark on the palest bar, where white failed contrast — but Sprint C
// moved every bar value OUTSIDE the track, so no text sits on a fill any more
// and every value is foreground-colored. Keeping an unused key would have
// violated DESIGN.md's No-Dead-Tokens Rule. The three hues stay: they were
// chosen for the bars themselves, not for the labels.
export const FUNNEL_RAMP = [
  { color: CHART.brand },
  { color: '#4E74D6' },
  { color: '#9DB2EC' },
] as const;
