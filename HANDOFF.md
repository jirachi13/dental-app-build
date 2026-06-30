# HANDOFF — Sprint 2 Complete

## Status
Sprint 1 (Express MVC + MongoDB connection) and Sprint 2 (SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE models) done and verified against the real MongoDB Atlas cluster.

## What exists now
- `dental-4-12-main/project/server/` — Express MVC backend
  - `app.ts` — app config: CORS, JSON parsing, DB-connect middleware, mounts routes at `/api`, error handler (no stack traces exposed)
  - `config/db.ts` — Mongoose connection, cached across invocations for serverless reuse
  - `routes/index.ts`, `controllers/healthController.ts` — `/api/health` endpoint only
  - `local.ts` — local dev entry point (`npm run dev:server`, listens on port 4000)
  - `models/School.ts`, `User.ts`, `Dentist.ts`, `DentalAide.ts`, `Student.ts` — Mongoose schemas, `models/index.ts` barrel export
  - `models/shared/softDelete.ts` — shared `isArchived`/`archivedAt`/`archivedBy` fields, spread into every model
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
- **Timestamps**: SCHOOL/USER/DENTIST/DENTAL_AIDE have `created_at` + `updated_at` per the ERD. STUDENT has `created_at` only (no `updated_at` in the ERD) — handled via Mongoose's `timestamps: { updatedAt: false }` option.

## Repo hygiene done this session
- Added root `.gitignore` (node_modules, .env, .env.local, dist, build)
- Untracked `node_modules/` and `dist/` that were previously committed (72k+ files removed from git history going forward)
- Added `CLAUDE.md` at repo root with the full FLORAL build spec
- Deleted stale auto-generated prototype status docs (button-fix summaries, validation reports) that no longer reflect reality
- Moved `Group404 - Manuscript.md` to `docs/` — contains Chapter 1 (~line 95) and Chapter 3 (~line 315), referenced from `CLAUDE.md`'s Chapter References section instead of nonexistent chapter1.pdf/chapter3.pdf

## Verified
- `npm run dev:server` starts the Express app locally
- `GET /api/health` → `{"status":"ok","db":"connected"}` against the real `floral-cluster` Atlas cluster
- Smoke-tested School model: created a doc (confirmed `isArchived` defaults `false`), read it back by `_id`, deleted it — all against the real cluster, no leftover test data

## Not done yet (deliberately out of scope so far)
- No STUDENT_IPTR / MEDICAL_HISTORY / DIETARY_SOCIAL_HABITS / ORAL_HEALTH_CONDITION models (Sprint 3)
- No CRUD routes for any model beyond health check (Sprint 6)
- No JWT auth (Sprint 7) — `password_hash` field exists but is unused
- No data encryption (Sprint 8) — sensitive fields are currently plain text in the DB
- Not yet deployed to Vercel (Sprint 17) — only linked/configured

## Next sprint
Sprint 3 → STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION models, per the exact ERD in `CLAUDE.md` / Chapter 3 of the manuscript. Do not start without explicit approval.
