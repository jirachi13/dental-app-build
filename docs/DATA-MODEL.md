# FLORAL — MongoDB Models (authoritative field specs)

Exact from ERD Chapter 3. **Read this before touching any schema, model, or migration.** CLAUDE.md carries only a pointer to this file to keep per-session context small; this doc is the authority for field-level details. Cross-cutting rules (soft delete, encryption, auth) stay in CLAUDE.md.

**SCHOOL** — school_id, school_name, school_type, principal_name, street_address, barangay, city, created_at, updated_at, isArchived, archivedAt, archivedBy

**USER** — user_id, **school_ids (ARRAY of School FKs — ERD DEVIATION, Sprint 100; replaced the ERD's single `school_id`. EMPTY MEANS ALL SCHOOLS, which is how system_admin and bho_staff have always behaved. One dentist and one aide rotate across all three schools and other roles may cover several, none of which a single FK could express. `DENTIST_ROTATION` does not cover this — it is a weekly schedule, not an access grant. ⚠ Chapter 3's ERD figure still shows `school_id` and must be updated.)**, role (system_admin/dentist/dental_aide/school_admin/bho_staff), full_name, email (added Sprint 7 — login identifier, unique, not in original ERD), password_hash (added ahead of Sprint 7, not in original ERD, `select: false` so it never returns in queries by default), is_enrolled (BOOLEAN), last_login, created_at, updated_at, isArchived, archivedAt, archivedBy

**DENTIST** — dentist_id, school_id (FK), user_id (FK), last_name, first_name, license_number (VARCHAR 50), created_at, updated_at, isArchived, archivedAt, archivedBy

**DENTAL_AIDE** — dental_aide_id, school_id (FK), user_id (FK), dentist_id (FK), last_name, first_name, contact_number (VARCHAR 20), created_at, updated_at, isArchived, archivedAt, archivedBy

**STUDENT** — student_id, school_id (FK), last_name (VARCHAR 60, required — added Sprint 35, not in original ERD), first_name (VARCHAR 60, required — added Sprint 35), middle_name (VARCHAR 60, optional — added Sprint 35), full_name (VARCHAR 150), birthday (DATE), sex (VARCHAR 10), address (VARCHAR 200 — the student's HOME address, not the school), contact_number (VARCHAR 15), grade_level, section, created_at, isArchived, archivedAt, archivedBy
- **Name split (Sprint 35, 2026-08-25).** The original ERD gave STUDENT a single `full_name`, but the DOH IPTR paper form has separate name boxes and every list/report is read surname-first, which one string cannot support. This follows the ERD's own convention — **DENTAL_AIDE already splits `last_name`/`first_name`** — so it is a consistent extension, not a new pattern. **`full_name` is retained but is now DERIVED**: a `pre('save')` hook rebuilds it from the parts, so it stays valid for every existing reader while the parts remain the single source of truth. The hook is registered BEFORE the encryption plugin (mongoose runs pre-save hooks in registration order); reversing that order would write a plaintext `full_name` over the encrypted one.
- Existing records were migrated by `server/scripts/splitStudentNames.ts` (dry-run by default, idempotent, handles suffixes and surname particles, flags ambiguous names rather than guessing).
- All four name fields are encrypted, so the **Sprint 26 random-IV rule applies: plaintext equality queries on them never match** — fetch and filter in JS.

**STUDENT_IPTR** — iptr_id, student_id (FK), school_year (VARCHAR 20), created_at, isArchived, archivedAt, archivedBy

**MEDICAL_HISTORY** — medical_id, iptr_id (FK), allergies (TEXT), diabetes_mellitus (BOOLEAN), hypertension (BOOLEAN), cardiovascular_disease (BOOLEAN), thyroid_disorders (BOOLEAN), hepatitis_disorders (BOOLEAN), malignancy (BOOLEAN), previous_hospitalization (BOOLEAN), previous_surgical (BOOLEAN), blood_transfusion (BOOLEAN), tattoo (BOOLEAN), others (TEXT), created_at

**DIETARY_SOCIAL_HABITS** — dietary_id, iptr_id (FK), sugar_beverages (BOOLEAN), alcohol_drinker (BOOLEAN), tobacco_user (BOOLEAN), betel_nut_chewer (BOOLEAN), body_piercing (BOOLEAN), nail_biting (BOOLEAN), thumb_sucking (BOOLEAN), created_at

**ORAL_HEALTH_CONDITION** — oral_id, iptr_id (FK), oral_hygiene (VARCHAR 50), gingivitis (BOOLEAN), periodontal_disease (BOOLEAN), debris (BOOLEAN), calculus (BOOLEAN), abnormal_growth (BOOLEAN), cleft_lip_palate (BOOLEAN), others (TEXT), created_at

**DENTAL_CHART** — chart_id, iptr_id (FK), dentist_id (FK), date_charted (DATE), isArchived, archivedAt, archivedBy

**TOOTH_RECORD** — tooth_record_id, chart_id (FK), tooth_number (INT), condition (VARCHAR 100), treatment_code (VARCHAR 50)

**TREATMENT** — treatment_id, iptr_id (FK), dentist_id (FK), diagnosis (TEXT), treatment_done (TEXT), remarks (TEXT), date (DATE), created_at, isArchived, archivedAt, archivedBy

**PREVENTIVE_CARE_RECORD** — preventive_id, iptr_id (FK), visit_date (DATE), visit_number (1 or 2), created_at, isArchived, archivedAt, archivedBy

**RISK_STRATIFICATION** — risk_id, preventive_id (FK), risk_level (VARCHAR 50: High/Medium/Low), recommendation (TEXT), dmf_score (FLOAT), dmf_index (VARCHAR 10: DMF or dmf), validated_by_dentist (BOOLEAN), validated_at (DATETIME)

**APPOINTMENT** — appointment_id, student_id (FK), dentist_id (FK), appointment_datetime (DATETIME), status (VARCHAR 50), appointment_type (added Sprint 11, not in original ERD), requires_followup (BOOLEAN, added Sprint 11), parental_supervision_required (BOOLEAN, added Sprint 11), isArchived, archivedAt, archivedBy. One Appointment record per student — a UI "session" (whole class section scheduled at once) is multiple Appointment records sharing date/time/dentist/type, grouped client-side. **notes (VARCHAR 500, optional, default '' — ERD DEVIATION, added Sprint 109): a remark on THIS pupil's slot ("bring guardian", "reschedule, absent"). Distinct from DAY_NOTE, which is about the date itself — the user confirmed the two are different things. No migration needed; it defaults empty.**

**DAY_NOTE** (NEW — ERD DEVIATION, added Sprint 108) — day_note_id, date (DATETIME, midnight local — one calendar square = one date), **school_id (FK, NULLABLE — ⚠ null means EVERY school, which is the barangay-wide holiday case and the reason the field is not required)**, note (VARCHAR 500), created_by (FK USER), created_at, updated_at, isArchived, archivedAt, archivedBy. A note written against a DATE rather than a patient ("no clinic, barangay fiesta", "compressor down"). ⚠ Because `school_id` may be null it needs the `school_id_or_global` rule in `schoolScope.ts` — a plain `{school_id: {$in: […]}}` excludes null and would hide every barangay-wide note from scoped users. Not overloaded onto DENTIST_ROTATION.notes, which is scoped to school + dentist + WEEK. ⚠ Chapter 3's ERD figure must be updated.

**DENTIST_ROTATION** (NEW — not in original ERD, added Sprint 11) — rotation_id, school_id (FK), dentist_id (FK), week_start (DATE), week_end (DATE), notes (TEXT), isArchived, archivedAt, archivedBy

**AUDIT_TRAIL** — audit_id, user_id (FK), action (VARCHAR 100), timestamp (DATETIME), affected_record_id, affected_model (VARCHAR 50)
