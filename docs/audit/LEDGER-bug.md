# LEDGER — debugging track

Append-only. Stable IDs. **Nothing is deleted — status changes instead.**

Status: `OPEN` · `FIXED (Sprint N)` · `WONTFIX (reason)` · `NOT-A-BUG (reason)`
Severity: `HIGH` · `MED` · `LOW`

A row without an Evidence line (a `file:line`, or a command and its output) does not belong here.

Track B sprints: 158 Vitest harness · 159 offline/sync races · 160 data-fetch hooks ·
161 report arithmetic · 162 `DentalChart.tsx` decomposition.

| Sprint | Surface | Status |
|---|---|---|
| 158 | Vitest harness + characterization tests | DONE — 46 tests, net verified, CI wired |
| 159 | Offline & sync races | not started |
| 160 | Data-fetch hooks | not started |
| 161 | Report arithmetic | not started |
| 162 | `DentalChart.tsx` decomposition | not started (gated on 158 ✅) |

---

## Sprint 158 — the harness

`npm test` (`vitest run`) · `npm run test:watch` · a `Test` step in `.github/workflows/ci.yml`
between the typechecks and the build. **46 tests across three files, all passing.**

- `shared/studentValidation.test.ts` (25) — the gate `crudFactory` calls on every Student write, and
  the module's own header notes it is the **only** check the offline queue passes through.
- `shared/age.test.ts` (11) — the DOH age brackets, and the cross-implementation pins below.
- `src/app/utils/bmi.test.ts` (10) — BMI-for-Age, focused on the property that it **refuses rather
  than guesses** outside the table's 6–19 coverage.

**The net was verified, not assumed:** changing `getAgeGroup`'s `age <= 9` boundary to `age <= 8`
failed `getAgeGroup maps each boundary to its bracket`; the file was then restored and `git diff`
confirmed clean.

⚠ **Three items on the plan's original list were NOT testable as pure functions**, and none should be
forced: `computeDMFT` is module-local inside `DentalChart.tsx` (extracting it is Sprint 162's job,
and doing it here would be the refactor 158 exists to make safe); `readIptrCheckboxes` needs an
`HTMLCanvasElement`; `findDuplicateStudents` is async and queries the database. The plan's list was
written before Track A mapped the codebase — **the better target it did not know about is
`shared/`, 2,129 lines of framework-free logic imported by both server and client**, of which this
sprint covers three modules. `dohAggregate`, `rpcTracking`, `riskCandidates`, `schoolSummary`,
`fhsis` and `reportsPanels` are the obvious next ones, and they are exactly what Sprint 161 reads.

---

### BUG-02 · `shared/age.ts`, `shared/dohAggregate.ts`, `shared/studentValidation.ts` · MED · OPEN
Claim:    **There are THREE age implementations and TWO age-bracket implementations in `shared/`**,
          and every filed DOH figure is built on them.
Evidence: `age.ts:calculateAge(birthdate)` → `number | null`, always relative to today ·
          `dohAggregate.ts:ageAt(birthdate, on)` → `number | null` · `studentValidation.ts:ageOn(birth,
          on = new Date())` → `number`. All three run the same year/month/day arithmetic.
          Brackets: `age.ts:getAgeGroup` returns `'4 & below' | '5-9' | …`; `dohAggregate.ts:bracketOf`
          (module-private) returns `'4 yrs & below' | '5-9 yrs' | …` — **same boundaries, different
          labels**.
          `age.ts`'s own header warns about precisely this: "a second copy is how two screens end up
          disagreeing about which bracket a 9-year-old is in — the DOH reports are built on these
          boundaries, so a divergence would be a reporting error, not a cosmetic one." There are now
          three copies.
Impact:   **They agree today — this is latent, not live**, and Sprint 158's tests now pin them
          together so a future divergence fails loudly here instead of quietly in a report filed with
          the City Health Office.
          One real asymmetry is already pinned: **`ageOn` returns `NaN` on an unparseable date where
          the other two return `null`.** Safe today only because `validateBirthdate` guards with
          `Number.isNaN` before calling it; any new caller that skips that guard gets `NaN`, which
          fails every comparison silently rather than loudly.
Fix:      needs scoping — one age function taking an explicit `on`, one bracket function, and the two
          label sets kept as a presentation concern on top. ⚠ Not urgent, and **not** to be bundled
          into Sprint 161: that sprint reads the report arithmetic and should not also be changing
          the primitives underneath it.

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
