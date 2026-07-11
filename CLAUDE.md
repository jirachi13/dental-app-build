# FLORAL — Dental Health Record Management System with Predictive Analytics
Capstone Thesis — Build Phase — Group 404 — AY 2025-2026

## CONTEXT MANAGEMENT
- Read CLAUDE.md fully first, then HANDOFF.md if it exists
- /compact when resuming long sessions
- List file structure without reading every file; ask before reading additional files
- Save sprint summary as HANDOFF.md after each sprint
- Concise responses, no filler, no pleasantries

## DOC ROLES + SELF-MAINTENANCE (adopted 2026-07-04)
- **CLAUDE.md** = rules/specs/decisions that constrain every session. Self-improves by REPLACEMENT: when a decision supersedes a line, rewrite/delete it the same turn — never just append. Injected into every session, so bloat here taxes everything.
- **HANDOFF.md** = state journal (what happened, current status). All narrative goes here, never into CLAUDE.md.
- **PRODUCT.md** (root, for /impeccable) = stable design identity. Update only on a genuine strategic pivot; a churning PRODUCT.md is noise.
- **DESIGN.md** (root, for /impeccable — not created yet) = visual system. Keep in sync by RE-DERIVING via `/impeccable document` when the design system materially changes, not by hand-editing.
- Every ~5 sprints, do a CLAUDE.md hygiene pass: delete superseded lines, compress resolved sagas to one-liners, verify build-phase status markers.

## MODEL STRATEGY (superseded 2026-07-04 → OPUS-ONLY)
- Fable is available again (2026-07-10). Split by task: **Fable = judgment** (scoping, plan mode, reviews, risky work), **Opus/Sonnet = execute written plans and light work** — premium capacity on light work is waste.
- Leave a precise plan in HANDOFF (or a plan-mode plan file) before executing, so any session/model can execute without re-deriving intent.

## BEHAVIOR RULES
- Think before coding, ask if unclear; simplicity first, no overengineering
- Surgical changes only, touch minimum files; minimum code that works, nothing more
- One sprint at a time — never start the next without approval; always commit after each sprint
- Confirm success criteria before building; ask clarifying questions if requirements unclear
- YAGNI: don't build it if it doesn't need to exist yet
- Prefer native platform features (e.g. `<input type="date">`) and stdlib/already-installed deps over new packages or custom code
- Before starting a sprint, give a one-line scope estimate (files touched, new models, complexity). Claude Code has no token/cost visibility here — this is the substitute for a usage warning.

## APP CONTEXT
- Floral — web app only (no mobile), internal use only, Barangay Tanyag, Taguig City
- ~8,000 student records; 1 dentist, 1 dental aide, 3 clinic staff
- Three schools: (1) Bagong Tanyag Integrated School (primary, K-G10), (2) Bagong Tanyag Elementary School Annex A (K-G6), (3) South Daang Hari Elementary School Main (K-G6)

## SCOPE LIMITATIONS (do not build)
- No mobile app, no national DOH database integration, no computer-vision caries detection, no biometric auth, no tele-dentistry
- Predictive module assists dentist only, never replaces clinical judgment; standalone platform only

## TECH STACK
- Frontend: React (PWA) · Backend: Node.js + Express.js (MVC) · DB: MongoDB
- Offline: Service Worker + IndexedDB · ML: Python (scikit-learn, pandas, numpy) via FastAPI
- OCR: Tesseract.js · Evaluation: ISO/IEC 25010:2023

## USER ROLES (5 roles)
- **System Admin** (super user) — manage all user accounts (create/edit/deactivate), assign roles + school assignments, view full audit trail, restore archived records, system settings. Not in the Chapter 3 ERD's original role list but authoritative — required for the system to function, enforced via RBAC (Sprint 7).
- **Dentist** — patient records, dental charting, appointments, predictive analytics, treatment administration; validates ALL treatment recommendations before clinical action
- **Dental Aide** — patient records, appointments, clinic coordination, RPC monitoring
- **School Administrator** — view school reports + dashboards only, no clinical records
- **Barangay Health Office Staff** — consolidated reports across all schools, City Health Office report submission

## MONGODB MODELS (exact from ERD Chapter 3)
Full field-level specs for all 16 models live in **`/docs/DATA-MODEL.md`** — READ IT before touching any schema, model, or migration (moved out of CLAUDE.md to keep per-session context small; that doc is authoritative for field details). Models: SCHOOL, USER, DENTIST, DENTAL_AIDE, STUDENT, STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION, DENTAL_CHART, TOOTH_RECORD, TREATMENT, PREVENTIVE_CARE_RECORD, RISK_STRATIFICATION, APPOINTMENT, DENTIST_ROTATION, AUDIT_TRAIL.

## SOFT DELETE RULES
- ALL models include: isArchived BOOLEAN default false, archivedAt DATETIME default null, archivedBy user_id default null
- All GET queries filter isArchived=false
- Only System Admin can view or restore archived records
- NEVER hard delete any record ever

## AUTH RULES
- JWT authentication, JWT expiry configured, refresh token handling
- 5 roles with strict RBAC; all routes protected by auth middleware; role checked on every API call
- bcrypt for all passwords
- Audit trail logs ALL user actions (additions, edits, archives) across all three school sites

## DATA ENCRYPTION
- Encrypt sensitive patient fields before saving to MongoDB. Do NOT encrypt fields needed for querying (isArchived, dates, IDs, role, school_id).
- Implemented Sprint 8 via `mongoose-field-encryption` (AES-256-CBC), scoped to: STUDENT (full_name, address, contact_number, guardian_name, guardian_contact, philhealth_number, fourps_id), DENTAL_AIDE (contact_number), MEDICAL_HISTORY (allergies, others — not the boolean flags), TREATMENT (diagnosis, treatment_done). USER.full_name NOT encrypted (staff name, not patient PII). CRUD routes for these models use findById+save (not findByIdAndUpdate) — see HANDOFF Sprint 8 for why.
- **Random IV per encryption (Sprint 26)** — values stored as `<iv>:<ciphertext>`, decrypt reads the IV from the stored value, so plaintext equality queries on encrypted fields NEVER match (fetch + filter in JS instead; see seedStudents/seedRpcVisit2). NEVER change `FIELD_ENCRYPTION_SECRET` — that is the one action that makes existing records permanently undecryptable.

## SECURITY
- OWASP Top 10 compliance before deployment; ZAP scan after deployment
- .env never committed; no stack traces in error messages ever
- Input validation + sanitization on all routes; Mongoose sanitization, no raw queries
- Audit trail on all data changes

## SYSTEM MODULES (7 per Chapter 3)
1. User authentication + role-based access
2. Student registration + dental records (IPTR) — medical history, dietary/social habits, oral health conditions
3. Digital dental charting — tooth-by-tooth, standard notation, DMF/dmf index tracking
4. Appointment scheduling + monitoring — follow-up flagging, parental supervision flags
5. Two-visit RPC monitoring — Visit 1 + 2, oral screening, prophylaxis, fluoride varnish, hygiene instruction, caries risk assessment
6. Predictive analytics integration — risk classification (High/Medium/Low), treatment recommendations, dentist validation
7. Dashboard + automated DOH report generation — age-bracket + gender counts, monthly standardized reports, interactive dashboard

## OCR MODULE
- Tesseract.js scans DOH IPTR paper forms; extracts only: name, birthday, age, sex, address, contact number, grade level, section → structured JSON mapped to STUDENT fields

## PREDICTIVE ANALYTICS (Phase 3)
- Python (scikit-learn, pandas, numpy) via FastAPI. Key inputs: DMF/dmf index (PRIMARY), oral health conditions, dietary habits, medical history, treatment history. Risk output: High/Medium/Low.
- Pipeline: preprocess → feature-engineer → train + compare → risk output
- **Architecture:** Strategy Pattern for algo swapping. Active algo in config.py only. Express calls predictor.py only — never individual algo files. Dentist MUST validate before clinical action.
- **Algorithms (all 5 run — DECIDED 2026-07-02, SVM stays):** Logistic Regression, Decision Tree, Random Forest, SVM, XGBoost. Primary feature: DMF/dmf score. Metric priority: F1. Generate a visual decision tree for Chapter 4.
- **Evaluation (both, report Accuracy/Precision/Recall/F1/Confusion Matrix per algo):** Train/Test 80/20 (secondary) + Stratified K-Fold k=5 (**primary**, final selection by K-Fold F1). K=5 over K=10 because ~8,000 records with imbalanced conditions (rare conditions unreliable in K=10's smaller folds). Save results to `/docs/algo-results.md`. Train/Test-vs-K-Fold gap is itself a Chapter 4 discussion point (agreement = stable; K-Fold≫ = lucky split; K-Fold≪ = overfitting caught).
- **BLOCKED — real data not in repo:** Real IPTR Excel from Barangay Tanyag clinics (full IPTR fields, inconsistent formatting) is the intended training data, but all files currently in `/data/` are Simplified Nutritional Status (SNS) reports with ZERO dental fields (verified via openpyxl). Real dental IPTR files exist separately and must be located/added before Sprint 21a. Do NOT train against the Sprint 10 demo seeder (18 records — meaningless sample).
- **Privacy (RESOLVED):** `full_name`/any name column is dropped entirely from the ML pipeline (not just anonymized) — rows identified by student_id or a `Student_001` placeholder. Real names stay encrypted in MongoDB only. No adviser sign-off needed to proceed.

## REPORTING MODULE
- School Oral Health Status + Service Report; Consolidated Report for City Health Office (DOH-aligned)
- Age-bracket + gender counts, monthly automated generation, interactive dashboards, filterable/searchable records, follow-up alerts

## PWA / OFFLINE (Phase 2)
- Offline storage: IndexedDB. Sync FIFO (oldest timestamp first) — stop queue if sync fails, never skip. Background sync: Workbox.
- Show offline banner when disconnected; disable form submissions when offline.

## BUILD PHASES

**Completed work (Phase 1 Sprints 1–17, Phase 2 18–20, Phase 3 synthetic dry-run 21a–g, Phase 4 Sprints 22/24/25/26/27/27b + the 23-series beautify sub-sprints):** history moved to **`/docs/BUILD-LOG.md`**. Phase 1 + 2 are DONE and deployed. Only the pending items below remain.

**Phase 3 — Algo (BUILD DONE on synthetic data; re-run against REAL data BLOCKED — see Predictive Analytics above):** full 21a–21g task breakdown is authoritative in **`/docs/phase3-sprint-prompts.md`** — read it before any Phase 3 work; each sub-sprint needs approval before the next. Chapter 4: state that real IPTR records (after cleaning) were the training data — stronger than synthetic.

**PENDING backlog (each needs approval, sprint loop applies):**
- Sprint 21a-d (real data) → re-run clean→features→experiments→select once real IPTR files located (only remaining Phase 3 work)
- Sprint 23 beautify remainder → per-region loading (X3) + state motion (X4) + polish; optional chip/banner token pass (token migration of all screens DONE 07-11); ranked audit in `docs/beautify-audit.md`, done list in BUILD-LOG; anti-slop rules in HANDOFF apply
- Live TODO (from Sprint 25): no account has 2FA enabled yet — enable per account in Account Management once real staff emails are set
- User-only items (no sprint): locate real IPTR files; verify DOH form typo spellings (Transfussion/Scalling/Flouride) against paper form

**Before Defense:** encode real IPTR paper records to CSV, replace synthetic dataset, re-run algo experiments, update Chapter 4 results; ISO 25010:2023 evaluation (30 respondents, 5-point Likert, weighted mean); final ZAP scan.

## SPRINT LOOP (every session)
- **Start:** read HANDOFF.md, /compact if resuming. Complex sprints use /grill-me first: Sprints 1, 2, 7, 8, 16, 19, 21.
- **End:** save HANDOFF.md → git add . → git commit -m "Sprint X: description" → git push.

## CHAPTER REFERENCES
- `/docs/Group404 - Manuscript.md` — Chapter 1 (~line 95): objectives, scope, framework. Chapter 3 (~line 315): ERD, architecture, DFD, use cases, methodology.
- ERD = exact MongoDB models; use cases = exact permissions per role. Do NOT deviate from Chapter specs; read the relevant section before each sprint.

## ABSOLUTE DO NOT
- Hard delete any record ever
- Build algo until Phase 3; call algo files directly from Express
- Start next sprint without approval; commit without testing
- Expose stack traces in errors; commit .env files
- Replace clinical judgment with predictions
- Build mobile app; integrate with national DOH databases
