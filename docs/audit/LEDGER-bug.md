# LEDGER — debugging track

Append-only. Stable IDs. **Nothing is deleted — status changes instead.**

Status: `OPEN` · `FIXED (Sprint N)` · `WONTFIX (reason)` · `NOT-A-BUG (reason)`
Severity: `HIGH` · `MED` · `LOW`

A row without an Evidence line (a `file:line`, or a command and its output) does not belong here.

Track B sprints: 158 Vitest harness · 159 offline/sync races · 160 data-fetch hooks ·
161 report arithmetic · 162 `DentalChart.tsx` decomposition. None started.

---

## Seeded from HANDOFF (measured before the audit began — recorded, not rediscovered)

### BUG-00 · `src/app/hooks/useDentalChartData.ts:85` · HIGH · OPEN
Claim:    The Dental Chart page shows only the FIRST charting of a school year and hides every later
          one, and no second charting can be created from the UI either.
Evidence: `useDentalChartData.ts:85` — `myCharts.find(c => c.iptr_id === iptr._id)` takes the first
          match; chart creation fires only `if (!chartId)`. **Measured on dev 2026-09-05: 22 of 26
          IPTRs have more than one chart.** One pupil has three (2025-08-14, 2026-01-19, 2026-07-09)
          and the page shows 3 of their 4 tooth records — the January finding is invisible.
Impact:   A dentist reading a pupil's chart sees an incomplete clinical record and is not told so.
Fix:      HANDOFF backlog #63 step 1 — show every charting for the year with its date, and allow a
          new one. ⚠ Deliberately NOT part of Sprint 162's decomposition: keeping the refactor
          behaviour-neutral is what makes a regression attributable to one change or the other.

### BUG-01 · `tallyIptrServices` vs `useDentalChartData` · MED · OPEN
Claim:    The app contradicts itself about how many chartings a school year may hold.
Evidence: `tallyIptrServices` deliberately orders MULTIPLE charts per IPTR by date and treats each as
          a sitting — that is how the DOH report derives "1st / 2nd application".
          `useDentalChartData:85` assumes exactly one. Recorded in HANDOFF backlog #63.
Impact:   The reporting layer and the chart screen cannot both be right. Filed DOH figures rest on
          the reporting layer's assumption; the clinician sees the other.
Fix:      Resolved by BUG-00's fix plus backlog #63 steps 2–3 (nullable `preventive_id` on
          `DENTAL_CHART`, then reports read the link instead of inferring from chart dates).
