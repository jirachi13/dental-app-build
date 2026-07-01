# HANDOFF — Sprint 14 Complete

## Status
Sprints 1-14 done and verified against the real MongoDB Atlas cluster.
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
- Sprint 12: RPC 2-visit tracking module wired to real API — no schema changes needed, PREVENTIVE_CARE_RECORD already covered it
- Sprint 13: Dashboard (all 5 roles) + DOH Reports table wired to real data where genuinely computable; illustrative data kept only where honestly required (see notes below)
- Sprint 14: found and fixed the real gap — PatientList's "Add New Student" form was still a fake alert(), never actually saving. Extended STUDENT with guardian/PhilHealth/4Ps/consent fields (real DOH IPTR data, not UI-invented) and wired the form to a real POST. Audited search/filter across all wired components — no bugs found, TypeScript already guarantees no stale field references.

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

## Sprint 12 notes
Much smaller than Sprint 11 — the ERD's PREVENTIVE_CARE_RECORD (visit_number 1/2, visit_date) already covered everything RPCTracking.tsx needed, no schema changes.
- `hooks/useRPCTracking.ts` joins Student → StudentIptr → PreventiveCareRecord (visit 1 and visit 2), and computes status/daysUntilDue client-side: both visits done → `complete`; visit 1 only, within 150 days → `pending`; visit 1 only, past 150 days → `overdue`; no visits → `not-started`. The 150-day interval is the midpoint of the "4-6 month interval" already written in the UI's own subtitle text — not a new invented number.
- **Encryption gotcha hit again**: a new seed script (`seedRpcVisit2.ts`) tried `Student.findOne({ full_name: "..." })` to look up a couple of already-seeded students by name, and got zero matches — `full_name` is encrypted (Sprint 8), so a plaintext-value DB query can't match the stored ciphertext. Fixed by fetching all students and filtering in JS after Mongoose decrypts on read. Worth remembering for any future script/query that filters by an encrypted field (full_name, address, contact_number, allergies, others, diagnosis, treatment_done).
- Added `seed:rpc-visit2` script: backdates 2 already-seeded students' Visit 1 and adds a Visit 2 for one of them, so the RPC table has real examples of all 4 statuses (complete/pending/overdue/not-started) instead of everyone looking "pending."
- Verified the exact status computation against the real API for all 18 students — matches expectations precisely (Aldrin Villanueva → complete, Trisha Santos → overdue, the 3 unscreened students → not-started, rest → pending).
- This component is read-only (clicking a row navigates to the student's dental chart) — no create-form to wire, which is why this sprint was much smaller than 11.

## Sprint 13 notes
Biggest "real vs. fake" gap of any sprint so far — scoped in two rounds of grill-me before building, since Dashboard.tsx (5 role-specific views, 800 lines) and Reports.tsx (a full DOH report generator, 858 lines) had huge portions with no possible real backing yet.

**Policy established** (extends the AuditTrail.tsx precedent from Sprint 10): wire what's genuinely computable from real data now; leave clearly-illustrative data only where it's honestly required — never fabricate fake historical trends or invent new models just to make a chart look wired.

**What's real now:**
- Dashboard: all 4 non-system-admin roles' KPI cards, risk/oral-health distributions, School Admin/BHO per-school aggregates, age-group breakdown — all computed from real `useStudents()`/`useAppointments()`/`useRPCTracking()` data plus a few direct fetches (`/api/users`, `/api/treatments`, `/api/student-iptrs`, `/api/dental-charts`). "Appointments by Status (This Week)" bucket chart is real too — it's not a historical trend, just today's/this-week's real Appointment records grouped by day, so it didn't need to be excluded like the monthly trend charts did.
- Reports.tsx DOH table: `hooks/useDohReportData.ts` replaces the module-level `V()` mock lookup with one backed by real `MEDICAL_HISTORY`/`DIETARY_SOCIAL_HABITS`/`ORAL_HEALTH_CONDITION`/`RISK_STRATIFICATION` data for ~20 of the ~50 DOH row fields (Medical History section, Dietary/Social section, 4 of ~13 Oral Health Status fields, DMF/dmf totals, OFC-exam count), falling back to the original sparse mock (`MOCK_V`) for everything else. Because the whole table is driven through one lookup function, wiring it didn't require touching any of the table-generation JSX.
- New seed script `seedIptrDetails.ts`: creates `MEDICAL_HISTORY`/`DIETARY_SOCIAL_HABITS`/`ORAL_HEALTH_CONDITION` records for all 18 demo students (these models existed since Sprint 3 but had zero seeded records until now) — deterministic pseudo-variety via a string hash so reruns don't duplicate.

**What's still illustrative, and why:**
- Dashboard: 6-month oral health trend, 7-day login activity, monthly coverage trend — all need historical time-series snapshots that don't exist (single current-state dataset, not months of history). "Pending Tasks"/"Pending Tasks by Priority" — no Task entity anywhere in the ERD. System Admin's login activity/actions-by-module/recent-audit/failed-logins/uptime — all blocked on Sprint 15's real audit-trail writes (same reason AuditTrail.tsx itself is still mocked) or simply unmeasurable (uptime).
- Reports.tsx: the ~30-row "Services Rendered" section (tooth-count/head-count per procedure, fluoride doses, BOHC location, toothbrush drills) has **no backing model in the ERD at all** — not a seeding gap, a genuine schema gap, confirmed with the user as out of scope for this sprint. The entire separate "Internal Reports" tab (referrals, bulk treatment sessions, treatment/condition matrices) is in the same category — no Referral model, no session-level procedure/treated tracking — left fully on dummy data.
- A handful of individual Oral Health Status / DMF rows (dentalCaries, edentulous, decayed/missing/filled component breakdown) also stayed mock — `RISK_STRATIFICATION` only stores a single `dmf_score` total, not the D/M/F component breakdown these specific rows need.

Verified end-to-end against the real Atlas cluster: replayed both the Dashboard aggregation logic and the DOH report field-mapping logic in Node against the live API — numbers matched seed data exactly (e.g. 4 students with hypertension, 5 with gingivitis, 5 Low-risk/OFC-exam, 10 with `dmf_score > 0` — all internally consistent with what `seedIptrDetails.ts` and earlier seed scripts actually created).

## Sprint 14 notes
- **STUDENT model extended**: `guardian_name`, `guardian_contact`, `philhealth_number`, `philhealth_status`, `is_4ps`, `fourps_id`, `consent_status` — not in the original ERD, but real DOH IPTR school-registration data the prototype's Add Student form already collected (same rationale as Sprint 11's `appointment_type`). `guardian_name`/`guardian_contact`/`philhealth_number`/`fourps_id` are encrypted (sensitive PII/ID, consistent with the existing encryption policy); `philhealth_status`/`is_4ps`/`consent_status` are not (need to stay queryable/filterable, same reasoning as other boolean/enum fields left unencrypted).
- Verified end-to-end against the real cluster: created a student with all new fields via `POST /api/students`, confirmed `guardian_name`/`philhealth_number` are stored as real ciphertext in the raw collection, confirmed the `PUT` update path (the one with the Sprint 8 `findById`+`.save()` fix) works correctly on the new fields too.
- `useStudents()` now exposes `reload()` so the UI can refresh after adding a student — same pattern as `useUsers()`/`useDentistRotations()`.
- **Found `TreatmentLog.tsx` and `FollowUpAlerts.tsx` are both orphaned** — not referenced in `routes.tsx` or imported anywhere, genuinely unreachable dead code. Left un-wired per YAGNI; flagging in case they're meant to be wired into routing at some point rather than actually dead.
- Audited search/filter across all wired list components (`PatientList`, `TreatmentRecords`, `DentalChartNav`, `DentalChartList`, `RPCTracking`, `AccountManagement`) — no bugs found. They're checked against strongly-typed hook return shapes (`StudentRow`, `RPCRow`, etc.), so a stale/renamed field reference would already be a TypeScript compile error; none exist.
- `AccountManagement`'s "Edit" button is still a no-op `alert()` placeholder — flagged as a candidate for actual feature work (a real edit modal) rather than built unprompted, since it's new functionality, not a fix to something broken by the data-wiring sprints.

## Not done yet
- RBAC not wired into CRUD routes — everything is reachable by anyone right now, logged in or not
- `AuditTrail.tsx` still uses its own hardcoded array (intentionally, see above)
- No OCR (Sprint 16), no real deployment yet (Sprint 17) — Vercel is linked/configured with all env vars but **a deployment from an early commit auto-deployed and is now stale** (per Vercel's own "Stale" status label) — auto-deploy on push doesn't seem to be triggering; user needs to check Vercel Settings → Git (production branch = main, auto-deploy toggle) or manually redeploy from the dashboard
- `GET`/list responses include the encryption plugin's `__enc_<field>` boolean markers — harmless but cosmetically noisy, not cleaned up
- Phase 3 plan revised in CLAUDE.md: real Excel IPTR data exists (not synthetic) — see CLAUDE.md's Phase 3 section, docs/phase3-sprint-prompts.md, and project memory for details
- Chapter 4/5 manuscript structure saved in project memory, not started (correctly deferred until build+deploy+eval+algo are done)
- `AccountManagement`'s "Edit" button is still a no-op `alert()` placeholder (see Sprint 14 notes)
- `TreatmentLog.tsx` and `FollowUpAlerts.tsx` are orphaned/unreachable — not wired into routing at all

## Next sprint
Sprint 15 → Soft delete + audit logs. Do not start without explicit approval.
