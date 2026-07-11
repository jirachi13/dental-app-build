# HANDOFF — live state journal

**Compressed 2026-07-11 (hygiene pass).** Completed-sprint history → `docs/BUILD-LOG.md`; full pre-compression narratives → git history (`git show 73bc4e47:HANDOFF.md`). This file keeps only live state: current status, open work, warnings, and durable gotchas.

## Current status (2026-07-11)
- **Phase 1 + 2 DONE and deployed**: https://dental-app-build.vercel.app (Vercel; **push to main auto-deploys** — verified across the 23h–27b sprints; older notes saying CLI-only are superseded). ML service live on Render free tier at `https://floral-ml-service.onrender.com` (sleeps after ~15min idle; first request 30–60s, may 503 once — retry works).
- **Phase 3 built end-to-end on SYNTHETIC data** (21a–21g); re-run against real data BLOCKED — real dental IPTR Excel files still not in repo (`data/` = nutritional-status reports, verified via openpyxl). When they land: `clean_excel.py data/raw` → `build_features.py` → `run_experiments.py` → regenerate `algo-results.md`/`model-selection-rationale.md` → `train.py` → commit new `active/model.pkl` (Render auto-deploys) → UI's synthetic-data banner clears itself.
- **Last sprints**: 27c (chart Edit/Cancel/Save moved from page header into the tabs-card row they actually govern, right-aligned beside the tabs; Edit shows only on History/Chart tabs, Cancel/Save stay visible mid-edit; 07-11), 27b (chart view/edit mode, 07-10), 26 (encryption IV fix + migration run+verified, 07-10). All pushed and deployed.
- Local dev = 3 processes from `dental-4-12-main/project`: `npm run dev:server`, `npm run dev`, plus `uvicorn main:app --port 8000` from `ml-service/` if predictions are needed.
- Demo accounts: admin/dentist/aide/schooladmin/bho `@floral.com` — passwords rotated, live in `.env` (`SEED_*`) only, never in docs.

## Open work (each needs approval; sprint loop applies)
1. **Sprint 23 beautify — remaining** (ranked audit: `docs/beautify-audit.md`; done list: BUILD-LOG):
   - Remaining screens onto tokens: DentalChart only (Appointments 23r, RPCTracking 23s, AccountManagement 23t, Reports 23u done 07-11 — DOH printable region swapped too; token values computed-style-identical, html2canvas-pro resolves var()/oklch, but eyeball one PDF download after deploy). DentalChart: big file, own careful pass. Recurring gotcha: blanket text-gray-700 swap hits gray chip fallbacks (`bg-gray-100 text-gray-700`) — revert those to keep chip families literal. (Root + Dashboard done in 23g; PatientList + shared StudentListTableStyles done in 23q 07-11 — the shared table styles also carried DentalChartList/DentalChartNav/TreatmentRecords table shells onto tokens, so those screens only need their non-table chrome migrated). Established swap list: grays/brand-blue/focus-rings → tokens; status chips, info banners (blue-50/200/700), OCR confidence tints, neutral gray-50 hovers stay literal until a chip/banner pass.
   - X3 per-region loading, X4 state motion, final `polish` pass.
   - Optional chart polish (from 07-06): the two Dashboard PieCharts → horizontal bars; unify axis tick fonts (10–12px drift); centralize per-file `COLORS` objects.
2. **Other roles' dashboard/layout pass** — NOT small, needs its own scope (dentist dashboard is done; aide/school-admin/BHO/admin still on the old layout; their charts still use the old `COLORS` rainbow).
3. **Sprint 21a-d re-run on real data** — blocked on the user locating the real IPTR files (see above).
4. **Predictive-analytics dentist-validation UX** (pattern LOCKED 2026-07-07, build later): auto-fill model output into editable fields, styled visibly as "AI-suggested — validate before saving", one deliberate "Validate & Save" (no reflexive Approve, no modal stack), audit records whether the dentist changed the suggestion vs accepted as-is (Chapter-4 gold).
5. **Dark mode — NICE-TO-HAVE** (build only if time allows before defense). Do it via token migration, NOT scattered `dark:` classes. Safe build order: (1) re-add `.dark` token block (recover via `git show 36902173~1:dental-4-12-main/project/src/styles/theme.css`, retune to brand) + hidden localStorage toggle; (2) migrate surfaces component-by-component (Root → Dashboard → lists → DentalChart → Reports → forms → Login); (3) status/brand colors get explicit `dark:` variants; (4) edge cases — **PDF export + print MUST force LIGHT** (html2canvas captures live DOM), charts onto `--chart-N` tokens, Skeleton/gradeColors/schoolColors; (5) only then expose the toggle. Light stays default (daytime clinic tool).
6. **Route-level React.lazy** — only if bundle size ever matters (main ~990KB is mostly recharts/react; heavy libs already split).

## User-only items (no sprint)
- Locate real dental IPTR Excel files (unblocks 21a-d). Verify new files with an openpyxl header check before trusting them.
- Verify DOH form typo spellings (Transfussion/Scalling/Flouride) against the paper form before "fixing".
- Enable 2FA per account in Account Management once real staff emails are set (no account has it yet).
- Post-Sprint-26 live smoke (expected fine — seeder already exercised decrypt): Students list renders names; open one chart's medical history.
- Data quality: students with missing/invalid birthday get age 0 → FastAPI rejects them → can't be risk-assessed until the record is fixed.

## Live warnings
- **REPORT PRINT (browser Print) cropped — NOT fixed.** `@media print` `zoom: 0.45` can't fit the 77-col DOH table; rows drop. PDF (single zoomable page) + Excel (real column pagination) already handle this — real options: (a) column-band print CSS (needs live print-preview iteration), or (b) de-emphasize/remove the DOH Print button and point users to PDF/Excel.
- **TURNOVER CHECKLIST** (do at handover): transfer/re-own MongoDB Atlas, Vercel, Render, GitHub; new Brevo account + **rotate BREVO_API_KEY** (it passed through chat); update all env vars (MONGODB_URI, JWT secrets, FIELD_ENCRYPTION_SECRET ⚠ re-keying needs a data migration, RENDER_API_KEY, SEED_ADMIN_*, APP_URL); swap demo logins for real staff emails (so 2FA + reset work).
- **PRE-TURNOVER DATA CLEANUP** (user-gated, destructive — never run early): purge all seeded demo accounts + demo student/IPTR/RPC data via a dedicated confirmation-gated `reset:demo` script (doesn't exist yet) or manual Atlas cleanup; replace with real encoded IPTR records.
- If the app ever moves to a custom domain, add it to `ALLOWED_ORIGINS` on Vercel or login breaks (browsers send Origin on every POST; curl doesn't, so API tests won't catch it).
- **Before Defense**: encode real IPTR records to CSV → re-run algo experiments → update Chapter 4; ISO 25010:2023 evaluation (30 respondents); final ZAP scan.

## Durable gotchas (read before touching related code)
- **Server changes**: typecheck BOTH configs — `npx tsc --noEmit` AND `npx tsc -p tsconfig.server.json --noEmit` (regular tsc misses server-only errors; bit us in 23p).
- **Encrypted fields** (see CLAUDE.md DATA ENCRYPTION): plaintext equality queries NEVER match (random IVs) — fetch + filter in JS; CRUD uses `findById`+`.save()`, never `findByIdAndUpdate` (broken plugin hook); NEVER change `FIELD_ENCRYPTION_SECRET`.
- **Backups**: `server/scripts/backupRaw.ts` — raw EJSON dump via native driver (no mongoose hooks, ciphertext preserved) into `backups/` (gitignored, real PII). Restore = EJSON.parse + insertMany.
- **This machine's Node 24 + Atlas SRV DNS fails**: scripts must import `../dnsFix.js` (wired into local.ts, backupRaw, reencryptFieldIVs; older seeders lack it — add if one fails DNS).
- **SW/PWA testing**: use `npm run build` + `npm run preview` — the SW never runs in vite dev. Any SW change → re-test the offline write queue (`verify_pwa_toast.mjs` in project root).
- **Playwright chart verification**: fullPage screenshots restart recharts animations (captured at frame 0, look empty) — assert via DOM (`.recharts-bar-rectangle` count) or a tall fixed viewport.
- **Bulk edits in this repo**: Bash sandbox blocks sed/perl in-place writes and `cp` into the project dir — use Edit/Write tools or a Node `fs` script.
- **impeccable hook false positives**: recurring `gray-on-color` flags in DentalChart/Appointments (and RPCTracking L270) are active/inactive ternary branches — gray only ever renders on white. Re-verified 3×; don't re-fix.
- Verify scripts (`verify_*.mjs` in project root) read passwords from `.env` (`SEED_DENTIST_PASSWORD` etc.) — never hardcode.
- Login/school-resolution can take >5s on cold start — scripts wait for the sidebar selector, not fixed sleeps. `page.goto()` full-reloads and used to lose school state (now persisted in localStorage, but prefer clicking nav links).
- exceljs/jspdf/html2canvas/tesseract/pdfjs are dynamic-imported chunks excluded from SW precache — keep it that way (top-level import breaks the 2MB precache limit).
- `mongoose-field-encryption` + `exceljs` dependency pins: uuid override in package.json keeps `npm audit` at 0 — don't "fix" by downgrading exceljs.
