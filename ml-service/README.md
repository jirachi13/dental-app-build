# FLORAL ML Service

FastAPI service serving the caries risk-classification model (High/Medium/Low). **Express is the only intended caller** (`server/routes/predictionRoutes.ts` proxies `POST /api/predictions/*` with the `X-API-Key` header) — the browser never calls this directly, and predictions only ever reach a student's record after dentist validation in the app.

> ⚠️ The committed `active/model.pkl` is trained on **synthetic placeholder data** (the app's UI says so). Retrain on real IPTR records before defense.

## Layout (Strategy Pattern, per CLAUDE.md)

| File | Role |
|---|---|
| `predictor.py` | **Sole entry point** — Express/FastAPI never touch algorithm files directly |
| `config.py` | `ACTIVE_ALGORITHM` switch (currently `logistic_regression`) |
| `algorithms/` | one module per algorithm (LR, DT, RF, SVM, XGBoost) behind a shared base |
| `main.py` | FastAPI app: `GET /health`, `POST /predict` (pydantic-validated 13 features) |
| `train.py` | (re)trains the active algorithm → `active/model.pkl` + honest metadata (incl. `synthetic_data` flag that drives the UI banner) |
| `evaluate.py` | quick health check of the persisted model against a labeled CSV |
| `experiments/run_experiments.py` | full 5-algorithms × 2-methods comparison → `docs/algo-results.md` |
| `pipeline/clean_excel.py`, `pipeline/build_features.py` | Sprint 21a/21b: raw Excel → cleaned CSV → 13-feature ML dataset (drops all name columns) |
| `data/generate_synthetic_excel.py` | generates the deliberately-messy synthetic Excel files used for the dry-run |

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --port 8000
```

`ML_SERVICE_API_KEY` unset = open (local dev). Set it to require the `X-API-Key` header (production always sets it; Express holds the same secret via `ML_SERVICE_URL`/`ML_SERVICE_API_KEY`).

## Retrain when real data lands

```bash
python pipeline/clean_excel.py data/raw        # originals never modified; drops name columns
python pipeline/build_features.py              # -> data/processed/ml_dataset.csv
python experiments/run_experiments.py          # -> docs/algo-results.md + charts
python train.py                                # -> active/model.pkl (+ metadata)
python evaluate.py                             # sanity-check the persisted model
```

Commit the new `active/model.pkl` and push — Render auto-deploys, and the app's synthetic-data banner clears itself from the model metadata.

## Deployment

Render web service (configured via dashboard, not YAML): root dir `ml-service`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Free tier sleeps after ~15 min idle — the first request after that can take 30-60s (the app shows a retryable "service unavailable" for that window).
