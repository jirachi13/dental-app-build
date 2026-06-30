# HANDOFF — Sprint 3 Complete

## Status
Sprints 1-3 done and verified against the real MongoDB Atlas cluster:
- Sprint 1: Express MVC + MongoDB connection
- Sprint 2: SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE models
- Sprint 3: STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION models

## What exists now
- `dental-4-12-main/project/server/` — Express MVC backend
  - `app.ts` — app config: CORS, JSON parsing, DB-connect middleware, mounts routes at `/api`, error handler (no stack traces exposed)
  - `config/db.ts` — Mongoose connection, cached across invocations for serverless reuse
  - `routes/index.ts`, `controllers/healthController.ts` — `/api/health` endpoint only
  - `local.ts` — local dev entry point (`npm run dev:server`, listens on port 4000)
  - `models/School.ts`, `User.ts`, `Dentist.ts`, `DentalAide.ts`, `Student.ts`, `StudentIptr.ts`, `MedicalHistory.ts`, `DietarySocialHabits.ts`, `OralHealthCondition.ts` — Mongoose schemas, `models/index.ts` barrel export
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

## Repo hygiene done this session
- Added root `.gitignore` (node_modules, .env, .env.local, dist, build)
- Untracked `node_modules/` and `dist/` that were previously committed (72k+ files removed from git history going forward)
- Added `CLAUDE.md` at repo root with the full FLORAL build spec
- Deleted stale auto-generated prototype status docs (button-fix summaries, validation reports) that no longer reflect reality
- Moved `Group404 - Manuscript.md` to `docs/` — contains Chapter 1 (~line 95) and Chapter 3 (~line 315), referenced from `CLAUDE.md`'s Chapter References section instead of nonexistent chapter1.pdf/chapter3.pdf

## Verified
- `npm run dev:server` starts the Express app locally
- `GET /api/health` → `{"status":"ok","db":"connected"}` against the real `floral-cluster` Atlas cluster
- Smoke-tested School + Student + StudentIptr + MedicalHistory + DietarySocialHabits + OralHealthCondition: created linked docs (confirmed soft-delete fields present/absent matches the ERD per model), read back, deleted — all against the real cluster, no leftover test data

## Not done yet (deliberately out of scope so far)
- No DENTAL_CHART / TOOTH_RECORD / TREATMENT models (Sprint 4)
- No CRUD routes for any model beyond health check (Sprint 6)
- No JWT auth (Sprint 7) — `password_hash` field exists but is unused
- No data encryption (Sprint 8) — sensitive fields are currently plain text in the DB
- Not yet deployed to Vercel (Sprint 17) — only linked/configured

## Next sprint
Sprint 4 → DENTAL_CHART, TOOTH_RECORD, TREATMENT models, per the exact ERD in `CLAUDE.md` / Chapter 3 of the manuscript. Do not start without explicit approval.
