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

**APPOINTMENT** — appointment_id, student_id (FK), dentist_id (FK), appointment_datetime (DATETIME), status (VARCHAR 50), isArchived, archivedAt, archivedBy

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
  3. Model training + comparison: Logistic Regression vs Random Forest vs SVM
  4. Evaluation metrics: accuracy, precision, recall, F1
  5. Stratified K-Fold (k=5)
  6. Risk output: High / Medium / Low
- Strategy Pattern for algo swapping
- Active algo in config.py only
- Express calls predictor.py only
- Never call individual algo files directly
- Dentist MUST validate before clinical action
- **UPDATE**: Real IPTR Excel records from Barangay Tanyag school dental clinics are available (group has the files) and contain full IPTR fields — oral health conditions, treatment records, DMF scores — not just student lists. Plan revised to clean and use this real data instead of generating a synthetic dataset; see revised Phase 3 sprint breakdown below. Excel files have inconsistent formatting across files (different column names/order, missing values, inconsistent date formats and condition spellings) and need standardization before use.
- Privacy: before committing any Excel files to the repo, confirm with adviser whether student names need anonymizing (e.g. Student_001) even though this is a private repo.

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

**Phase 1 — Foundation (BUILD NOW):**
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

**Phase 2 — Offline (AFTER Phase 1):**
- Sprint 18 → PWA service worker review
- Sprint 19 → IndexedDB + FIFO queue
- Sprint 20 → Workbox sync + conflict handling

**Phase 3 — Algo (AFTER Phase 2):**
**REVISED — real Excel IPTR data available, no synthetic dataset needed:**
- Sprint 21a → Clean + standardize real Excel files: read all files in /data/raw/, analyze headers/structure, identify inconsistencies (column naming, missing values, date formats, condition spelling), generate a cleaning report, output unified CSV to /data/cleaned/dataset.csv matching MongoDB model fields, document all transformations in /data/cleaning-log.md. Work on copies only — never modify original Excel files. Decide on student-name anonymization with adviser first.
- Sprint 21b → Map cleaned data to MongoDB models
- Sprint 21c → Seed real data into MongoDB (replaces dummy/demo seeder data)
- Sprint 21d → Feature engineering from real IPTR data
- Sprint 21e → LR vs RF vs SVM experiments on real data
- Sprint 21f → Stratified K-Fold k=5 — accuracy, precision, recall, F1
- Sprint 21g → Integrate winner Strategy Pattern
- Sprint 21h → Risk classification UI — High/Medium/Low
- Sprint 21i → Dentist decision support interface — validation before clinical action

For Chapter 4: real IPTR records from Barangay Tanyag school dental clinics were used as training data after cleaning and standardization — stronger than a synthetic dataset, note this in the manuscript.

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
- /model opus
- /effort ultracode

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
