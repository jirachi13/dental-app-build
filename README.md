# FLORAL — Dental Health Record Management System with Predictive Analytics

Capstone thesis build (Group 404, AY 2025-2026). A web application for managing school dental health records across three public schools in Barangay Tanyag, Taguig City, with ML-assisted caries risk classification that **assists the dentist and never replaces clinical judgment** — every prediction requires dentist validation before any clinical action.

**Live app**: https://dental-app-build.vercel.app · **ML service**: https://floral-ml-service.onrender.com (free tier — sleeps after ~15 min idle; first request after that can take 30-60s)

## Architecture

| Piece | Tech | Where |
|---|---|---|
| Frontend | React + Vite, Tailwind, PWA (offline queue + update prompt) | `dental-4-12-main/project/src/` |
| Backend | Node.js + Express (MVC), JWT auth in httpOnly cookies, RBAC (5 roles), field-level encryption, audit trail | `dental-4-12-main/project/server/` |
| Database | MongoDB Atlas (16 models per the Chapter 3 ERD; soft delete everywhere — never hard delete) | — |
| ML service | Python FastAPI + scikit-learn (Strategy Pattern, `predictor.py` sole entry point) | `ml-service/` |
| OCR | Tesseract.js, client-side, scans paper DOH IPTR forms into the Add Student form | `src/app/utils/iptrOcr.ts` |

Deployment: frontend + backend on **Vercel** (Express runs as a serverless function via `api/index.ts`), ML service on **Render**. Express is the only caller of the ML service (`POST /api/predictions/*` proxies with an API key).

## Prerequisites

- Node.js 20+ (dev machine uses 24), npm
- Python 3.11+ with `pip install -r ml-service/requirements.txt` (only for the ML service / experiments)
- A MongoDB Atlas cluster (or connection string to the shared one)

## Environment variables

All backend env lives in `dental-4-12-main/project/.env` (**gitignored — never commit it**):

| Var | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | token signing (15 min access / 7 day refresh) |
| `FIELD_ENCRYPTION_SECRET` | AES key for encrypted patient fields — **must match the key existing records were encrypted with**, a wrong value only surfaces as decrypt errors on read |
| `ALLOWED_ORIGINS` | CORS allowlist for production origins (login 403s without it) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DENTIST_PASSWORD`, `SEED_AIDE_PASSWORD`, `SEED_SCHOOLADMIN_PASSWORD`, `SEED_BHO_PASSWORD` | used by seed scripts and verification scripts; account passwords live only here and in the DB (bcrypt) |
| `ML_SERVICE_URL`, `ML_SERVICE_API_KEY` | Express → FastAPI proxy (also set on Vercel/Render for production) |

## Run locally

Three processes, all from `dental-4-12-main/project/` (ML service from `ml-service/`):

```bash
# 1. Backend (Express on :4000)
npm run dev:server

# 2. Frontend (Vite on :5173, proxies /api -> :4000)
npm run dev

# 3. ML service (optional — only needed for Risk Classification)
cd ../../ml-service && uvicorn main:app --port 8000
```

Notes:
- `npm run dev:server` runs `tsx watch server/local.ts`. `local.ts` preloads a `dns.setServers()` workaround for a machine-specific Node 24 + Atlas SRV-lookup failure — leave it in place.
- The service worker (offline queue, API caching, update prompt) **never runs under `vite dev`**. To exercise PWA behavior locally: `npm run build && npx vite preview --port 4173` (preview proxies `/api` to :4000 too).

### Seeding

```bash
npm run seed:admin         # system admin account (reads SEED_ADMIN_* from .env)
npm run seed:demo          # schools + one account per role
npm run seed:students      # 18 demo students with IPTR/chart/risk data
npm run seed:rpc-visit2    # backdates RPC visits so all 4 statuses appear
npm run seed:iptr-details  # medical history / dietary / oral health records
```

Gotcha: encrypted fields (`full_name`, `address`, `contact_number`, `allergies`, `others`, `diagnosis`, `treatment_done`, guardian/PhilHealth fields) **cannot be queried by value** — fetch and filter in JS after Mongoose decrypts on read.

## Testing / verification

No unit-test suite; the project standard is **end-to-end verification against real servers** (typecheck + build + Playwright scripts that exercise the live flows):

```bash
npx tsc --noEmit                            # frontend typecheck
npx tsc -p tsconfig.server.json --noEmit    # backend typecheck
npm run build                               # production build (+ SW precache report)
npm audit                                   # must stay at 0 vulnerabilities

# Playwright verification scripts (project root; read SEED_* passwords from .env):
node verify_risk_ui.mjs                # risk classification E2E (needs all 3 local servers)
node verify_decision_support_ui.mjs    # dentist decision support E2E (BASE_URL env to target prod)
node verify_pwa_toast.mjs              # SW update-toast flow + offline queue regression (needs :4000 + vite preview :4173)
node panel_tour.mjs / probe_strict.mjs # read-only production tours/probes (screenshots via SHOTS_DIR env)
```

Verification lessons that keep paying off: wait on real selectors, not fixed sleeps (cold start >5s); full-page screenshots restart recharts animations — count SVG marks in the DOM instead; after changing Vercel env vars, smoke-test an encrypted-model read (`/api/students`), not just login.

## Deployment

**`git push` does NOT auto-deploy.** To ship:

```bash
cd dental-4-12-main/project
npx vercel --prod
```

- Production env vars are managed in the Vercel dashboard (same names as `.env`; `ALLOWED_ORIGINS` must include the production origin or login breaks).
- ML service: Render auto-deploys `ml-service/` on push to main (root dir `ml-service`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`). To retrain: `python ml-service/train.py`, commit the new `ml-service/active/model.pkl`, push.
- After deploys, open browsers show an in-app "new version available → Refresh" toast (no hard refresh needed).

## Data & privacy

- Patient PII is field-encrypted at rest (AES-256-CBC via mongoose-field-encryption); passwords are bcrypt(12); every create/update/archive/restore is written to the audit trail; nothing is ever hard-deleted.
- The ML pipeline **never sees student names** — training rows are identified by `student_id` only.
- The currently deployed model is trained on **synthetic placeholder data** (the UI says so on the Risk Classification page); it must be retrained on real IPTR records before defense. Raw data files under `data/` are gitignored.

## Project docs

- `docs/ARCHITECTURE.md` — folder map, MVC request flow, the crudFactory pattern, full API surface, conventions
- `CLAUDE.md` — build rules, ERD, sprint plan (Phases 1-4), model strategy
- `HANDOFF.md` — full build journal: every sprint's decisions, bugs found, and verification notes
- `docs/Group404 - Manuscript.md` — thesis manuscript (Chapters 1 & 3 drive the spec)
- `docs/algo-results.md`, `docs/model-selection-rationale.md` — ML experiment results (synthetic dry-run; regenerate on real data)
- `docs/persona-review-findings.md` — 5-persona production review, findings + fix history
- `docs/phase3-sprint-prompts.md` — authoritative Phase 3 task breakdowns
