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
