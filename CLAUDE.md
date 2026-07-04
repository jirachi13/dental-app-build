# FLORAL — Dental Health Record Management System with Predictive Analytics
Capstone Thesis — Build Phase — Group 404 — AY 2025-2026

## CONTEXT MANAGEMENT
- Always read CLAUDE.md completely first
- Read HANDOFF.md if exists before anything
- Run /compact when resuming long sessions
- List file structure without reading every file
- Ask before reading additional files
- Save sprint summary as HANDOFF.md after each sprint
- Use concise responses, no filler, no pleasantries

## DOC ROLES + SELF-MAINTENANCE (adopted 2026-07-04)
- CLAUDE.md = rules/specs/decisions that constrain every session. It self-improves by REPLACEMENT: when a decision supersedes a line here, rewrite or delete that line the same turn — never just append. This file is injected into every session's context, so bloat here taxes everything.
- HANDOFF.md = state journal (what happened, current status). Narrative goes here, never into CLAUDE.md.
- Every ~5 sprints, do a CLAUDE.md hygiene pass: delete superseded lines, compress resolved sagas to one-liners, verify build-phase status markers.

## MODEL STRATEGY (adopted 2026-07-04)
- Split by work type, not one model for everything:
  - **Fable** (judgment work): sprint scoping/grill-me, plans written into HANDOFF, code review, audits/persona reviews, ambiguous debugging, thesis/defense reasoning, and any sprint where the ambiguity can't be predicted up front (e.g. real-data 21a cleaning).
  - **Opus** (well-specified execution): implementing a plan with exact file:line targets, wiring documented patterns, seed scripts, mechanical UI passes.
- Recipe per sprint: Fable scopes + writes the plan into HANDOFF → user runs /model opus to implement → back to Fable only if Opus stalls or for final review. The plan left in HANDOFF must be precise enough to execute without re-deriving intent — that precision is what makes the split safe.
- Claude cannot switch its own model; when the current work crosses into the other model's territory, SAY SO and let the user run /model.

## BEHAVIOR RULES
- Think before coding, ask if unclear
- Simplicity first, no overengineering
- Surgical changes only, touch minimum files
- One sprint at a time, ask before proceeding
- Always commit after each sprint
- Never start next sprint without approval
- Confirm success criteria before building
- Ask clarifying questions if requirements unclear
- Follow YAGNI: don't build it if it doesn't need to exist yet
- Prefer native platform features (e.g. `<input type="date">`) over installing a library
- Prefer stdlib/already-installed dependencies over writing custom code or adding new packages
- Before starting a sprint, give a one-line scope estimate (files touched, new models, complexity) so the user can decide whether to proceed or pause. Claude Code has no visibility into token/cost usage in this environment — this scope estimate is the practical substitute for a real usage warning.
- Minimum code that works, nothing more

## APP CONTEXT
- Full name: Floral, Dental Health Record Management System with Predictive Analytics
- Type: Web application only (no mobile)
- Location: Barangay Tanyag, Taguig City
- Three schools:
  1. Bagong Tanyag Integrated School (primary, K-Grade 10)
  2. Bagong Tanyag Elementary School Annex A (K-Grade 6)
  3. South Daang Hari Elementary School Main (K-Grade 6)
- Internal use only
- ~8,000 student records
- 1 dentist, 1 dental aide, 3 clinic staff

## SCOPE LIMITATIONS (do not build these)
- No mobile app
- No integration with national DOH databases
- No computer vision caries detection
- No biometric authentication
- No tele-dentistry
- Predictive module assists dentist only, never replaces clinical judgment
- Standalone platform only

## TECH STACK
- Frontend: React (PWA)
- Backend: Node.js + Express.js (MVC)
- Database: MongoDB
- Offline: Service Worker + IndexedDB
- ML: Python (scikit-learn, pandas, numpy) via FastAPI endpoints
- OCR: Tesseract.js
- Evaluation: ISO/IEC 25010:2023

## USER ROLES (5 roles)
- **System Admin** (super user) — manage all user accounts, create/edit/deactivate users, assign roles and school assignments, view full audit trail, restore archived records, system settings
- **Dentist** — patient records, dental charting, appointments, predictive analytics, treatment administration, validates ALL treatment recommendations before clinical action
- **Dental Aide** — patient records, appointments, clinic coordination, RPC monitoring
- **School Administrator** — view school reports, school dashboards only, no access to clinical records
- **Barangay Health Office Staff** — consolidated reports across all schools, City Health Office report submission

> Note: System Admin is **not** in the Chapter 3 ERD's original role list but is required for the system to function (user management, audit trail access, archive restoration, system settings) and is treated as authoritative going forward. Only System Admin can create/edit/deactivate user accounts, view the full audit trail, restore archived records, and access system settings — enforced via RBAC in Sprint 7.

## MONGODB MODELS (exact from ERD Chapter 3)

**SCHOOL** — school_id, school_name, school_type, principal_name, street_address, barangay, city, created_at, updated_at, isArchived, archivedAt, archivedBy

**USER** — user_id, school_id (FK, optional — system_admin and bho_staff are not tied to one school), role (system_admin/dentist/dental_aide/school_admin/bho_staff), full_name, email (added Sprint 7 — login identifier, unique, not in original ERD), password_hash (added ahead of Sprint 7, not in original ERD, `select: false` so it never returns in queries by default), is_enrolled (BOOLEAN), last_login, created_at, updated_at, isArchived, archivedAt, archivedBy

**DENTIST** — dentist_id, school_id (FK), user_id (FK), last_name, first_name, license_number (VARCHAR 50), created_at, updated_at, isArchived, archivedAt, archivedBy

**DENTAL_AIDE** — dental_aide_id, school_id (FK), user_id (FK), dentist_id (FK), last_name, first_name, contact_number (VARCHAR 20), created_at, updated_at, isArchived, archivedAt, archivedBy

**STUDENT** — student_id, school_id (FK), full_name (VARCHAR 150), birthday (DATE), sex (VARCHAR 10), address (VARCHAR 200), contact_number (VARCHAR 15), grade_level, section, created_at, isArchived, archivedAt, archivedBy

**STUDENT_IPTR** — iptr_id, student_id (FK), school_year (VARCHAR 20), created_at, isArchived, archivedAt, archivedBy

**MEDICAL_HISTORY** — medical_id, iptr_id (FK), allergies (TEXT), diabetes_mellitus (BOOLEAN), hypertension (BOOLEAN), cardiovascular_disease (BOOLEAN), thyroid_disorders (BOOLEAN), hepatitis_disorders (BOOLEAN), malignancy (BOOLEAN), previous_hospitalization (BOOLEAN), previous_surgical (BOOLEAN), blood_transfusion (BOOLEAN), tattoo (BOOLEAN), others (TEXT), created_at

**DIETARY_SOCIAL_HABITS** — dietary_id, iptr_id (FK), sugar_beverages (BOOLEAN), alcohol_drinker (BOOLEAN), tobacco_user (BOOLEAN), betel_nut_chewer (BOOLEAN), body_piercing (BOOLEAN), nail_biting (BOOLEAN), thumb_sucking (BOOLEAN), created_at

**ORAL_HEALTH_CONDITION** — oral_id, iptr_id (FK), oral_hygiene (VARCHAR 50), gingivitis (BOOLEAN), periodontal_disease (BOOLEAN), debris (BOOLEAN), calculus (BOOLEAN), abnormal_growth (BOOLEAN), cleft_lip_palate (BOOLEAN), others (TEXT), created_at

**DENTAL_CHART** — chart_id, iptr_id (FK), dentist_id (FK), date_charted (DATE), isArchived, archivedAt, archivedBy

**TOOTH_RECORD** — tooth_record_id, chart_id (FK), tooth_number (INT), condition (VARCHAR 100), treatment_code (VARCHAR 50)

**TREATMENT** — treatment_id, iptr_id (FK), dentist_id (FK), diagnosis (TEXT), treatment_done (TEXT), remarks (TEXT), date (DATE), created_at, isArchived, archivedAt, archivedBy

**PREVENTIVE_CARE_RECORD** — preventive_id, iptr_id (FK), visit_date (DATE), visit_number (1 or 2), created_at, isArchived, archivedAt, archivedBy

**RISK_STRATIFICATION** — risk_id, preventive_id (FK), risk_level (VARCHAR 50: High/Medium/Low), recommendation (TEXT), dmf_score (FLOAT), dmf_index (VARCHAR 10: DMF or dmf), validated_by_dentist (BOOLEAN), validated_at (DATETIME)

**APPOINTMENT** — appointment_id, student_id (FK), dentist_id (FK), appointment_datetime (DATETIME), status (VARCHAR 50), appointment_type (added Sprint 11, not in original ERD), requires_followup (BOOLEAN, added Sprint 11), parental_supervision_required (BOOLEAN, added Sprint 11), isArchived, archivedAt, archivedBy. One Appointment record per student — a UI "session" (whole class section scheduled at once) is multiple Appointment records sharing date/time/dentist/type, grouped client-side.

**DENTIST_ROTATION** (NEW — not in original ERD, added Sprint 11) — rotation_id, school_id (FK), dentist_id (FK), week_start (DATE), week_end (DATE), notes (TEXT), isArchived, archivedAt, archivedBy

**AUDIT_TRAIL** — audit_id, user_id (FK), action (VARCHAR 100), timestamp (DATETIME), affected_record_id, affected_model (VARCHAR 50)

## SOFT DELETE RULES
- ALL models include: isArchived BOOLEAN default false, archivedAt DATETIME default null, archivedBy user_id default null
- All GET queries filter isArchived=false
- System Admin only can view archived
- System Admin only can restore archived
- NEVER hard delete any record ever

## AUTH RULES
- JWT authentication
- 5 roles with strict RBAC
- All routes protected by auth middleware
- Role checked on every API call
- Audit trail logs ALL user actions: additions, edits, archives across all three school sites
- bcrypt for all passwords
- JWT expiry configured
- Refresh token handling

## DATA ENCRYPTION
- Encrypt sensitive patient fields before saving to MongoDB
- Fields to encrypt: full_name, address, contact_number, medical_history fields, diagnosis, treatment_done
- Fields NOT to encrypt (need querying): isArchived, dates, IDs, role, school_id
- Use mongoose-field-encryption or Node.js crypto AES-256
- Implemented Sprint 8 using `mongoose-field-encryption` (AES-256-CBC), scoped to: STUDENT (full_name, address, contact_number), DENTAL_AIDE (contact_number), MEDICAL_HISTORY (allergies, others — not the boolean condition flags), TREATMENT (diagnosis, treatment_done). USER.full_name is NOT encrypted (staff name, not patient PII). See HANDOFF.md Sprint 8 notes for why CRUD routes use findById+save instead of findByIdAndUpdate for these models.

## SECURITY
- OWASP Top 10 compliance before deployment
- Data encryption on sensitive fields
- bcrypt for passwords
- JWT expiry configured
- .env never committed to GitHub
- No stack traces in error messages ever
- Input validation + sanitization all routes
- Mongoose sanitization, no raw queries
- ZAP scan after deployment
- Audit trail on all data changes

## SYSTEM MODULES (7 per Chapter 3)
1. User authentication + role-based access
2. Student registration + dental records (IPTR) — medical history, dietary/social habits, oral health conditions
3. Digital dental charting — tooth-by-tooth recording, standard dental notation, DMF/dmf index tracking
4. Appointment scheduling + monitoring — follow-up flagging, parental supervision flags
5. Two-visit RPC monitoring — Visit 1 + Visit 2 tracking, oral screening, oral prophylaxis, fluoride varnish application, dental hygiene instruction, caries risk assessment
6. Predictive analytics integration — risk classification (High/Medium/Low), treatment recommendations, dentist validation interface
7. Dashboard + automated DOH report generation — age-bracket counts, gender-based counts, monthly standardized reports, interactive health dashboard

## OCR MODULE
- Tool: Tesseract.js
- Scans DOH IPTR paper forms
- Extracts these fields only: name, birthday, age, sex, address, contact number, grade level, section
- Returns structured JSON
- Maps directly to STUDENT model fields

## PREDICTIVE ANALYTICS (Phase 3 only)
- Language: Python
- Libraries: scikit-learn, pandas, numpy
- FastAPI endpoints
- Key input variables (from Chapter 1 + 3): DMF/dmf index scores (PRIMARY variable), oral health conditions, dietary habits, medical history, treatment history
- Pipeline:
  1. Data preprocessing (clean IPTR records, handle missing values)
  2. Feature engineering (convert IPTR attributes to model inputs)
  3. Model training + comparison (see ALGORITHMS TO COMPARE and EVALUATION METHODS below)
  4. Risk output: High / Medium / Low

### ALGORITHMS TO COMPARE
1. Logistic Regression (interpretable baseline)
2. Decision Tree (visual, explainable)
3. Random Forest (ensemble)
4. SVM (kernel-based)
5. XGBoost (gradient boosting)

Primary feature: DMF/dmf index score. Metric priority: F1 score. Generate a visual decision tree for Chapter 4.

**DECIDED (2026-07-02)**: run ALL 5 algorithms — user's call, no adviser input needed. SVM stays in the Chapter 4 comparison. (Historical context: dropping SVM was considered because it's hardest to explain to a non-technical panel and often performs similarly to RF on medical data — if the panel asks, that trade-off was weighed and thoroughness won.)

### EVALUATION METHODS
Compare both:
1. Train/Test Split (80% train, 20% test) — secondary comparison
2. Stratified K-Fold (k=5) — **primary evaluation**, used for final model selection

K=5 chosen over K=10: dataset is ~8,000 records with imbalanced dental conditions (caries common, periodontitis moderate, cleft lip/palate rare). K=10 folds (~800 records each) risk rare conditions appearing in only 1-2 folds — unreliable. K=5 folds (~1,600 records each) give more stable per-condition results, is standard for medical ML research, and is sufficient at thesis level. K=10 can optionally be mentioned in Chapter 4 as a consistency check ("K=10 was also tested, results were consistent with K=5 findings") without doing it as the primary analysis.

Report per algorithm: Accuracy, Precision, Recall, F1 Score, Confusion Matrix. Generate a comparison table for both methods (5 algorithms × 2 methods = 10 result sets). Save results to `/docs/algo-results.md`. Final model selected based on K-Fold F1.

What the Train/Test vs K-Fold comparison shows the panel: results ≈ each other → model is stable, not overfitting. K-Fold >> Train/Test → the holdout split was lucky. K-Fold << Train/Test → model was overfitting and K-Fold caught it. This comparison is itself a Chapter 4 discussion point, not just a table.

Chapter 4 paragraph template (fill in real numbers once experiments run): "Table X presents the performance comparison of five classification algorithms evaluated using both holdout validation (80/20 split) and Stratified K-Fold cross-validation (k=5). K-Fold results were used as the primary basis for model selection due to their reliability on imbalanced medical datasets. [Algorithm] demonstrated the highest F1 score of X.XX under K-Fold validation and was selected as the active classification model."

### Sample size caveat — algo experiments cannot start yet
Current student data is only the Sprint 10 demo seeder (18 records) — far too small for ML. Real Excel data (~8,000 records, see Phase 3 plan above) is not encoded yet. Sprint 21a-c (clean → map → seed real data) must complete BEFORE any algorithm experiments (21d onward) run — do not attempt model training against demo seeder data, the sample size is meaningless for that purpose.
- Strategy Pattern for algo swapping
- Active algo in config.py only
- Express calls predictor.py only
- Never call individual algo files directly
- Dentist MUST validate before clinical action
- **UPDATE**: Real IPTR Excel records from Barangay Tanyag school dental clinics are available (group has the files) and contain full IPTR fields — oral health conditions, treatment records, DMF scores — not just student lists. Plan revised to clean and use this real data instead of generating a synthetic dataset; see revised Phase 3 sprint breakdown below. Excel files have inconsistent formatting across files (different column names/order, missing values, inconsistent date formats and condition spellings) and need standardization before use.
- **BLOCKED (2026-07-01)**: When Sprint 21a actually started, every Excel file present in `/data/` (6 top-level files + ~40 more nested under `NS 2026-2027 (BTIS)/`) turned out to be **Simplified Nutritional Status (SNS) reports** (Name, Birthday, Weight, Height, Sex, Age, BMI, Nutritional Status classification) — a different DepEd program, with **zero dental fields** (no DMF score, no oral health conditions, no dietary/social habits, no medical history, no treatment records). Verified directly with openpyxl (actual sheet names/headers), not assumed from filenames. The real dental IPTR files described above are not yet in this repo — confirmed with the user they exist separately and need to be located/added. Do not start Sprint 21a cleaning against the current `data/` contents.
- Privacy: **RESOLVED** — `full_name` is dropped entirely from the ML training/eval pipeline (Sprint 21a-21c), not just anonymized. The model only needs DMF scores, oral health conditions, dietary/social habits, medical history, and treatment history — none of which require a name. Each row is identified by `student_id` (or a generated `Student_001`-style placeholder) instead. This is stronger than pseudonymizing and means Excel-derived training data never contains real names, so no adviser sign-off is needed to proceed with Sprint 21a. (A quick heads-up to the adviser about this design choice is still worth sending, per the user's own judgment — not a blocker.) Real names stay exactly where they already are: encrypted in MongoDB (Sprint 8), used only by the live app for clinical staff to identify students.

## REPORTING MODULE
- School Oral Health Status + Service Report
- Consolidated Report for City Health Office
- DOH-aligned format
- Age-bracket and gender-based counts
- Monthly automated generation
- Interactive dashboards
- Filterable + searchable records
- Follow-up alerts

## PWA / OFFLINE (Phase 2 only)
- DO NOT touch service worker until Phase 2
- Existing service worker in prototype
- Offline storage: IndexedDB
- Sync: FIFO (oldest timestamp first)
- Stop queue if sync fails, never skip
- Background sync: Workbox
- Show offline banner when disconnected
- Disable form submissions when offline

## BUILD PHASES

**Phase 1 — Foundation (DONE — deployed to production):**
- Sprint 1 → Express MVC + MongoDB connection
- Sprint 2 → SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE models
- Sprint 3 → STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION models
- Sprint 4 → DENTAL_CHART, TOOTH_RECORD, TREATMENT models
- Sprint 5 → PREVENTIVE_CARE_RECORD, RISK_STRATIFICATION, APPOINTMENT, AUDIT_TRAIL models
- Sprint 6 → CRUD API all models
- Sprint 7 → JWT auth + 5 roles + RBAC
- Sprint 8 → Data encryption setup
- Sprint 9 → List all dummy frontend data (review list before any changes)
- Sprint 10 → Replace dummy with real API (keep all UI intact, data only)
- Sprint 11 → Appointment scheduling module
- Sprint 12 → RPC 2-visit tracking module
- Sprint 13 → Dashboard + DOH reports module
- Sprint 14 → UI fixes + search + filter
- Sprint 15 → Soft delete + audit logs
- Sprint 15.5 → OWASP security + ZAP scan
- Sprint 16 → OCR Tesseract.js IPTR scanning
- Sprint 17 → Deploy to Vercel

**Phase 2 — Offline (DONE):**
- Sprint 18 → PWA service worker review
- Sprint 19 → IndexedDB + FIFO queue
- Sprint 20 → Workbox sync + conflict handling

**Phase 3 — Algo (BUILD DONE on synthetic data 21a-21g; re-run against REAL data still blocked — see Sample size caveat):**
**REVISED — real Excel IPTR data available, no synthetic dataset needed. Full detailed task breakdown for every sprint below is in `/docs/phase3-sprint-prompts.md` — treat that file as authoritative, this is just the index. Each sprint requires explicit review/approval before the next starts.**
- Sprint 21a → Clean + standardize real Excel files from /data/raw/ → /data/cleaned/dataset.csv + /data/cleaning-report.md. Work on copies only — never modify original Excel files. Drop `full_name`/any name column entirely during cleaning — not needed for training, use `student_id` (or a generated placeholder) as the row identifier instead (see Privacy note above — resolved, not a blocker).
- Sprint 21b → Feature engineering directly from cleaned CSV → /data/processed/ml_dataset.csv (DMF index calc, risk labels, missing-value imputation, class distribution check)
- Sprint 21c → Train/Test (80/20) + Stratified K-Fold (k=5) experiments, all 5 algorithms (DECIDED 2026-07-02: all 5 run, SVM stays), results to /docs/algo-results.md, decision tree + feature importance charts, confusion matrices
- Sprint 21d → Select and justify winner by K-Fold F1 → /docs/model-selection-rationale.md (becomes Chapter 4 Section 4.2)
- Sprint 21e → Integrate winner via Strategy Pattern (/ml-service/, predictor.py as sole entry point, config.py for active model)
- Sprint 21f → Risk classification UI — High/Medium/Low, dentist validation required before any clinical action, logged to AUDIT_TRAIL
- Sprint 21g → Dentist decision support interface — priority queue, bulk assessment, risk trend dashboard, validation before clinical action

For Chapter 4: real IPTR records from Barangay Tanyag school dental clinics were used as training data after cleaning and standardization — stronger than a synthetic dataset, note this in the manuscript.

**Phase 4 — Post-review backlog (numbered 2026-07-04; each needs approval, sprint loop applies):**
- Sprint 21a-d (real data) → re-run clean→features→experiments→select against real IPTR Excel files once located (keeps its original number; the only remaining Phase 3 work)
- Sprint 22 → DONE 2026-07-04: Export dropdown (CSV/.xlsx) on all 4 list exports; exceljs dynamic-imported + precache-excluded; uuid pinned via npm override (audit stays 0); Word left out (no use case)
- Sprint 23 → Full UI beautify pass via /impeccable (remaining text loaders, transitions, toast consistency, focus states; anti-slop rules in HANDOFF backlog apply)
- Sprint 24 → DOH Consolidated Report PDF fix (77-column crop; needs column-pagination design decision first — scope on Fable)
- Sprint 25 → Email API for 2FA + password-reset links (Resend/Brevo free tier; touches auth flow + USER model — scope on Fable)
- Sprint 26 → Deterministic encryption IV fix (research mongoose-field-encryption's IV mechanism first — real-data-loss risk; Fable throughout)
- Sprint 27 → Docs: README + run/test/deploy guides extracted from HANDOFF
- Small strays (bundle into any sprint): RPC interval label wording + early-Visit-2 flag, appointment card date display, mixed-dentition hint + t/T column labels, other roles' dashboard upgrades
- User-only items (no sprint): locate real IPTR files, verify DOH form typo spellings (Transfussion/Scalling/Flouride) against paper form, decide Reports April-default month

**Before Defense:**
- Encode real IPTR paper records to CSV
- Replace synthetic dataset
- Re-run algo experiments
- Update Chapter 4 results
- ISO 25010:2023 evaluation — 30 respondents, 5-point Likert scale
- Weighted mean analysis
- Final ZAP security scan

## SPRINT LOOP (every session)
**Start:**
- Read HANDOFF.md if exists
- /compact if resuming
- Pick model per MODEL STRATEGY above (Fable to scope/plan/review, Opus to execute a written plan)

Complex sprints use /grill-me first: Sprints 1, 2, 7, 8, 16, 19, 21

**End every sprint:**
- Save summary as HANDOFF.md
- git add .
- git commit -m "Sprint X: description"
- git push

## CHAPTER REFERENCES
- /docs/Group404 - Manuscript.md → full thesis manuscript
  - Chapter 1 (line ~95) → objectives, scope, limitations, conceptual framework
  - Chapter 3 (line ~315) → ERD, architecture, DFD, use cases, methodology
- ERD = exact MongoDB models
- Use cases = exact permissions per role
- Do NOT deviate from Chapter specs
- Read relevant section before each sprint

## ABSOLUTE DO NOT
- Hard delete any record ever
- Touch service worker until Phase 2
- Build algo until Phase 3
- Start next sprint without approval
- Commit without testing
- Expose stack traces in errors
- Commit .env files
- Call algo files directly from Express
- Replace clinical judgment with predictions
- Build mobile app
- Integrate with national DOH databases
