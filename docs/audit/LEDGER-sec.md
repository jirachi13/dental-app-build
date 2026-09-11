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
| 152 | Auth & session | not started |
| 153 | RBAC & multi-school tenancy | not started |
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

### SEC-04 · `server/utils/schoolScope.ts:137-140` · HIGH · OPEN
Claim:    **School scoping fails OPEN on a user with an empty `school_ids`.** `userSchools()` returns
          `null` for an empty array; `scopeFilter()` treats `null` as "no restriction applies" and
          returns `null`; the caller then queries unfiltered.
Evidence: `schoolScope.ts:137` `return ids.length === 0 ? null : ids;` → `:155` `if (!schools) return
          null;` → `crudFactory.ts` `const docs = await model.find(scope ? { $and: [...] } : filter)`.
Impact:   A `school_admin` or any scoped user whose `school_ids` is empty — newly created, mid-
          migration, or cleared by an edit — silently receives **every school's records** instead of
          none. The blast radius is all ~8,000 pupils.
          The same file fails CLOSED, deliberately, for an unknown model (`:161`, `if (!rule) return
          { _id: { $in: [] } }`, "must not silently become world-readable"). The two halves of the
          file disagree about which way to fail.
Fix:      needs scoping — the unscoped roles (`system_admin`, `bho_staff`, clinical staff) must be
          named explicitly rather than inferred from an empty array, so "unscoped by role" and
          "unassigned by accident" stop being the same state. Sprint 153 owns the decision.

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

### SEC-07 · `server/app.ts` CORS + cookie auth · MED · OPEN
Claim:    The API authenticates from a cookie and carries no CSRF token; the CORS callback also
          allows any request that sends no `Origin` header.
Evidence: `middleware/auth.ts:14` reads `req.cookies?.access_token`. `src/app/api/client.ts` sends
          `credentials: "include"` and no CSRF header anywhere. `app.ts` CORS: "No Origin header
          (same-origin requests, curl, server-to-server) — allow."
Impact:   Whether this is exploitable rests entirely on the cookie's `SameSite` attribute, which is
          set where the cookie is issued, not here. If it is `Lax` or `Strict` the browser path is
          closed and this is LOW; if it is `None`, state-changing requests are forgeable.
Fix:      Sprint 152 reads the cookie flags in `authController.ts` and re-severities this row.

### SEC-08 · `src/app/api/client.ts:96-104` + `src/sw.ts` · MED · OPEN
Claim:    Decrypted patient records persist in the browser's Cache Storage after logout.
Evidence: `client.ts` `captureBaselineSnapshot` opens `caches.open('api-cache')` and reads whole
          `/api/*` responses, described in its own comment as populated by "the service worker's
          NetworkFirst `/api/*` caching". Nothing in the logout path is shown clearing it.
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

### SEC-10 · `server/routes/authRoutes.ts:29-32` · LOW · OPEN
Claim:    `/auth/refresh`, `/auth/logout` and `/auth/change-password` carry no rate limiter while
          every other sensitive auth route does.
Evidence: `authRoutes.ts` — `makeAuthLimiter()` present at `:21` login, `:26` verify-otp, `:27`
          forgot-password, `:28` reset-password, `:35` verify-password; absent at `:29` refresh,
          `:30` logout, `:32` change-password.
Impact:   `/auth/refresh` is the one that matters — an unlimited endpoint that mints access tokens
          from a refresh cookie. Low while the cookie is required, but it is the odd one out.
Fix:      Sprint 152 decides whether the omission is deliberate.

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
