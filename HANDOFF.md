# HANDOFF — Sprint 7 Complete

## Status
Sprints 1-7 done and verified against the real MongoDB Atlas cluster.
- Sprint 1: Express MVC + MongoDB connection
- Sprint 2: SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE models
- Sprint 3: STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION models
- Sprint 4: DENTAL_CHART, TOOTH_RECORD, TREATMENT models
- Sprint 5: PREVENTIVE_CARE_RECORD, RISK_STRATIFICATION, APPOINTMENT, AUDIT_TRAIL models
- Sprint 6: CRUD API for all 16 model routers
- Sprint 7: JWT auth (httpOnly cookies) + 5-role auth machinery (RBAC middleware built, not yet wired into Sprint 6 routes)

## What exists now
- `dental-4-12-main/project/server/` — Express MVC backend
  - `app.ts` — app config: CORS, JSON parsing, DB-connect middleware, mounts routes at `/api`, error handler (no stack traces exposed)
  - `config/db.ts` — Mongoose connection, cached across invocations for serverless reuse
  - `routes/index.ts`, `controllers/healthController.ts` — `/api/health` endpoint only
  - `local.ts` — local dev entry point (`npm run dev:server`, listens on port 4000)
  - `models/` — all 16 ERD models: `School.ts`, `User.ts`, `Dentist.ts`, `DentalAide.ts`, `Student.ts`, `StudentIptr.ts`, `MedicalHistory.ts`, `DietarySocialHabits.ts`, `OralHealthCondition.ts`, `DentalChart.ts`, `ToothRecord.ts`, `Treatment.ts`, `PreventiveCareRecord.ts`, `RiskStratification.ts`, `Appointment.ts`, `AuditTrail.ts` — `models/index.ts` barrel export
  - `models/shared/softDelete.ts` — shared `isArchived`/`archivedAt`/`archivedBy` fields, spread into models that have them per the ERD
- `dental-4-12-main/project/api/index.ts` — Vercel serverless entry, re-exports the same Express app
- `dental-4-12-main/project/vercel.json` — rewrites `/api/*` → the single function so Express handles sub-routing
- `dental-4-12-main/project/tsconfig.server.json` — separate Node-targeted tsconfig (frontend tsconfig.json is bundler/DOM-targeted, kept untouched)
- `dental-4-12-main/project/.env` — local `MONGODB_URI` (gitignored, not committed)
- Vercel project linked to this repo, root directory set to `dental-4-12-main/project`. Env vars set as Sensitive for Production + Preview (Development intentionally left unset — Vercel disallows Sensitive + Development together; local dev uses the `.env` file instead): `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (production secrets are deliberately different values from the ones in local `.env`)

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

## Sprint 6 notes
- `server/routes/crudFactory.ts` — generic CRUD router factory used for all 16 models instead of hand-writing near-identical controllers. Mounts `GET /`, `GET /:id`, `POST /`, `PUT /:id`, and (only if the model's schema has `isArchived`) `PATCH /:id/archive` and `PATCH /:id/restore`.
- **Mass-assignment guard**: `_id`, `isArchived`, `archivedAt`, `archivedBy`, `created_at`, `updated_at` are stripped from POST/PUT bodies before they reach Mongoose, so a client can't self-unarchive or backdate a record through the regular update route. Verified: `PUT` with `isArchived:true` in the body left the doc unarchived.
- `GET /` defaults to `isArchived: false`; pass `?includeArchived=true` to see archived records too. No role check yet — CLAUDE.md says only System Admin should see archived records, but that requires auth (Sprint 7) to know who's asking. This is unprotected for now, intentionally, to be locked down then.
- **AUDIT_TRAIL is read-only** (`{ readOnly: true }`) — no POST/PUT routes exist for it. Letting arbitrary clients write fake audit entries would defeat its purpose; verified `POST /api/audit-trails` returns 404 (no route registered). Audit entries will be created internally by other actions in a later sprint, not via public API.
- Error handler in `app.ts` now returns 400 (not 500) for Mongoose `ValidationError`/`CastError`, surfacing the validation message without a stack trace.
- Verified end-to-end against the real Atlas cluster: create → list (excludes archived) → get-by-id → update (mass-assignment blocked) → archive → list (excludes it) → `includeArchived=true` (includes it) → restore → invalid-ObjectId returns 400 → AuditTrail POST returns 404. Test record was archived then hard-deleted via a one-off script (not through the API, since hard delete is intentionally not exposed) to leave the DB clean.
- All 16 models from the ERD now exist. Phase 1 remaining work: auth (Sprint 7), encryption (Sprint 8), frontend wiring (Sprints 9-14), soft-delete/audit enforcement + role checks in routes (Sprint 15), security (15.5), OCR (16), deploy (17).

## Sprint 7 decisions (grill-me round)
- **Login identifier**: added `email` to USER (unique, required, lowercase) — the ERD had no login field at all. Not in the original ERD; documented in CLAUDE.md.
- **Token storage**: httpOnly, `sameSite: lax` cookies (`access_token` 15min, `refresh_token` 7 days) instead of Authorization headers — not readable by JS, protects against XSS token theft. `secure` flag is environment-gated (`NODE_ENV === "production"`) since local dev runs on plain HTTP.
- **CORS**: `cors({ origin: true, credentials: true })` so cookies work in local dev where frontend (Vite) and backend (Express on :4000) are different origins; in production the Vercel rewrite makes them same-origin anyway.
- **Refresh tokens are stateless** (JWT-only, no DB-backed session/revocation list) — simplest approach that satisfies "Refresh token handling" from AUTH RULES. Logout just clears cookies; there's no way to remotely invalidate a stolen refresh token before it expires. Acceptable for now given app scale (~10 staff users); revisit if that changes.
- **RBAC scope**: built the machinery only (`requireAuth`, `requireRole` middleware in `server/middleware/auth.ts`) — did NOT retrofit Sprint 6's CRUD routes with role checks yet, so all CRUD/archive/restore endpoints remain open to anyone right now. That wiring is a focused follow-up, not bundled into this sprint.
- **Bootstrap admin**: `npm run seed:admin` reads `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` from `.env` and creates the first `system_admin` user if one doesn't already exist with that email. Ran locally — created `admin@floral.local`.
- **Security fix found during testing**: `GET /api/users` was leaking `password_hash` (bcrypt hash) in responses via the Sprint 6 generic CRUD route — this is an output-sanitization bug independent of the RBAC-deferral decision, so it was fixed now rather than left for later. Fixed via `select: false` on `User.password_hash`; `authController.login` explicitly `.select("+password_hash")` to compare it.

## Action needed from you
Done: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` added to Vercel (Production + Preview, Sensitive) — confirmed with fresh, production-only values, distinct from local `.env`.

(`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` are only needed locally to run the one-off seed script — no need to add them to Vercel. The first production `system_admin` will need to be seeded separately once deployed, e.g. by running the seed script with `MONGODB_URI` pointed at production, or by promoting a user manually — not done yet.)

## Repo hygiene done this session
- Added root `.gitignore` (node_modules, .env, .env.local, dist, build)
- Untracked `node_modules/` and `dist/` that were previously committed (72k+ files removed from git history going forward)
- Added `CLAUDE.md` at repo root with the full FLORAL build spec
- Deleted stale auto-generated prototype status docs (button-fix summaries, validation reports) that no longer reflect reality
- Moved `Group404 - Manuscript.md` to `docs/` — contains Chapter 1 (~line 95) and Chapter 3 (~line 315), referenced from `CLAUDE.md`'s Chapter References section instead of nonexistent chapter1.pdf/chapter3.pdf

## Verified
- `npm run dev:server` starts the Express app locally
- `GET /api/health` → `{"status":"ok","db":"connected"}` against the real `floral-cluster` Atlas cluster
- All 16 models smoke-tested with linked create/read/delete against the real cluster across Sprints 2-5
- Sprint 6 CRUD routes verified end-to-end
- Sprint 7 auth flow verified end-to-end against the real cluster: wrong password → 401; correct login → cookies set, `last_login` updated; `GET /api/auth/me` with cookie → 200 with user (no password_hash); without cookie → 401; `POST /api/auth/refresh` → new access token; `POST /api/auth/logout` → cookies cleared; `GET /api/auth/me` after logout → 401. Confirmed `password_hash` absent from both `/api/auth/me` and `/api/users` after the `select: false` fix.

## Not done yet (deliberately out of scope so far)
- RBAC not yet wired into Sprint 6's CRUD routes — all CRUD/archive/restore endpoints are currently unprotected (anyone can call them without logging in)
- No data encryption (Sprint 8) — sensitive fields are currently plain text in the DB
- No frontend wiring to the real API yet (Sprints 9-10), including no login UI
- Not yet deployed to Vercel (Sprint 17) — only linked/configured; `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` not yet added to Vercel env vars (see "Action needed from you" above)

## Next sprint
Sprint 8 → Data encryption setup (full_name, address, contact_number, medical_history fields, diagnosis, treatment_done). Flagged complex in CLAUDE.md — requires a clarifying round before building. Do not start without explicit approval. (RBAC retrofit into CRUD routes is also outstanding and can be done as a smaller follow-up whenever convenient — not tied to a specific numbered sprint.)
