# LEDGER — security & architecture

Append-only. Stable IDs. **Nothing is deleted — status changes instead.**

Status: `OPEN` · `FIXED (Sprint N)` · `WONTFIX (reason)` · `NOT-A-BUG (reason)`
Severity: `HIGH` · `MED` · `LOW`

A row without an Evidence line (a `file:line`, or a command and its output) does not belong here.

**Audit sprints do not fix.** A fix is its own approved sprint, which flips the status in the same
commit as the change.

| Sprint | Surface | Status |
|---|---|---|
| 151 | Architecture map + trust boundaries | DONE — 3 seeded, 11 new |
| 152 | Auth & session | DONE — 7 new; SEC-04 corrected, SEC-07 closed, SEC-08 confirmed, SEC-10 raised |
| 153 | RBAC & multi-school tenancy | DONE — 4 new + the matrix; SEC-04's open question answered. ⚠ live spot-check NOT run (SEC-00) |
| 154 | Route-by-route input + authz | not started |
| 155 | Data layer | not started |
| 156 | Client-side & supply chain | not started |
| 157 | ML boundary | not started |

---

## Seeded from HANDOFF (known before the audit began — recorded, not rediscovered)

### SEC-00 · this machine's `dental-4-12-main/project/.env` · HIGH · OPEN
Claim:    This PC's `.env` points at the PRODUCTION database, and no dev database exists on it.
Evidence: HANDOFF.md, 10th session resume note (2026-09-07), "THE FINDING THAT OUTRANKS THE REST".
Impact:   Every seeder, migration and local `dev:server` run touches live patient data by default.
          `PRODUCTION_DB_HOST` was unset here too, so both halves of the Sprint 126 safety net were
          off on the one machine that needed them. The label was fixed; the separation was not.
Fix:      Copy the whole dev `.env` from the laptop — never one line, the `FIELD_ENCRYPTION_SECRET`s
          differ. User action, not a sprint.

### SEC-01 · GitHub ruleset `protect-main` · LOW · OPEN
Claim:    Branch-protection bypass "Repository admin — Always allow" is active on `main`.
Evidence: HANDOFF.md `## Live warnings`; verified in the GitHub UI 2026-09-02.
Impact:   The owner's pushes bypass review. Deliberate today; it means the ruleset constrains
          collaborators only.
Fix:      Remove the bypass entry to make the discipline apply to the owner too. User decision.

### SEC-02 · `docs/Group404 - Manuscript.md` · HIGH · WONTFIX (accepted, repo stays private)
Claim:    Real patient PII is committed and is in git history — Appendix E (`[image16]`) is a FILLED
          Target Client List: ~20 handwritten names, addresses, birthdates, sex, consultation dates
          of minors. Appendix F carries the dentist's signature.
Evidence: HANDOFF.md `## Live warnings`; acknowledged and deferred by the user 2026-09-02.
Impact:   The repo cannot be made public by a redaction commit — the blob stays in history. Going
          public would need `git filter-repo` + force-push.
Fix:      None while private. Re-open if publication is ever considered. The 2026-08-08 "secret
          audit, clean" note does NOT cover this — that scan looked for credentials, and image data
          inside a markdown file is invisible to it. Both statements are true about different things.

---

## Sprint 151 — architecture map & trust boundaries

### ARCH-01 · `server/routes/index.ts` vs `server/routes/crudFactory.ts` · HIGH · OPEN
Claim:    **There are two read surfaces with different guarantees.** 20 models are mounted through
          `createCrudRouter`, which enforces role, school scope, archive visibility and per-role
          redaction in one place. Alongside it sit **12 hand-written `GET /stats/*` routes** that
          re-implement their own reads and are bound only by `requireAuth`.
Evidence: `server/routes/index.ts` — CRUD mounts at 53, 69–71, 892, 934–941, 946, 959–960, 971, 991,
          1004; `/stats/*` at 95, 100, 155, 331, 391, 426, 464, 537, 620, 671, 760, 792.
          Not one of the twelve passes `requireRole`.
Impact:   This is the architectural root of SEC-03 and SEC-04. Every guarantee the factory makes has
          to be re-made by hand twelve times, and a new `/stats` route inherits nothing. The
          factory's own comment states the principle it breaks — "Hiding the screens is not enough;
          the API is the door" (`crudFactory.ts`, `redact` docblock).
Fix:      needs scoping — Sprint 154 enumerates, then a fix sprint decides between per-route guards
          and a shared `statsRoute()` wrapper carrying role + scope + redaction.

### SEC-03 · `server/routes/index.ts:846` (+ :362, :492, :566) · HIGH · OPEN
Claim:    **Four `/stats/*` routes return pupil names to any authenticated caller, including
          `school_admin`, while `GET /api/students` redacts exactly those fields for that role.**
Evidence: `index.ts:921–926` redacts `full_name, first_name, last_name, middle_name, address,
          contact_number, guardian_name, guardian_contact, philhealth_number, fourps_id,
          place_of_birth, guardian_occupation` for `roles: ["school_admin"]`.
          `index.ts:846` (`/stats/student-rows`) emits `name:` built from `s.last_name`/`s.first_name`
          with no role check and no redaction; same at `:362` (`/stats/reports-panels`), `:492`
          (`/stats/rpc-rows`), `:566` (`/stats/risk-candidates`). All four are `requireAuth` only.
Impact:   A School Administrator — a role CLAUDE.md limits to "school reports + dashboards only, no
          clinical records" — can retrieve identified pupil rows for their school by calling the
          stats endpoint directly. This is the same hole Sprint 101 closed on `/students`, still
          open on the parallel surface.
Fix:      needs scoping. Apply the same redaction (or a role gate) on the four routes.
⚠ Not yet confirmed against a live server. Sprint 153's spot-check must log in as `school_admin`
  and call `/api/stats/student-rows` before this is treated as proven rather than read off the code.

### SEC-04 · `server/models/User.ts:14` + `server/utils/schoolScope.ts:137` · HIGH · OPEN
⚠ **CLAIM CORRECTED IN SPRINT 152.** Originally written as "scoping fails OPEN", implying a bug and
a file at odds with itself. `User.ts` shows the semantic is **deliberate and documented**. The
finding survives the correction; its cause does not.

Claim:    **"All schools" and "assigned to nothing" are the same value, so there is no way to express
          the second.** An empty `school_ids` is the intentional sentinel for global access.
Evidence: `User.ts:14` (Sprint 100), verbatim: "**EMPTY ARRAY MEANS ALL SCHOOLS**: that keeps
          system_admin and bho_staff working exactly as the old `school_id: null` did, with one rule
          instead of a per-role special case."
          Consumed at `schoolScope.ts:137` `return ids.length === 0 ? null : ids;` → `:155`
          `if (!schools) return null;` → `crudFactory.ts` `model.find(scope ? { $and: [...] } : filter)`.
Impact:   Unchanged, and it is the reason the row stays HIGH. A `school_admin` whose assignments are
          cleared — by an edit that removes the last school, a create that never set one, or a
          migration — becomes a **global** reader of all ~8,000 pupils rather than a reader of
          nothing. The role that most needs scoping is the one the sentinel silently promotes.
          Note the same file fails CLOSED for an unknown model (`:161`, "must not silently become
          world-readable"). Models are protected against omission; users are not.
Fix:      needs scoping — separate the two meanings, e.g. name the globally-scoped roles explicitly
          rather than inferring them from an empty array. ⚠ Any fix must keep `system_admin` and
          `bho_staff` global, which is what the sentinel is carrying today.
Open question for Sprint 153: **can a `school_admin` actually reach an empty `school_ids` through the
UI or the API?** `userController.ts` and AccountManagement decide whether this is reachable or only
theoretical, and that is what settles the true severity.

### SEC-05 · `server/routes/crudFactory.ts` archive + restore · MED · OPEN
Claim:    Archive and restore use `findByIdAndUpdate` on every model, including the encrypted ones,
          which this codebase forbids everywhere else.
Evidence: `crudFactory.ts` archive and restore handlers both call `model.findByIdAndUpdate(...)`.
          The PUT handler on the same file carries the reason not to: "the latter's
          `pre('findOneAndUpdate')` hook in mongoose-field-encryption has a bug that corrupts
          encrypted fields and crashes on the next decrypt (calls a removed Node crypto API)".
          HANDOFF `## Durable gotchas` states the rule as absolute: "CRUD uses `findById`+`.save()`,
          never `findByIdAndUpdate`".
Impact:   If the plugin's hook fires regardless of which fields the update touches, archiving a
          STUDENT could corrupt its encrypted fields — an unrecoverable data fault reached through a
          routine action.
Fix:      **Verify before fixing.** Sprint 155 must establish empirically whether the hook fires when
          the `$set` contains no encrypted field. If it does not fire, this becomes NOT-A-BUG with
          the reason recorded. Do not "fix" it on the strength of the rule alone.

### SEC-06 · `server/routes/crudFactory.ts` archive + restore responses · MED · OPEN
Claim:    Archive and restore answer `res.json(doc)` without `decryptForResponse(doc)`, unlike POST
          and PUT which both apply it.
Evidence: `crudFactory.ts` — POST `res.status(201).json(decryptForResponse(doc))`, PUT
          `res.json(decryptForResponse(doc))`, archive/restore `res.json(doc)`.
Impact:   Either ciphertext reaches the client on archive/restore of an encrypted model, or the
          `new: true` document was hydrated through `post('init')` and decryption already happened.
          Which one decides whether this is a bug or dead weight.
Fix:      Verify in Sprint 155 alongside SEC-05 — one test archives a STUDENT and reads the response
          body.

### SEC-07 · `server/app.ts` CORS + cookie auth · LOW · NOT-A-BUG (SameSite=Lax closes the browser vector)
Claim (as written in 151): cookie auth with no CSRF token may allow forged state-changing requests.
Resolved: **Sprint 152 read the cookie flags. The vector is closed.**
Evidence: `authController.ts` `baseCookieOptions` = `{ httpOnly: true, secure: isProd, sameSite:
          "lax" }`, applied to both `access_token` and `refresh_token` at issue, at refresh, and at
          `clearCookie` on logout.
Why it holds: `SameSite=Lax` withholds the cookie from cross-site `POST`/`PUT`/`PATCH`, which is the
          entire CSRF vector here — every state change in this API is one of those verbs. Lax does
          send the cookie on top-level cross-site **GET** navigations, and that is harmless because
          no GET in this API mutates anything. `httpOnly` also keeps the token away from any XSS
          that does get a foothold.
No action. Recorded so a later sprint does not re-raise it. ⚠ Re-open if any state-changing `GET` is
ever added, or if `sameSite` is ever loosened to `"none"`.

### SEC-08 · `src/app/api/client.ts:96-104` + `src/sw.ts` · MED · OPEN
Claim:    Decrypted patient records persist in the browser's Cache Storage after logout.
Evidence: `client.ts` `captureBaselineSnapshot` opens `caches.open('api-cache')` and reads whole
          `/api/*` responses, described in its own comment as populated by "the service worker's
          NetworkFirst `/api/*` caching".
          **CONFIRMED in Sprint 152** — `AuthContext.tsx:259-268`, the whole logout path: `POST
          /auth/logout`, `setUser(null)`, `clearUserCache()`, `clearSessionHint()`,
          `setSelectedSchoolState(null)`. **No `caches.delete('api-cache')`.** In 151 this was
          inference from the absence of evidence; it is now read off the logout function itself.
          Distinct from `authCache.ts`, which logout DOES clear — that one holds staff identity
          (id, name, email, role, schools), not patient data.
Impact:   On a shared clinic PC, pupil names, addresses, guardian contacts and PhilHealth numbers —
          the fields encrypted at rest in Atlas — sit in plaintext in the browser profile, readable
          by the next user of that machine. Encryption at rest is undone at the edge.
Fix:      needs scoping — Sprint 156 confirms what the SW actually caches and whether logout should
          call `caches.delete('api-cache')`. ⚠ It must not break the offline queue's baseline
          snapshots, which depend on that cache.

### SEC-09 · `server/app.ts` error handler · LOW · OPEN
Claim:    Mongoose `ValidationError` and `CastError` messages are returned verbatim to the client.
Evidence: `app.ts` — `if (err.name === "ValidationError" || err.name === "CastError") { res.status(400)
          .json({ error: err.message }); }`.
Impact:   Leaks schema field names, enum values and model names. No stack trace (that rule is
          honoured — `console.error(err)` is server-side only and the 500 body is generic), so this
          is disclosure, not exposure.
Fix:      Map to a generic 400 message, or allowlist the messages safe to surface.

### SEC-10 · `server/routes/authRoutes.ts:32` · MED · OPEN
⚠ **SEVERITY RAISED IN SPRINT 152 (was LOW).** Reading the controller showed the unlimited route
that matters is not `/auth/refresh` — it is `/auth/change-password`, and the file argues against
itself about it.

Claim:    **`PATCH /auth/change-password` verifies the current password and is not rate-limited**,
          which is precisely the oracle `/auth/verify-password` was rate-limited to prevent.
Evidence: `authRoutes.ts:32` — `router.patch("/change-password", requireAuth, ...)`, no
          `makeAuthLimiter()`. `authController.changePassword` calls `comparePassword(currentPassword,
          user.password_hash)` and answers 401 "Current password is incorrect" on a miss.
          Two lines below, `:35` `verify-password` **is** limited, with the reason in the comment:
          "an unlimited yes/no on a password is an oracle" — and `verifyPassword` does the same
          `comparePassword` and returns the same yes/no.
Impact:   Anyone holding a live session (a borrowed unlocked clinic PC, a stolen cookie) can brute-
          force the account's current password at unlimited rate, then change it. The step-up route
          built to prevent exactly this sits beside it, guarded.
Also unlimited, and deliberate enough to leave: `:29 /refresh` (requires a valid refresh cookie;
          mints nothing without one) and `:30 /logout` (clears cookies, no secret checked).
Fix:      Add `makeAuthLimiter()` to `:32`. One line, but it is a fix sprint, not this one.

### SEC-11 · `dental-4-12-main/project/index.html` · LOW · OPEN
Claim:    The SPA's HTML is served as a Vercel static asset and carries no Content-Security-Policy;
          helmet only covers responses Express generates.
Evidence: `app.ts` comment — "This server only ever returns JSON (the React app is served
          separately)". `vercel.json` rewrites `/((?!api/).*)` to `/index.html`, which never passes
          through Express.
Impact:   The document that runs all the JavaScript has no CSP, no `X-Frame-Options`, no
          `Referrer-Policy`. Helmet protects the surface that needs it least.
Fix:      Add a `headers` block to `vercel.json` for the static routes. ⚠ A CSP must be checked
          against the dynamic-import chunks (exceljs / jspdf / html2canvas / tesseract / pdfjs) and
          the service worker before it is turned on.

### ARCH-02 · `server/middleware/auth.ts:21` · LOW · OPEN
Claim:    A comment states the opposite of what the code now does: "school_ids is carried but NOT yet
          enforced on any query — Sprint 101."
Evidence: `auth.ts:21`, against `schoolScope.ts` (Sprint 101 shipped the enforcement) and its 11 call
          sites in `routes/index.ts`.
Impact:   Documentation-as-code failure at the exact spot a reader checks to learn whether scoping is
          enforced. It reads as authoritative and is wrong.
Fix:      One-line comment change. Bundle into the first fix sprint that touches this file.

### ARCH-03 · `docs/ARCHITECTURE.md` · — · FIXED (Sprint 151)
Claim:    The architecture map was stale on six counts, having been derived 2026-08-08.
Evidence: Documented `PATCH /:id` for update where the factory registers `PUT /:id`; listed four
          `CrudOptions` where twelve exist; described school scoping nowhere; listed one `/stats`
          route where twelve exist; omitted `/day-notes` and `/referrals`; said "the 16 ERD models"
          where `models/index.ts` exports 19; described the `findByIdAndUpdate` failure as "the write
          lands as plaintext" where the real mode is corruption plus a crash on next decrypt.
Impact:   Every later audit sprint would have been measured against a map that no longer described
          the system.
Fix:      Re-derived this sprint. `docs/ARCHITECTURE.md` now carries a §2.5 on school scoping, the
          full options table, the complete `/stats` surface, and a dated verification line.

---

## Sprint 152 — auth & session

**Read:** `authController.ts` · `jwt.ts` · `password.ts` · `authRoutes.ts` · `secretGuard.ts` ·
`mailer.ts` · `authCache.ts` · `Login.tsx` · `User.ts` (41 lines, outside the declared list — read
deliberately, because `/auth/me` and `login` both return a whole User document and the claim
"nothing sensitive leaks" could not be made honestly without it).

**Rows this sprint changed:** SEC-04 claim corrected · SEC-07 closed · SEC-08 upgraded from
inference to confirmed · SEC-10 severity raised and re-aimed.

### What is correct here, recorded so no later sprint re-derives it
- JWT algorithm **pinned to HS256** on both sign and verify (`jwt.ts`), the standard algorithm-
  confusion mitigation. Separate secrets for access and refresh.
- **bcrypt, 12 rounds** (`password.ts`).
- OTP from `randomInt` and reset token from `randomBytes(32)` — both CSPRNG. **Only SHA-256 hashes
  are stored**, never the code or token. `password_hash`, `otp_hash`, `reset_token_hash` are all
  `select: false` on the schema, so the full-document responses from `/auth/me` and `login` cannot
  carry them.
- OTP is **single-use** — cleared before the session is issued, not after.
- `forgotPassword` always answers the same generic 200, so it cannot be used to probe which emails
  have accounts. Resend cooldowns on both OTP and reset (60 s) stop mail flooding.
- `refresh` **re-reads the user from the database** instead of trusting the token's embedded role and
  `school_ids`, so a role change, a school reassignment or an archive propagates within 15 minutes
  rather than persisting for the refresh token's 7 days.
- Login answers a generic "Invalid credentials" for both an unknown email and a wrong password.
- `Login.tsx` keeps the password in component state only and hands autofill to the browser
  (`autoComplete="username"` / current-password), with a comment explaining that storing a password
  anywhere itself would be "a waiting to happen".

### SEC-12 · `server/controllers/authController.ts` logout / changePassword / resetPassword · MED · OPEN
Claim:    **There is no way to revoke a session.** Logout clears cookies only; changing or resetting
          a password does not invalidate tokens already issued.
Evidence: `authController.logout` is three lines — `clearCookie("access_token")`,
          `clearCookie("refresh_token")`, `res.json({ ok: true })`. No denylist, and `User.ts` has no
          `token_version` / `sessions_valid_from` field for `refresh` to check against.
          `changePassword` and `resetPassword` both write `user.password_hash` and save; neither
          touches any token state.
Impact:   A refresh token copied before logout stays valid for its **full 7 days**. And the ordinary
          remedy for a suspected compromise — change the password — **does not evict the attacker**.
          Concretely: HANDOFF records that all five demo passwords were rotated and applied to the
          live database in Sprint 75. Any session live at that moment survived the rotation.
          Mitigated in practice by the default: without "Remember me" both cookies are session
          cookies, so closing the browser on a shared clinic PC does end that session.
Fix:      needs scoping — the small version is a `sessions_valid_from` timestamp on User, set by
          logout / change / reset, checked in `refresh` against the token's `iat`. ⚠ That bounds
          exposure to the 15-minute access-token life, not to zero; a true kill switch needs the
          access token checked too, which costs a DB read per request.

### SEC-13 · `server/controllers/authController.ts` forgotPassword · MED · OPEN
Claim:    **The password-reset link's host is taken from a request header.** Whether that is
          exploitable currently depends on a control added for a different purpose.
Evidence: `forgotPassword` — `const origin = typeof req.headers.origin === "string" &&
          req.headers.origin ? req.headers.origin : process.env.APP_URL ?? "https://dental-app-
          build.vercel.app";` then `resetEmailHtml(`${origin}/reset-password?token=${token}`)`.
Impact:   **Not exploitable as configured, and that is the finding.** A forged `Origin: https://
          evil.com` is rejected at 403 by the CORS allowlist in `app.ts` before the controller runs,
          so the classic reset-poisoning takeover does not land today. That makes **CORS load-bearing
          for reset-link integrity**, which is not what it was added for and is not written down
          anywhere. `app.ts` records that this CORS block used to be `origin: true`; restoring
          anything like it — or adding a wildcard entry to `ALLOWED_ORIGINS` — converts this into
          full account takeover, and nothing in the reset code would change to signal it.
          Lesser, live today: an allowlisted-but-useless origin (`http://localhost:5173`) can be sent
          by a non-browser client, mailing a real user a reset link that goes nowhere.
Fix:      Build the link from `process.env.APP_URL` unconditionally and drop the header entirely.
          The header buys nothing — production is same-origin.

### SEC-14 · `server/controllers/authController.ts` login · MED · OPEN
Claim:    Login leaks which email addresses have accounts, by timing.
Evidence: `login` returns 401 immediately when `User.findOne` misses. Only a **found** user reaches
          `comparePassword`, which is bcrypt at 12 rounds (`password.ts`) — tens to hundreds of
          milliseconds. The response bodies are correctly identical; the response times are not.
Impact:   An unauthenticated caller can enumerate staff accounts. Small population (~10 users) and
          the addresses are institutional and guessable, so this is reconnaissance, not a breach —
          but it undoes the generic-message work already done deliberately in the same function.
          `verifyOtp` has the same shape, far less pronounced (SHA-256 is cheap next to bcrypt).
Fix:      Compare against a dummy hash when the user is not found, so both paths pay the same cost.

### SEC-15 · `server/routes/authRoutes.ts` + `server/models/User.ts` · MED · OPEN
Claim:    **Rate limiting is per-IP only and there is no per-account lockout**, which cuts both ways.
Evidence: `makeAuthLimiter()` passes no `keyGenerator`, so `express-rate-limit` keys on IP: 10
          attempts / 15 min. `User.ts` has no failed-attempt counter or lock field.
Impact:   (a) **Availability** — a clinic's staff share one NAT address, so ten bad logins from one
          site lock out *everyone* there for 15 minutes. The `authRoutes` comment anticipated this
          for the cross-route case and split the limiters; the within-route case remains.
          (b) **Security** — an attacker spread across IPs faces no per-account ceiling at all.
          (c) **OTP** — `verifyOtp` neither counts attempts nor clears the code on a wrong guess, so
          a 6-digit code stays guessable for its whole 10-minute life, bounded only by per-IP limits.
Fix:      needs scoping — a per-account attempt counter is the piece that is missing; keying the
          limiter on email as well as IP is the cheaper half.

### SEC-16 · `server/utils/mailer.ts` otpEmailHtml · LOW · OPEN
Claim:    The 2FA code is in the email **subject line**.
Evidence: ``subject: `${code} is your FLORAL login code` ``.
Impact:   Lock-screen notification previews show subjects, so the second factor is readable on a
          locked phone — which is much of what the second factor was for. Common industry practice,
          so this is a tradeoff to make deliberately rather than a defect.
Fix:      Move the code into the body only. One line; needs a decision, not scoping.

### SEC-17 · `server/controllers/authController.ts` refresh · LOW · OPEN
Claim:    The refresh token is never rotated and reuse is not detected.
Evidence: `refresh` re-issues only `access_token`; the original `refresh_token` stands for its full
          7 days.
Impact:   Compounds SEC-12 — a captured refresh token is usable for a week and its use is
          indistinguishable from the real user's. Fix SEC-12 first; this is the follow-on.

### ARCH-04 · `server/utils/secretGuard.ts` · LOW · OPEN (already backlog #49)
Claim:    Startup secret checking **warns and never throws**, including when `JWT_ACCESS_SECRET` is
          missing or still an `.env.example` placeholder.
Evidence: `checkStartupSecrets` — `console.warn` on every branch, returns the offending names.
Impact:   Deliberate, and the docblock gives the reason: it runs on Vercel's serverless boot, where a
          hard exit would take the live site down rather than degrade. Recorded so a later sprint
          does not "discover" it as an oversight.
Fix:      Tighten to a refusal once the deployed values are confirmed real — already tracked as
          backlog #49.

---

## Sprint 153 — RBAC & multi-school tenancy

**Read:** `userController.ts` · the CRUD mount block (`routes/index.ts:53-71`, `:873-1006`) ·
`crudFactory.ts`, `schoolScope.ts`, `roleGroups.ts` (already in context from 151) · two narrow greps
into `AccountManagement.tsx` to establish what the UI actually sends on create.

⚠ **The live spot-check the program calls for was NOT run — see the note at the end of this
section.** Everything below is read off the code.

### The matrix — what the server actually permits

Derived from the mount options plus `crudFactory`'s defaults (`readRoles` = `ALL_ROLES`,
`writeRoles`/`archiveRoles`/`restoreRoles` = `ADMIN_ONLY`). `clinical` = system_admin + dentist +
dental_aide. **Bold = departs from the default.**

| Model | read | create / update | archive | restore | scoped via | redacted |
|---|---|---|---|---|---|---|
| School | all 5 | admin | admin | admin | none | — |
| User | **admin** | admin | admin | admin | none | — |
| Dentist | all 5 | admin | admin | admin | school_id | — |
| DentalAide | all 5 | admin | admin | admin | school_id | — |
| Student | all 5 | clinical | admin | admin | school_id | **school_admin: 12 fields** |
| StudentIptr | all 5 | clinical | **admin + dentist** | admin | student_id | — |
| MedicalHistory | all 5 | clinical | admin | admin | iptr_id | — |
| DietarySocialHabits | all 5 | clinical | admin | admin | iptr_id | — |
| OralHealthCondition | all 5 | clinical | admin | admin | iptr_id | — |
| DentalChart | all 5 | clinical | admin | admin | iptr_id | — |
| ToothRecord | all 5 | clinical | admin | admin | chart_id | — |
| Treatment | all 5 | clinical | admin | admin | iptr_id | — |
| PreventiveCareRecord | all 5 | clinical | admin | admin | iptr_id | — |
| RiskStratification | all 5 | clinical | admin | admin | preventive_id | — |
| Appointment | all 5 | clinical | admin | admin | student_id | — |
| DentistRotation | all 5 | clinical | admin | admin | school_id | — |
| DayNote | all 5 | clinical | **clinical** | admin | school_id_or_global | — |
| Referral | all 5 | clinical | admin | admin | iptr_id | — |
| AuditTrail | **admin** | **read-only** | — | — | none | — |

**What this shows is consistent and deliberate:** archive and restore are admin-only almost
everywhere, the two deviations each carry a written reason, `AuditTrail` is admin-read and
unwritable through the API, and writes are properly split clinical-vs-admin. The problem is not the
write column. **It is that the read column is `all 5` on thirteen clinical models.**

### SEC-18 · `server/controllers/userController.ts:11,33` · HIGH · OPEN
Claim:    **`createUser` writes a field the User schema does not have, so every account created
          through the API gets `school_ids: []` — which means ALL SCHOOLS.** The admin's school
          selection is silently discarded.
Evidence: `userController.ts:11` destructures `school_id` (singular); `:33` writes
          `school_id: school_id || null`. **`User.ts` has no `school_id` path** — it has
          `school_ids: { type: [ObjectId], default: [] }` (Sprint 100 renamed it). Mongoose strict
          mode drops the unknown key, so the write is a no-op and `school_ids` takes its default.
          `school_ids` is **never read by the controller at all.**
          The UI does send the right thing: `AccountManagement.tsx:98` holds
          `school_ids: [] as string[]`, `:385` binds the school picker to it, `:204` posts the whole
          `form` to `/users`. The server ignores it.
          Confirmed there is no compensating mapping: `grep "school_id\b"` excluding `school_ids`
          returns only these two lines plus Student's own legitimate `school_id`; no `pre('save')`
          hook exists on `User.ts` or `models/shared/`.
Impact:   **A School Administrator created and assigned to one school is created with access to all
          three.** This is not an edge case — it is the outcome of every account creation. It is also
          the concrete answer to SEC-04's open question: an empty `school_ids` is not merely
          reachable, it is the default state of every new user.
          Masked in practice because editing a user afterwards goes through `crudFactory`'s PUT,
          where `school_ids` **is** a schema field and does save. So an admin who creates and then
          edits ends up correct, and one who only creates does not.
Fix:      Read `school_ids` in `createUser` and pass it to `User.create()`. Small, but it is a fix
          sprint. ⚠ **A fix must also audit existing accounts** — every user created since Sprint 100
          may be carrying `[]` unintentionally, and the ones to check first are the `school_admin`
          and any scoped role.

### SEC-19 · `server/routes/index.ts:876` · HIGH · OPEN
Claim:    **Thirteen clinical models are readable, unredacted, by `school_admin` and `bho_staff`** —
          the two roles CLAUDE.md defines as non-clinical.
Evidence: Every clinical mount omits `readRoles`, so it takes `crudFactory`'s `ALL_ROLES` default:
          `medical-histories`, `dietary-social-habits`, `oral-health-conditions`, `dental-charts`,
          `tooth-records`, `treatments`, `preventive-care-records`, `risk-stratifications`,
          `appointments`, `referrals`, `day-notes`, `student-iptrs`, `dentist-rotations`.
          Only `Student` carries a `redact` block; none of the thirteen does.
          The grant is deliberate and explained at `:876`: "Clinical models — all 5 roles can read
          (school_admin/bho_staff need this for dashboards/reports per CLAUDE.md's own role
          descriptions)".
Impact:   `GET /api/medical-histories?iptr_id=X` returns allergies and the hypertension / diabetes /
          hepatitis / blood-disorder flags. `GET /api/treatments?iptr_id=X` returns `diagnosis` and
          `treatment_done`. **Both models hold AES-256 encrypted fields — encrypted precisely because
          they are sensitive — and the API decrypts them on the way out for a role CLAUDE.md says
          gets "no clinical records".**
          The justification cites CLAUDE.md while contradicting its own clause for that role.
⚠ **Before fixing, establish whether the grant is still load-bearing.** It was written when
          dashboards read raw collections. Sprint 151 found twelve `/stats/*` aggregate routes that
          now serve exactly those screens. If the school_admin and bho_staff dashboards are on
          `/stats`, this grant is dead weight and can simply be narrowed; if any screen still reads a
          raw clinical collection, narrowing it breaks that screen. **That check is the first task of
          the fix sprint** — grep the hooks those two roles' screens use. Do not narrow blind.

### SEC-20 · `server/routes/index.ts:921-926` · MED · OPEN
Claim:    The student redaction names `school_admin` only, so **`bho_staff` reads full pupil identity
          across every school.**
Evidence: `redact: { roles: ["school_admin"], fields: [...12 identity fields...] }`. `bho_staff` is
          absent from that list, and is one of the roles `User.ts:14` leaves unscoped (empty
          `school_ids` = all schools), so the reach is all three sites.
Impact:   Names, addresses, contact numbers, guardian names and contacts, PhilHealth and 4Ps ids for
          all ~8,000 pupils. CLAUDE.md gives Barangay Health Office Staff "consolidated reports
          across all schools, City Health Office report submission" — consolidated figures, which
          need no identified rows.
Fix:      Add `bho_staff` to the `redact.roles` list, subject to the same "is it load-bearing?" check
          as SEC-19. One word, once that check passes.

### SEC-21 · `server/controllers/userController.ts` createUser · LOW · OPEN
Claim:    Creating a user with an email that already exists answers **500**, not a clean 409.
Evidence: `createUser` performs no uniqueness check; `User.ts` has `email: { unique: true }`, so the
          collision surfaces as a Mongo duplicate-key error. `app.ts`'s handler special-cases only
          `ValidationError` and `CastError`, so this falls through to the generic 500.
Impact:   Cosmetic but misleading — the admin is told the server broke when in fact the input was
          rejected. Compare `crudFactory`'s `uniqueBy`, which answers a proper 409.
Fix:      Check first, or map duplicate-key (code 11000) to 409 in the error handler.

### SEC-13 — second instance found
`userController.sendResetLink` builds its reset link from `req.headers.origin` with exactly the same
fallback as `authController.forgotPassword`. **Both call sites must change together**; fixing one
would leave the admin-initiated path exposed to the same coupling.

### SEC-04 — open question ANSWERED
"Can a `school_admin` actually reach an empty `school_ids`?" **Yes — every newly created one has it,
by default.** See SEC-18. SEC-04 stays open as the design issue (two meanings, one value); SEC-18 is
the concrete instance and is the one to fix first.

### ⚠ The live spot-check was not run, and why
The program's verification step for this sprint is to log in as `school_admin` and confirm SEC-03 and
SEC-19 against a running server. **This machine's `.env` points at the PRODUCTION database and there
is no dev database on it (SEC-00).** Probing live patient records with a low-privilege account to
prove an access-control finding is not something to do casually, and SEC-00 is unresolved.

**So both HIGH read-access findings (SEC-03, SEC-19) remain read-off-the-code, not demonstrated.**
They should be confirmed on the laptop's dev database, or after a dev `.env` reaches this PC, before
any fix sprint acts on them. SEC-18 needs no live check — the schema mismatch is decisive on its own.
