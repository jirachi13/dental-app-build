// ─── BMI ─────────────────────────────────────────────────────────────────────
// Derived from the height and weight recorded on that school year's IPTR, never
// stored — a stored copy drifts the moment either measurement is corrected,
// which is the same reason age is computed rather than kept (Sprint 57b).

/** BMI to one decimal, or null when either measurement is missing. */
export function computeBmi(heightCm: number | null | undefined, weightKg: number | null | undefined): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// ⚠ NO CATEGORY LABEL, and that is a clinical decision rather than an omission.
//
// The familiar Underweight / Normal / Overweight / Obese cut-offs (18.5, 25,
// 30) are defined for ADULTS. They are not valid for children and adolescents,
// whose healthy BMI changes with age and sex — the correct measure is
// BMI-for-age against a growth reference (WHO or the DOH/DepEd nutritional
// status tables), expressed as a z-score or percentile, which needs those
// reference tables and the child's exact age at measurement.
//
// Floral serves Kinder–Grade 10, i.e. almost entirely children. Printing
// "Normal" beside a 12-year-old's BMI using adult thresholds would be a
// clinical claim the system cannot support, and the DOH already collects
// nutritional status separately (the SNS reports in /data are exactly that).
//
// So the number is shown, plainly, with no interpretation attached. If a
// category is ever wanted, it needs the growth reference tables first — the
// arithmetic here is not the missing piece.
export const BMI_NOTE =
  'BMI shown without a category: the standard cut-offs are for adults, and a child’s healthy range varies with age and sex.';
