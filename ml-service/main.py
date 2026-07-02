"""FastAPI serving layer for the Floral risk-classification model.

Express is the ONLY intended caller (server/routes/predictionRoutes.ts) —
this service is never called from the browser directly. Per CLAUDE.md, this
file talks to predictor.py only; it never imports algorithm modules.

Auth: if the ML_SERVICE_API_KEY env var is set, requests must send it in the
X-API-Key header (Express holds the same secret). Unset = open, for local dev.

Run locally:   uvicorn main:app --port 8000        (from ml-service/)
Deploy:        see render.yaml at the repo root.
"""

import os

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

import predictor

app = FastAPI(title="Floral ML Service", version="1.0.0")

API_KEY = os.environ.get("ML_SERVICE_API_KEY", "")


class StudentFeatures(BaseModel):
    """Mirrors predictor.FEATURE_COLUMNS — assembled by Express/the frontend
    from the student's real IPTR records."""
    dmf_score: float = Field(ge=0, le=60)
    decayed_count: int = Field(ge=0, le=32)
    missing_count: int = Field(ge=0, le=32)
    filled_count: int = Field(ge=0, le=32)
    gingivitis: int = Field(ge=0, le=1)
    periodontal_disease: int = Field(ge=0, le=1)
    debris: int = Field(ge=0, le=1)
    calculus: int = Field(ge=0, le=1)
    abnormal_growth: int = Field(ge=0, le=1)
    sugar_beverages: int = Field(ge=0, le=1)
    tobacco_user: int = Field(ge=0, le=1)
    age: int = Field(ge=3, le=30)
    sex: int = Field(ge=0, le=1, description="M=1, F=0")


@app.on_event("startup")
def _load() -> None:
    predictor.load_model()


def _check_key(request: Request) -> None:
    if API_KEY and request.headers.get("x-api-key") != API_KEY:
        raise HTTPException(status_code=401, detail="invalid API key")


@app.get("/health")
def health(request: Request) -> dict:
    return {"status": "ok", "model": predictor.model_info()}


@app.post("/predict")
def predict(features: StudentFeatures, request: Request) -> dict:
    _check_key(request)
    result = predictor.predict_risk(features.model_dump())
    # the serving layer re-states the safety rule on every response
    result["disclaimer"] = ("AI-assisted screening, not a diagnosis. A "
                            "dentist must validate before any clinical action.")
    result["model"] = predictor.model_info()
    return result
