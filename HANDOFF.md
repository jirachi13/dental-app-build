# HANDOFF — Sprint 11 Complete

## Status
Sprints 1-11 done and verified against the real MongoDB Atlas cluster.
- Sprint 1: Express MVC + MongoDB connection
- Sprint 2: SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE models
- Sprint 3: STUDENT_IPTR, MEDICAL_HISTORY, DIETARY_SOCIAL_HABITS, ORAL_HEALTH_CONDITION models
- Sprint 4: DENTAL_CHART, TOOTH_RECORD, TREATMENT models
- Sprint 5: PREVENTIVE_CARE_RECORD, RISK_STRATIFICATION, APPOINTMENT, AUDIT_TRAIL models
- Sprint 6: CRUD API for all 16 model routers
- Sprint 7: JWT auth (httpOnly cookies) + 5-role auth machinery (RBAC middleware built, not yet wired into routes)
- Sprint 8: Field-level encryption (STUDENT, DENTAL_AIDE, MEDICAL_HISTORY, TREATMENT)
- Sprint 9: Inventoried all dummy frontend data (no code changes — see chat history for the full list)
- Sprint 10: real auth wired end-to-end; 4 duplicated student-data arrays + AccountManagement consolidated into real API calls. AuditTrail deliberately left on dummy data (see below).
- Sprint 11: Appointment scheduling module wired to real API, plus new DentistRotation model (not in original ERD)

## What exists now
**Backend** (`dental-4-12-main/project/server/`):
- `app.ts` — CORS (`origin: true, credentials: true`), JSON parsing, cookie-parser, DB-connect middleware, mounts routes at `/api`, error handler (400 on Mongoose validation/cast errors, 500 otherwise, no stack traces)
- `config/db.ts` — Mongoose connection, cached across invocations for serverless reuse
- `models/` — all 16 ERD models + `models/shared/softDelete.ts` (shared isArchived/archivedAt/archivedBy) + `models/shared/fieldEncryption.ts` (shared mongoose-field-encryption config)
- `routes/crudFactory.ts` — generic CRUD router (GET list/by-id, POST, PUT, archive/restore if the model has isArchived) used for all 16 models instead of hand-written controllers. Mass-assignment guard strips protected fields from POST/PUT bodies. PUT uses `findById` + `.save()` (not `findByIdAndUpdate`) — see encryption bug below.
- `routes/authRoutes.ts` + `controllers/authController.ts` — login/refresh/logout/me, JWT access (15min) + refresh (7d) tokens as httpOnly cookies
- `middleware/auth.ts` — `requireAuth`, `requireRole` (built, **not yet wired into any CRUD route** — outstanding work)
- `scripts/seedAdmin.ts`, `seedDemo.ts`, `seedStudents.ts` — bootstrap real schools + demo accounts (one per role) + 18 demo students with IPTR/chart/risk data
- `local.ts` (dev entry, `npm run dev:server`) / `api/index.ts` + `vercel.json` (Vercel serverless entry + rewrite)

**Frontend** (`dental-4-12-main/project/src/app/`):
- `api/client.ts` — fetch wrapper (`credentials: include`, `/api` base path), `ApiError` class
- `api/types.ts` — shared API response types
- `hooks/useStudents.ts` — fetches students + schools + IPTRs + dental charts + preventive records + risk stratifications, joins them client-side into the UI's existing row shape (id/name/birthdate/gender/grade/section/school/lastVisit/oralStatus/riskLevel). `oralStatus` is derived from `riskLevel` (High→Needs Treatment, Medium→Under Treatment, Low→Orally Fit, none→Not Yet Screened) — there's no such field in the ERD, this mirrors what the prototype already displayed.
- `hooks/useUsers.ts` — fetches users + schools, maps to a display row (role label, resolved school name, Active/Inactive from `isArchived`), exposes `reload()` for after create/archive/restore actions
- `context/AuthContext.tsx` — real `/api/auth/login`, `/api/auth/me` (session restore on load, with a `loading` flag `RootLayout` waits on), `/api/auth/logout`
- `vite.config.ts` — dev proxy `/api` → `localhost:4000`; `package.json` got its first `"dev"` script (was missing entirely)

## Key architectural decisions (condensed from Sprints 2-8)
- **IDs**: Mongo's native `_id` only, no separate literal ID fields despite the ERD's relational notation. FKs are `ObjectId` refs.
- **USER**: added `email` (login identifier, not in ERD) and `password_hash` (`select: false` by default, explicitly selected in `authController.login`) ahead of when the ERD specifies them. `school_id` is optional — system_admin/bho_staff aren't tied to one school.
- **Soft-delete fields vary per model exactly per the ERD** — not every model has isArchived/archivedAt/archivedBy or created_at/updated_at; followed literally rather than uniformly. (Full per-model breakdown was in earlier HANDOFF versions — check git history if needed, e.g. `git show <old-commit>:HANDOFF.md`.)
- **Auth**: httpOnly `sameSite: lax` cookies (not Authorization headers), stateless refresh tokens (no DB revocation list — acceptable at this app's scale of ~10 staff users).
- **Encryption**: `mongoose-field-encryption`, scoped to STUDENT (full_name/address/contact_number), DENTAL_AIDE (contact_number), MEDICAL_HISTORY (allergies/others — not the boolean condition flags), TREATMENT (diagnosis/treatment_done). USER.full_name NOT encrypted (staff, not patient PII).
- **RBAC**: machinery built (Sprint 7), routes not yet protected (deliberately deferred, tracked as outstanding).

## Bugs found and fixed along the way
1. **`GET /api/users` leaked `password_hash`** (Sprint 7) — fixed via `select: false` on the schema field.
2. **`findByIdAndUpdate` corrupts encrypted fields** (Sprint 8) — this version of `mongoose-field-encryption` has a broken `pre('findOneAndUpdate')` hook that crashes the next read (`crypto.createDecipher is not a function`, a removed Node API). Fixed by switching `crudFactory`'s PUT handler to `findById` + `.save()`, which uses the library's working `pre('save')` hook. Verified Mongoose validation still runs against plaintext (not ciphertext) before that hook fires.
3. **`Root.tsx` granted broad clinical access to an undefined `'clinic_staff'` role** that doesn't match any of the 5 real roles in CLAUDE.md (Sprint 10) — fixed nav permissions to match CLAUDE.md's documented per-role access exactly.
4. **`Dashboard.tsx` had two role-gated dashboard blocks with swapped role checks** — comments said "SCHOOL ADMIN DASHBOARD" / "BARANGAY HEALTH OFFICE DASHBOARD" but checked the wrong role string each. Fixed to match the comments (which revealed the true intent).
5. **`authController.login` returned a different shape than `/api/auth/me`** — unified to both return the same Mongoose-document shape.
6. **`TreatmentRecords.tsx`'s "Treatment List" view filtered by a hardcoded `Set` of fake sequential IDs** (`'2','5','7'...`) that would never match real ObjectIds — fixed to derive the set from real `/api/treatments` + `/api/student-iptrs` data instead.
7. **The generic CRUD factory let `password_hash` be set directly via POST/PUT on any model** — a client could set a user's password to an arbitrary plaintext string, completely bypassing bcrypt. Found while wiring `AccountManagement`'s Create Account form. Fixed two ways: added `password_hash` to `crudFactory`'s stripped-fields list (defense in depth, harmless on other models since only USER has this field), and added a dedicated `POST /api/users` handler (`userController.createUser`) that properly hashes the password before storage, registered ahead of the generic CRUD router so it intercepts that one route.
8. **`userController.createUser`'s response leaked `password_hash`** — same root cause as bug #1 (`.create()` returns the full document, bypassing `select: false`). Fixed the same way: re-fetch via `findById` before responding. Caught by testing the response body directly, not assumed fixed by the schema-level `select: false` alone.

## Demo credentials (re-seeded per user's exact spec, replacing earlier `.local` versions which are now archived)
| Role | Email | Password | School |
|---|---|---|---|
| System Admin | `admin@floral.com` | `Admin@1234` | — |
| Dentist | `dentist@floral.com` | `Dentist@1234` | Bagong Tanyag Integrated School |
| Dental Aide | `aide@floral.com` | `Aide@1234` | Bagong Tanyag Integrated School |
| School Administrator | `schooladmin@floral.com` | `SchoolAdmin@1234` | Bagong Tanyag Elementary School Annex A |
| Barangay Health Office Staff | `bho@floral.com` | `Bho@1234` | — |

No Quick Demo Login buttons in the UI anymore (removed per user request — real clinical system, no shortcuts). Login screen has a show/hide password toggle instead.

## Verified
- All 16 models smoke-tested against the real Atlas cluster (Sprints 2-5); Sprint 6 CRUD verified end-to-end; Sprint 7 auth flow verified end-to-end (login/me/refresh/logout, password_hash never leaks); Sprint 8 encryption verified end-to-end including the tightest `maxlength` case
- Sprint 10 auth: login verified through the actual Vite dev proxy (not just direct backend) — wrong password → 401, correct login → cookies set + `/api/auth/me` restores session + `/api/schools` resolves correctly
- Sprint 10 student data: `useStudents()`'s join logic independently verified by replaying it in Node against the real API — all 18 seeded students resolve correctly (names decrypt correctly, school names resolve, risk levels match, the 3 "not yet screened" students correctly show `null`)
- Sprint 10 accounts: full create→archive→restore flow verified through the Vite proxy exactly as the UI would call it; confirmed `password_hash` absent from the create response; confirmed a PUT containing `password_hash` is silently stripped and doesn't affect the user's real password (login still works with the original password afterward)
- No browser automation tool available in this environment (no `chromium-cli`/Playwright) — verification is via TypeScript compile (clean, both frontend and backend tsconfigs) + direct API/network testing, not an actual rendered screenshot. Flagged honestly, not assumed.

## AuditTrail.tsx — deliberately NOT wired
Backend `AUDIT_TRAIL` only has `user_id`/`action`/`timestamp`/`affected_record_id`/`affected_model` — no `module`/`details`/`ipAddress` (the UI invented those). More importantly, nothing in the app writes real audit entries yet (that's Sprint 15's job; `AUDIT_TRAIL` is deliberately read-only since Sprint 6). Wiring this now would just show a permanently empty table. User chose to leave it on dummy data until Sprint 15 adds real write triggers.

## Sprint 11 notes
The biggest gap found: the ERD's APPOINTMENT is one student + one dentist + one datetime, but the prototype UI schedules a whole class section (many students) as a single "appointment." Resolved via grill-me round:
- **One real Appointment record per student** (not a new "session" model) — a UI "session" is now N real Appointment rows sharing date/time/dentist/type, grouped back together client-side in `hooks/useAppointments.ts` by a composite key (date+time+school+grade+section+type+dentist). Verified the grouping logic directly against the real API: two appointments created for the same slot correctly merge into one session card with `studentCount: 2`.
- **Added `appointment_type`, `requires_followup`, `parental_supervision_required`** to APPOINTMENT — not in the original ERD, but `appointment_type` is clearly needed (the UI categorizes appointments) and the other two are explicitly named in CLAUDE.md's module description without ever having a field. Documented as ERD deviations in the model file itself.
- **New `DentistRotation` model** — "Dentist Rotation Schedule" (which dentist covers which school which week) had zero ERD backing at all. Built as a genuinely new model (school_id, dentist_id, week_start, week_end, notes) per the user's explicit choice rather than leaving it on dummy data.
- Status updates on a session apply to all of its underlying Appointment records at once (`updateSessionStatus` does a `Promise.all` of individual PUTs) — verified both records flip status correctly.
- Student/dentist pickers in the Create Appointment and Set Rotation modals now use real data (`useStudents()`, real `Dentist` list) instead of hardcoded 5-student arrays and free-text dentist name inputs.

## Not done yet
- RBAC not wired into CRUD routes — everything is reachable by anyone right now, logged in or not
- `AuditTrail.tsx` still uses its own hardcoded array (intentionally, see above)
- No OCR (Sprint 16), no real deployment yet (Sprint 17) — Vercel is linked/configured with all env vars but **a deployment from an early commit auto-deployed and is now stale** (per Vercel's own "Stale" status label) — auto-deploy on push doesn't seem to be triggering; user needs to check Vercel Settings → Git (production branch = main, auto-deploy toggle) or manually redeploy from the dashboard
- `GET`/list responses include the encryption plugin's `__enc_<field>` boolean markers — harmless but cosmetically noisy, not cleaned up
- Phase 3 plan revised in CLAUDE.md: real Excel IPTR data exists (not synthetic) — see CLAUDE.md's Phase 3 section and project memory for details
- Chapter 4/5 manuscript structure saved in project memory, not started (correctly deferred until build+deploy+eval+algo are done)
- `AccountManagement`'s "Edit" button is still a no-op `alert()` placeholder — it always was (no edit form existed before Sprint 10 either), left as-is since building a new edit UI is feature work, not the "data only" swap Sprint 10 asked for

## Next sprint
Sprint 12 → RPC 2-visit tracking module. Do not start without explicit approval.
