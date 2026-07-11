# FLORAL — Build Log (completed sprint history)

Historical record of finished work, moved out of CLAUDE.md to keep per-session context small. CLAUDE.md keeps only current status + pending items. This is a reference; HANDOFF.md remains the live state journal.

## Phase 1 — Foundation (DONE, deployed to production)
Sprints 1–17:
- 1 → Express MVC + MongoDB connection
- 2 → SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE models
- 3 → STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION models
- 4 → DENTAL_CHART, TOOTH_RECORD, TREATMENT models
- 5 → PREVENTIVE_CARE_RECORD, RISK_STRATIFICATION, APPOINTMENT, AUDIT_TRAIL models
- 6 → CRUD API all models
- 7 → JWT auth + 5 roles + RBAC
- 8 → Data encryption setup
- 9 → List all dummy frontend data
- 10 → Replace dummy with real API (UI intact, data only)
- 11 → Appointment scheduling module
- 12 → RPC 2-visit tracking module
- 13 → Dashboard + DOH reports module
- 14 → UI fixes + search + filter
- 15 → Soft delete + audit logs
- 15.5 → OWASP security + ZAP scan
- 16 → OCR Tesseract.js IPTR scanning
- 17 → Deploy to Vercel

## Phase 2 — Offline (DONE)
Sprints 18–20:
- 18 → PWA service worker review
- 19 → IndexedDB + FIFO queue
- 20 → Workbox sync + conflict handling

## Phase 3 — Algo (BUILD DONE on synthetic data; real-data re-run still blocked)
Sprints 21a–21g exercised end-to-end on synthetic data. Re-run against real IPTR data is blocked (real dental Excel files not yet in repo — see CLAUDE.md Predictive Analytics). Full task breakdown is authoritative in `/docs/phase3-sprint-prompts.md`.

## Phase 4 — Post-review backlog (completed items)
- Sprint 22 → DONE 2026-07-04: export dropdown (CSV/.xlsx) on all 4 list exports; exceljs dynamic-imported + precache-excluded; uuid pinned via npm override (audit stays 0); Word left out.
- Sprint 24 → DONE 2026-07-05: DOH Consolidated Report — Excel (.xlsx) export (3-tier merged header, frozen Indicator col + headers, landscape print titles) + reworked PDF into a single high-res zoomable whole-report page (SCALE auto-capped under ~16384px canvas limit, JPEG). Summary + footer capture fixed; footer sticky. Deployed + user-verified.
- Sprint 25 → DONE 2026-07-04: opt-in email 2FA (confirmation-gated enable — test code must round-trip the mailbox before 2FA can lock an account) + self-service reset links via Brevo (BREVO_API_KEY/BREVO_SENDER_EMAIL in .env + Vercel). 21-check E2E passed. NOTE: no account has 2FA enabled yet — enable per account in Account Management once real staff emails are set (this remains a live TODO, also tracked in CLAUDE.md).
- Sprint 27 → DONE 2026-07-04: root README.md (architecture, env vars, run/seed/test/deploy guides, privacy notes, doc map) distilled from HANDOFF; no secrets.
- Sprint 26 → DONE 2026-07-10: encryption random-IV fix. Removed the constant `saltGenerator` from `fieldEncryption.ts` (was a single global IV — same plaintext → same ciphertext app-wide); library now uses random IVs. Backward-compatible because decrypt reads the IV from the stored `<iv>:<ciphertext>` value. New `reencryptFieldIVs.ts` migration run against prod: 40 docs (20 Student, 2 DentalAide, 18 MedicalHistory, 0 Treatment), 0 failures, per-doc read-back canary all passed. New `backupRaw.ts` raw EJSON backup (Atlas M0 has no snapshots); backups/ gitignored (PII). seedStudents dedup rewritten to fetch+JS-filter.
- Sprint 27b → DONE 2026-07-10: dental chart is view-by-default with an explicit Edit mode (empty year auto-enters edit). Corrected same day: aides CAN edit History & Oral tabs (button reads "Edit History & Oral"); tooth palette/grid stay dentist-only; save made aide-safe (chart record only created when there are real tooth changes). Consent checkbox deliberately stays one-click.

## Sprint 23 — UI beautify series (2026-07-05 → 07-10, all deployed)
Ranked audit lives in `docs/beautify-audit.md`; anti-slop rules in HANDOFF. Completed sub-sprints:
- 07-05: contrast fix (81× gray-400→gray-500), keyboard a11y (`activatable()` on 6 clickable rows), dead shadcn `ui/` library removed (48 files), dead `.dark` block removed.
- 07-07: shared `Notice.tsx` inline banners (Login/ResetPassword/AccountManagement/Appointments/AIAnalytics).
- 23f: identity foundation — self-hosted Public Sans, `--primary`/`--ring` retuned to #1E40AF.
- 23g: token system live — semantic state tokens (`--primary-hover`, `-surface`, success/warning/danger) + Root/Dashboard migrated off literals.
- 23h: dentist dashboard redesign per approved mockup (StatCard chips, semantic RISK_COLORS, donut w/ center total, follow-ups list, header CTA).
- 23i: `--canvas` page bg token, RPC funnel + procedures restyle.
- 23j: entrance motion (`.rise`, `.grow-x`, reduced-motion-safe) + card subtitles.
- 23k/23l: Toast system (`Toast.tsx`, ToastProvider) + full wiring across all mutations; fixed silent-failure bug in appointment status change; found the bulk-import stub.
- 23m: bulk import made REAL (was a Figma-prototype fake success screen saving nothing) — CSV/xlsx parse, per-row validation, sequential POSTs, honest results.
- 23n: shared `Modal.tsx` (native `<dialog>`); all 9 hand-rolled overlays migrated.
- 23o: semantic chart palette extended to every remaining chart (Dashboard aide/school-admin/BHO, RPCTracking, Reports).
- 23p: `GET /stats/high-risk-count` + dentist-only sidebar risk badge; verified stale "small cleanups" items were already done.

## 2026-07-02 → 07-07 side-quests and fixes (full narratives in git history of HANDOFF.md, e.g. `git show 73bc4e47:HANDOFF.md`)
- Fake-data purge (pre-07-02): AIAnalytics fabricated AI + fake dentist validations → honest empty state; DentalChart full rewrite from 100% fake to real read+write persistence; TreatmentLog/PatientProfile/FollowUpAlerts deleted (dead code); Dashboard/Reports fake numbers → real or honest zero.
- Persona review panel + independent seats → `docs/persona-review-findings.md`; fix Sprints A (wrong-information bugs), B (identity/first-impression), C (friction/a11y, school persistence) all done + verified.
- Code-splitting: OCR/pdf.js dynamic chunk, main bundle 1,412→957KB; skeleton loaders everywhere.
- Dashboard improvements (07-04): RPC funnel, procedures, validated-assessments-by-month, follow-ups due — all real data.
- PWA update toast (07-04): `registerType: 'prompt'` + SKIP_WAITING listener + UpdateToast.tsx; offline queue re-verified.
- Chart-consistency (07-06): shared `ChartTooltip.tsx` on all 10 tooltips, recessive grids.
- Bulk queue/unqueue toggle in PatientList (07-07).
- Bulk risk-assessment partial-failure fix (07-07): transient vs permanent error classification; failed ids stay selected for one-click retry. Root cause: age 0 from missing birthday → FastAPI 422 (deterministic, not transient).
- 60s resend cooldown on 2FA/reset emails; appointment card date TZ fix; RPC early-Visit-2 flag; mixed-dentition hint; Reports defaults to current month/year (was hardcoded April 2026).
- ConfirmDialog on both destructive one-clicks (deactivate account, delete year); `npm run restore:admin` recovery script.
- Production incident fixes (07-02): ALLOWED_ORIGINS missing on Vercel broke login (curl sends no Origin — browsers do); wrong FIELD_ENCRYPTION_SECRET on Vercel broke /api/students (after env-var recreation, always smoke-test an encrypted-model read).
