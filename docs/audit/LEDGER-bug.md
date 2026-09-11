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
| 159 | Offline & sync races | DONE — 3 new, incl. a real double-drain race; SEC-27 confirmed |
| 160 | Data-fetch hooks | DONE — 3 new; the worst can show two pupils at once |
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

---

## Sprint 159 — offline & sync races

**Read:** `offline/queueProcessor.ts` · `offline/queueEvents.ts` · `hooks/useOfflineQueue.ts` ·
`App.tsx` (the trigger site) · `offline/db.ts` and `sw.ts`, already in context from Sprint 156.

### What is correct here, recorded so no later sprint re-derives it
- **FIFO is real.** `getQueue()` reads through the `timestamp` index, and equal timestamps fall back
  to the autoincrement primary key, so the order is stable.
- **The queue stops rather than skips**, exactly as CLAUDE.md requires: a network failure `break`s
  and leaves the item pending; a server rejection marks it failed and `break`s. Only a *conflict*
  uses `continue`, and the comment records that as the user's explicit choice — one contested record
  should not wedge unrelated writes behind it.
- **`sendDirect` deliberately does NOT go through `apiClient`**, with the reason written down:
  `apiClient` queues failed writes, so reusing it would re-queue a failed sync attempt and defeat
  "stop queue if sync fails, never skip".
- `discardFailedWrite` exists precisely because a permanently-rejected item would otherwise wedge the
  FIFO forever. A failed item is recoverable by Retry or removable by Discard — both are offered.
- The conflict check compares **only the fields this write actually touches**, so an unrelated edit
  elsewhere on the same record is correctly not treated as a conflict.

### BUG-03 · `src/app/offline/queueProcessor.ts:4` + `src/sw.ts` · HIGH · FIXED (Sprint 159a)
**Fixed 2026-09-11, together with SEC-27 — they had one cause, so they got one fix: the queue row
carried neither an owner nor a cross-context claim, and now carries both.**

The guard moved from a module variable to the **row**: `claimWrite(id, contextId)` in `db.ts` reads
and writes the claim **inside a single readwrite transaction**, which is the part that matters —
IndexedDB serialises overlapping readwrite transactions on the same store, so two contexts calling it
at the same instant cannot both win. `processQueue` claims before sending and skips any row already
claimed. `CONTEXT_ID` distinguishes the page from the service worker. `CLAIM_LEASE_MS` (60 s) frees a
row whose context was killed mid-send; the failure paths `releaseClaim` explicitly so an ordinary
retry does not wait out a lease.

`processing` is kept and its comment corrected — it still stops one context re-entering itself, it
was simply never the cross-context guard it was taken for.

⚠ **Not claimed as solved: exactly-once.** A context killed *after* the server accepted a write but
*before* the row is removed will re-send after the lease expires. Closing that needs server-side
idempotency, which no route has. The window went from "two contexts racing on every reconnect" to
"a context dies in the gap between send and remove".

Verified: `npm test` 55/55, `tsc` both configs, `npm run build` — all clean. The new rules are unit
tested in `queueRules.test.ts` (9 tests), including the two cases that were wrong before.

Original finding follows.

### BUG-03 (original) · HIGH
Claim:    **The `processing` re-entrancy guard does not hold across contexts, so the queue can drain
          twice at once and send the same write twice.**
Evidence: `let processing = false` is **module scope**. The page and the service worker are separate
          JavaScript contexts with separate module instances — `sw.ts` imports `processQueue`, and
          the SW is built as its own bundle (`injectManifest`). So there are **two independent
          `processing` flags over one shared IndexedDB queue**, and neither can see the other.
          Both fire on the same event: `initQueueProcessor` adds a `window` `online` listener *and*
          calls `processQueue()` immediately when `navigator.onLine`; the SW's `sync` handler runs
          `processQueue()` on the `floral-queue-sync` tag. Coming back online and opening the app is
          the normal field workflow, and it triggers both.
          Nothing in IndexedDB prevents it: `getQueue()` is a readonly transaction and
          `removeFromQueue` runs only **after** a successful send, so both contexts read the same
          rows and both `sendDirect` before either removes.
Impact:   Depends on the model, and the quiet case is the bad one.
          **Models with `uniqueBy` or `duplicateCheck`** (StudentIptr, Student): the second POST gets
          a 409, which `markFailed`s and **wedges the whole queue**, showing the encoder "already
          exists" for a record they created once.
          **Models with neither** (ToothRecord, Treatment, DayNote, Appointment,
          PreventiveCareRecord, MedicalHistory): **two identical records, silently.** On a tooth
          record or a treatment, that is a duplicated clinical entry in a patient's chart.
          ⚠ Honest bounds: Background Sync is Chromium-only (registration is guarded by
          `'SyncManager' in window` and no-ops on Safari), and the two triggers must land close
          together. This is a race, not a certainty — but the window is the exact moment the feature
          exists for.
Fix:      needs scoping. The guard has to live where both contexts can see it — a claim/lease field
          on the queue row itself, written in the same readwrite transaction that reads it, not a
          module variable. ⚠ `navigator.locks` would be simpler but is not shared with the service
          worker in every browser; verify before choosing it.

### BUG-04 · `server/routes/crudFactory.ts` PUT · MED · FIXED (Sprint 159b)
**Fixed 2026-09-11, both halves.** Fixing only the server would have turned a silent bad write into
a wedged queue, which is not obviously better.

**Server:** `PUT /:id` now carries the same archived check `GET /:id` has — 404, not 403, and
admin-exempt, **mirroring the GET path exactly so the two cannot drift**. A System Admin may already
read archived records, so editing one stays their call; everyone else is not even told it exists.
That is the minimal symmetric choice. ⚠ The stricter alternative — refuse the edit for *everyone*,
on the grounds that an archived record should be restored before it is edited — was considered and
**not** taken, because it removes a capability an admin may rely on and this sprint was approved for
a bug, not a policy change.

**Client:** a 404 on a queued write now gets an actionable message instead of the server's "Not
found" — *"The record this change belongs to was archived or removed while you were offline… Discard
this change."* The write still fails and still stops the queue, which is correct under CLAUDE.md's
"stop queue if sync fails, never skip"; what changed is that the person clearing it is told Discard
is the action, not Retry.

**Also corrected while in that block:** the PUT handler's own comment still carried the ARCH-06
justification that Sprint 157a fixed in three other places. It now says the same thing they do.

⚠ **Not covered by an automated test.** This is a route guard over a Mongoose model, not a pure
function, so Sprint 158's harness does not reach it; the `verify_*.mjs` pattern is the right tool and
needs a live server, which SEC-00 blocks on this machine. Verified by `tsc` on both configs, `npm run
build`, and 55/55 unit tests — none of which exercise this line. **Worth a live check on the laptop.**

Original finding follows.

### BUG-04 (original) · MED
Claim:    **A queued edit can write into an archived record**, because `PUT /:id` has no archive
          check — and the offline path is how it actually gets reached.
Evidence: `crudFactory`'s `GET /:id` explicitly 404s an archived record for non-admins. **`PUT /:id`
          does not**: it is `findById` → `if (!doc) 404` → `isInScope` → `Object.assign(doc, updates)`
          → `save()`. `findById` finds archived rows.
          The offline route in: `checkForConflict` returns `null` on any non-OK response — including
          the 404 an archived record now gives — so the conflict check is skipped and the PUT
          proceeds normally.
Impact:   A pupil's record is archived while an aide is offline; the aide's queued edit syncs and
          writes into the archived record, which no screen lists. The edit lands somewhere invisible
          and the encoder is told it succeeded. Reachable through the API directly too, not only via
          the queue, so it carries a SEC cross-reference as well.
Fix:      Give PUT the archived check GET already has. ⚠ Then decide deliberately what the queue
          should DO with the rejection: `markFailed` wedges the queue, so this probably wants to be a
          conflict rather than a failure.

---

## Sprint 160 — data-fetch hooks

**Read:** all 20 of `src/app/hooks/*` — structurally first (dependency arrays, guard patterns), then
in full for the ones whose inputs a user can change quickly.

**The shape of this sprint's findings: the fix already exists in this codebase.** Five hooks guard
against out-of-order responses (`useDohReportData` and `useSchoolSummary` with an `isStale()` /
`runIdRef` pair, `useGradeRoster` and `useLiveNumbers` with a `cancelled` flag, `useStudentNav`).
Fifteen do not. So this is not "nobody thought about it" — it is a known, working, in-house pattern
applied to some hooks and not others.

⚠ **A correction to my own first pass, recorded because it nearly became a wrong finding.** An early
grep truncated at 10 lines and I read it as "only 2 of 20 hooks guard". The real count is 5 of 20;
`useDohReportData` and `useSchoolSummary` both guard and were missed. Counts here come from a
per-file check, not a truncated grep.

### What is correct here
- **Dependency arrays are overwhelmingly primitives** — `fromMs`, `toMs`, `fromKey`, `key`,
  `schoolName`, `schoolYear`, `studentId` — not objects or arrays. That is the right defence against
  the refetch loop HANDOFF documents for `useAppointments`, and it has been applied broadly.
- `useRefreshOnFocus` is unusually well-reasoned: throttled at 30 s, listening on `visibilitychange`
  / `focus` / `online`, with an explicit argument for why an interval is the wrong shape (a billed
  invocation per tick to keep an unwatched tab warm) and an explicit warning never to put it on a
  screen holding unsaved edits.
- `useAppointments` uses `pendingWrites.length` as an effect dependency — the correct defensive form
  for an array whose identity changes every render.

### BUG-07 · `src/app/hooks/useDentalChartData.ts:162` · HIGH · FIXED (Sprint 160a)
**Fixed 2026-09-11.** Adopted the in-house `runIdRef` / `isStale()` pattern from `useDohReportData`
rather than inventing a third variant — the codebase already had two.

**Guarded at five points, not one**, which is the whole reason this bug was worse than staleness:
- `:104` **commit point 1** — identity (`setStudent`, `setSchoolName`, `setDentists`). Returns rather
  than falling through, so a superseded run also stops issuing its second round of requests.
- `:174` **commit point 2** — `setYears`.
- `:181` the error path, so a superseded run's failure does not raise "Failed to load" over a pupil
  the user has already navigated past.
- `:186` `endLoad`, so an abandoned run finishing first cannot report the screen ready while the run
  whose data is actually wanted is still in flight.
- `:194` effect cleanup bumps the id on unmount, matching `useDohReportData`.

⚠ **Checked before writing it: `useLoadPhase` is idempotent, not a counter** (`beginLoad` sets a
flag, `endLoad` clears it unconditionally), so gating `endLoad` cannot unbalance anything and leave a
stuck spinner. The newest run always clears it.

⚠ **Not unit-tested**, for the same reason as BUG-04: this is a React hook over `apiClient`, and
Sprint 158's harness is pure functions only. Testing it needs `@testing-library/react` + jsdom, which
is a new dependency and a scope decision, not something to slip into a fix. Verified by `tsc` on both
configs, `npm run build` and 55/55 existing tests — **none of which exercise this hook.** The real
check is manual: open a pupil's chart and click prev/next rapidly, confirming the name above the
chart always matches the chart.

**Deliberately NOT bundled:** BUG-00 lives in this same hook (`myCharts.find` hiding later
chartings). It changes *what* is displayed where this changed *when* it is committed, and keeping
them in separate commits keeps any regression attributable.

**A note for BUG-08's sweep:** this fix inlines the pattern a third time. At three sites that is
right — extracting a shared helper for three call sites would be premature. **At the eight further
sites BUG-08 names, the extraction starts paying for itself**, and that is the moment to do it, not
now.

Original finding follows.

### BUG-07 (original) · HIGH
Claim:    **The dental chart can display one pupil's identity above another pupil's teeth.** This is
          not ordinary staleness — a *mixed* state is reachable, because the hook commits state at
          two different awaits.
Evidence: `reload` is a `useCallback` keyed `[studentId]`, run by an effect on `[reload]`, with **no
          cancellation guard**. Inside, it awaits a first `Promise.all` (student, schools, IPTRs,
          dentists) and then **immediately commits** `setStudent`, `setSchoolName`, `setDentists`. It
          then awaits a *second* `Promise.all` (seven joined collections) and commits `setYears`.
          With two runs in flight, this interleaving is reachable:
          `A-first → setStudent(A)` · `B-first → setStudent(B)` · `A-second → setYears(A)`
          — leaving **pupil B's name, school and dentist above pupil A's chart years.**
Impact:   The trigger is the ordinary way of working: `useStudentNav` puts prev/next patient buttons
          on this very screen, and paging through a class means clicking next repeatedly. The screen
          then shows a clinically wrong record that looks entirely normal — no error, no empty state.
          ⚠ **`useStudentNav` itself guards. The hook it navigates *with* does not.** The two sit on
          the same screen.
Fix:      Add the `isStale()` / `runIdRef` guard `useDohReportData` already uses — **and check it
          before BOTH commit points**, not just the last one. A guard only on `setYears` would still
          allow the mixed state.
⚠ This is also the hook carrying BUG-00 (`myCharts.find` hiding later chartings). **Fix them
  separately** — BUG-00 changes what is displayed, BUG-07 changes when it is committed, and bundling
  them makes a regression unattributable.

### BUG-08 · `src/app/hooks/` — 15 files · MED · OPEN
Claim:    The out-of-order guard is applied to 5 of 20 hooks, and several of the 15 without one fetch
          on inputs a user can flip quickly.
Evidence: **With a guard:** `useDohReportData`, `useSchoolSummary`, `useGradeRoster`,
          `useLiveNumbers`, `useStudentNav`.
          **Without, and genuinely at risk:** `useDentalChartData` `[studentId]` (BUG-07),
          `useAppointments` `[fromMs, toMs]` (calendar paging), `useFhsisData` `[month, schoolName]`,
          `useRPCTracking` `[key]`, `useRiskClassification` `[key]`, `useAuditTrail` `[fromKey]`,
          `useDayNotes` `[fromKey, toKey]`, `useNotifications` `[enabled, schoolName]`.
          **Without, and fine:** `useSchools`, `useUsers`, `useStudents` (fetch once on `[]`), and
          `useLoadPhase`, `usePrintOrientation`, `useOfflineQueue`, `useRefreshOnFocus` (not fetch
          hooks at all).
Impact:   Every one of the at-risk hooks feeds a screen with a school switcher, a month/period
          selector or a date range — the controls people click twice in a second. The failure is
          silent: the older response wins and the screen shows the previous selection's numbers under
          the new selection's label. CLAUDE.md's rule that a control which appears to work must work
          is exactly what this breaks.
Fix:      Apply the existing pattern. ⚠ **Not a mechanical sweep** — do it per hook, checking each
          commit point, and prefer doing it alongside whatever sprint already touches that hook.
Note:     **No hook uses `AbortController`.** The in-house guard discards a late *result*; it does not
          cancel the request. That is a reasonable trade (simpler, and these are small GETs) and is
          recorded so nobody reports it again as a separate finding — but it does mean a fast
          switcher still pays the bandwidth for every response it throws away.

### BUG-09 · `src/app/hooks/useAppointments.ts:206` · LOW · OPEN
Claim:    A `useMemo` never hits its cache, because one dependency changes identity on every render.
Evidence: `}, [appointments, students, schools, dentists, pendingWrites]);` — `pendingWrites` comes
          from `usePendingWritesFor`, which returns `queue.filter(...)`, **a new array every render**.
          The effect 23 lines above it gets this right: `}, [pendingWrites.length, reload]);`.
Impact:   `buildSessions` re-runs on every render of every screen using appointments. Wasted work, not
          wrong output — and small, since the collections are already bounded by the date window.
          Worth fixing mainly because the same file already demonstrates the correct form, so the
          inconsistency will confuse the next reader.
Fix:      Depend on `pendingWrites.length`, or memoise `pendingWrites` at its source.

---

### BUG-06 · `server/utils/schoolScope.ts:99-132` · MED · OPEN
**Found while fixing BUG-04 — the neighbouring case, deliberately not fixed with it.**
Claim:    **The scope walk ignores `isArchived` entirely**, so archiving a parent does not take its
          children out of circulation, and a write may still name an archived parent.
Evidence: All four walk functions gather ids with no archive filter:
          `Student.find({ school_id: { $in: schools } })`,
          `StudentIptr.find({ student_id: { $in: … } })`,
          `DentalChart.find({ iptr_id: { $in: … } })`,
          `PreventiveCareRecord.find({ iptr_id: { $in: … } })` — each `.select("_id").lean()`, none
          with `isArchived: false`.
Impact:   Two effects, and the first is the same family as BUG-04.
          **Writes:** `isInScope("ToothRecord", req, body)` returns true for a `chart_id` whose chart
          is archived, so a queued (or direct) `POST /tooth-records` can create a **live** tooth
          record under an **archived** chart. BUG-04 closed the edit-into-archived path; this is the
          create-under-archived one.
          **Reads:** a list route's base filter is `isArchived: false` on the CHILD only, so a live
          child of an archived parent still returns — archiving an IPTR does not hide its medical
          history, charts or tooth records from an `?iptr_id=` query.
          ⚠ Whether the read half is *wrong* is a genuine design question, not an obvious bug: the
          child record is itself live. It should be decided, not patched by reflex.
Fix:      needs scoping — and it is a **policy decision first**: does archiving a parent archive its
          children (a cascade, which nothing in the app does today), or merely hide them? Answer that
          before touching the walk.
Note:     While reading these: each walk is an unbounded whole-collection read, memoised per request.
          At the Chapter 1 scale `studentIds` pulls ~8,000 ids on every scoped request. Same family
          as SEC-24; only scoped users (`school_admin`) pay it, which is why it has not been noticed.

### BUG-05 · `src/app/offline/queueProcessor.ts` `checkForConflict` · LOW · OPEN (known limitation)
Claim:    Conflict detection is check-then-act, with a window between the GET and the PUT.
Evidence: `checkForConflict` GETs the record and compares against `baselineSnapshot`; `sendDirect`
          then PUTs. Another writer landing between the two is not detected.
Impact:   Small, and inherent — it cannot be closed on the client alone, because no model carries a
          version or updated-at token the server could check an `If-Match` against. Recorded so the
          conflict feature is not described as stronger than it is.
Fix:      Real optimistic locking needs a server-side version field. Not worth doing for its own
          sake; worth knowing if a version field is ever added for another reason.

### SEC-27 — CONFIRMED, and the mechanism is worse than "possible"
Sprint 156 established that queue rows carry no owner. Sprint 159 has the trigger: **`App.tsx:10-12`
calls `initQueueProcessor()` in a root `useEffect(…, [])`, OUTSIDE `AuthProvider`**, and
`initQueueProcessor` calls `processQueue()` immediately whenever `navigator.onLine`. The queue
therefore drains **on every app load**, before and regardless of any login check, using whatever
session cookie the browser currently holds (`credentials: 'include'`).

- **Nobody logged in** → 401 → refresh fails → `markAuthRequired` and stop. **Fails safe.**
- **A DIFFERENT user logged in** → the writes go through under *their* session, and
  `logAudit(req.user!.id, …)` records **them** as the author. This is the case that matters, and it
  needs no unusual timing — only the next person to sign in on that clinic PC.

Plus the SW's background-sync path, which runs with no page and no session context at all.
