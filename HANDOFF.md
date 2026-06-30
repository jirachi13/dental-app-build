# HANDOFF — Sprint 5 Complete

## Status
Sprints 1-5 done and verified against the real MongoDB Atlas cluster. All 13 ERD models now exist — Phase 1's data layer is complete.
- Sprint 1: Express MVC + MongoDB connection
- Sprint 2: SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE models
- Sprint 3: STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION models
- Sprint 4: DENTAL_CHART, TOOTH_RECORD, TREATMENT models
- Sprint 5: PREVENTIVE_CARE_RECORD, RISK_STRATIFICATION, APPOINTMENT, AUDIT_TRAIL models

## What exists now
- `dental-4-12-main/project/server/` — Express MVC backend
  - `app.ts` — app config: CORS, JSON parsing, DB-connect middleware, mounts routes at `/api`, error handler (no stack traces exposed)
  - `config/db.ts` — Mongoose connection, cached across invocations for serverless reuse
  - `routes/index.ts`, `controllers/healthController.ts` — `/api/health` endpoint only
  - `local.ts` — local dev entry point (`npm run dev:server`, listens on port 4000)
  - `models/` — all 13 ERD models: `School.ts`, `User.ts`, `Dentist.ts`, `DentalAide.ts`, `Student.ts`, `StudentIptr.ts`, `MedicalHistory.ts`, `DietarySocialHabits.ts`, `OralHealthCondition.ts`, `DentalChart.ts`, `ToothRecord.ts`, `Treatment.ts`, `PreventiveCareRecord.ts`, `RiskStratification.ts`, `Appointment.ts`, `AuditTrail.ts` — `models/index.ts` barrel export
  - `models/shared/softDelete.ts` — shared `isArchived`/`archivedAt`/`archivedBy` fields, spread into models that have them per the ERD
- `dental-4-12-main/project/api/index.ts` — Vercel serverless entry, re-exports the same Express app
- `dental-4-12-main/project/vercel.json` — rewrites `/api/*` → the single function so Express handles sub-routing
- `dental-4-12-main/project/tsconfig.server.json` — separate Node-targeted tsconfig (frontend tsconfig.json is bundler/DOM-targeted, kept untouched)
- `dental-4-12-main/project/.env` — local `MONGODB_URI` (gitignored, not committed)
- Vercel project linked to this repo, root directory set to `dental-4-12-main/project`, `MONGODB_URI` set as a Sensitive env var for Production + Preview (Development intentionally left unset — Vercel disallows Sensitive + Development together; local dev uses the `.env` file instead)

## Sprint 2 decisions (grill-me round)
- **IDs**: using Mongo's native `_id` (ObjectId) only — no separate `school_id`/`user_id` literal fields as the ERD's relational notation implies. FK references (`school_id (FK)` etc.) are Mongoose `ObjectId` refs pointing at the related model's `_id`.
- **USER.password_hash**: added now even though the ERD doesn't list it, since AUTH RULES require bcrypt+JWT later (Sprint 7) and adding it now avoids a breaking schema change. Field exists but nothing reads/writes it yet.
- **USER.school_id**: made optional (not required) — System Admin and BHO Staff roles span all schools per their role descriptions, so they shouldn't be forced to belong to one school.
- **Encryption**: NOT applied yet. All fields (including ones flagged for encryption in CLAUDE.md like full_name, address, contact_number) are stored plain for now — encryption is explicitly Sprint 8's job, not bolted on early.
- **Timestamps**: SCHOOL/USER/DENTIST/DENTAL_AIDE have `created_at` + `updated_at` per the ERD. STUDENT, STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION have `created_at` only — handled via Mongoose's `timestamps: { updatedAt: false }` option.

## Sprint 3 notes
- Per the ERD, `MEDICAL_HISTORY`, `DIETARY_SOCIAL_HABITS`, and `ORAL_HEALTH_CONDITION` have **no** `isArchived`/`archivedAt`/`archivedBy` fields — only `STUDENT_IPTR` (their parent) does. Archiving an IPTR conceptually archives its child records; this was followed exactly as specified rather than adding soft-delete to every model uniformly.
- All four new models reference `StudentIptr` via `iptr_id` (ObjectId ref), consistent with Sprint 2's native-`_id` decision.

## Sprint 4 notes
- Per the ERD, `DENTAL_CHART` has no `created_at`/`updated_at` at all — just `date_charted` plus soft-delete fields. `TOOTH_RECORD` has no timestamps or soft-delete fields whatsoever (pure child record of a chart). `TREATMENT` has `created_at` + soft-delete, no `updated_at`. Followed exactly as specified, verified via smoke test (`created_at` came back `undefined` on DentalChart/ToothRecord as expected).

## Sprint 5 notes
- Per the ERD: `PREVENTIVE_CARE_RECORD` has `created_at` + soft-delete (no `updated_at`). `RISK_STRATIFICATION` has neither timestamps nor soft-delete (it's a point-in-time assessment tied to a preventive visit, not independently archivable). `APPOINTMENT` has soft-delete but no `created_at`. `AUDIT_TRAIL` has neither — audit logs are never archived or soft-deleted, by design (immutable record).
- `AuditTrail.affected_record_id` is a bare `ObjectId` with no `ref` — it can point at any model depending on `affected_model`, so a fixed ref isn't possible.
- All 13 models from the ERD now exist. Phase 1 remaining work: CRUD routes (Sprint 6), auth (Sprint 7), encryption (Sprint 8), frontend wiring (Sprints 9-14), soft-delete/audit enforcement in routes (Sprint 15), security (15.5), OCR (16), deploy (17).

## Repo hygiene done this session
- Added root `.gitignore` (node_modules, .env, .env.local, dist, build)
- Untracked `node_modules/` and `dist/` that were previously committed (72k+ files removed from git history going forward)
- Added `CLAUDE.md` at repo root with the full FLORAL build spec
- Deleted stale auto-generated prototype status docs (button-fix summaries, validation reports) that no longer reflect reality
- Moved `Group404 - Manuscript.md` to `docs/` — contains Chapter 1 (~line 95) and Chapter 3 (~line 315), referenced from `CLAUDE.md`'s Chapter References section instead of nonexistent chapter1.pdf/chapter3.pdf

## Verified
- `npm run dev:server` starts the Express app locally
- `GET /api/health` → `{"status":"ok","db":"connected"}` against the real `floral-cluster` Atlas cluster
- Smoke-tested School + User + Dentist + Student + StudentIptr + PreventiveCareRecord + RiskStratification + Appointment + AuditTrail: created linked docs (confirmed soft-delete/timestamp fields present/absent matches the ERD per model), read back, deleted — all against the real cluster, no leftover test data

## Not done yet (deliberately out of scope so far)
- No CRUD routes for any model beyond health check (Sprint 6)
- No JWT auth (Sprint 7) — `password_hash` field exists but is unused
- No data encryption (Sprint 8) — sensitive fields are currently plain text in the DB
- Not yet deployed to Vercel (Sprint 17) — only linked/configured

## Next sprint
Sprint 6 → CRUD API for all 13 models. Do not start without explicit approval.
