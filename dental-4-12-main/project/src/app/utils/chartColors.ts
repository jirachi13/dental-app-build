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
