# HANDOFF — Sprint 1 Complete

## Status
Sprint 1 (Express MVC + MongoDB connection) done and verified working against the real MongoDB Atlas cluster.

## What exists now
- `dental-4-12-main/project/server/` — Express MVC backend
  - `app.ts` — app config: CORS, JSON parsing, DB-connect middleware, mounts routes at `/api`, error handler (no stack traces exposed)
  - `config/db.ts` — Mongoose connection, cached across invocations for serverless reuse
  - `routes/index.ts`, `controllers/healthController.ts` — `/api/health` endpoint only
  - `local.ts` — local dev entry point (`npm run dev:server`, listens on port 4000)
- `dental-4-12-main/project/api/index.ts` — Vercel serverless entry, re-exports the same Express app
- `dental-4-12-main/project/vercel.json` — rewrites `/api/*` → the single function so Express handles sub-routing
- `dental-4-12-main/project/tsconfig.server.json` — separate Node-targeted tsconfig (frontend tsconfig.json is bundler/DOM-targeted, kept untouched)
- `dental-4-12-main/project/.env` — local `MONGODB_URI` (gitignored, not committed)
- Vercel project linked to this repo, root directory set to `dental-4-12-main/project`, `MONGODB_URI` set as a Sensitive env var for Production + Preview (Development intentionally left unset — Vercel disallows Sensitive + Development together; local dev uses the `.env` file instead)

## Repo hygiene done this session
- Added root `.gitignore` (node_modules, .env, .env.local, dist, build)
- Untracked `node_modules/` and `dist/` that were previously committed (72k+ files removed from git history going forward)
- Added `CLAUDE.md` at repo root with the full FLORAL build spec
- Deleted stale auto-generated prototype status docs (button-fix summaries, validation reports) that no longer reflect reality
- Moved `Group404 - Manuscript.md` to `docs/` — contains Chapter 1 (~line 95) and Chapter 3 (~line 315), referenced from `CLAUDE.md`'s Chapter References section instead of nonexistent chapter1.pdf/chapter3.pdf

## Verified
- `npm run dev:server` starts the Express app locally
- `GET /api/health` → `{"status":"ok","db":"connected"}` against the real `floral-cluster` Atlas cluster

## Not done yet (deliberately out of scope for Sprint 1)
- No Mongoose models yet (SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE — that's Sprint 2)
- No CRUD routes beyond health check
- No JWT auth (Sprint 7)
- No data encryption (Sprint 8)
- Not yet deployed to Vercel (Sprint 17) — only linked/configured

## Next sprint
Sprint 2 → SCHOOL, USER, STUDENT, DENTIST, DENTAL_AIDE Mongoose models, per the exact ERD in `CLAUDE.md` / Chapter 3 of the manuscript. Requires `/grill-me`-style clarifying round first per CLAUDE.md (Sprint 2 is flagged complex). Do not start without explicit approval.
