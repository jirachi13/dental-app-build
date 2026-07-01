"""Sole entry point for risk prediction. Per CLAUDE.md: "Express calls
predictor.py only" / "Never call individual algo files directly" — nothing
outside this file should import from algorithms/ directly.

IMPORTANT: this is currently trained on ml-service/data/dummy_train.csv, a
small synthetic placeholder dataset — NOT real patient data. This proves the
swappable-algorithm architecture works end-to-end; real training happens once
real dental IPTR data is cleaned (Sprint 21a-21d). Do not treat predictions
from this module as clinically meaningful yet.
"""

import pandas as pd

import config
from algorithms.base import RiskClassifier
from algorithms.decision_tree import DecisionTreeRiskClassifier
from algorithms.logistic_regression import LogisticRegressionClassifier
from algorithms.random_forest import RandomForestRiskClassifier
from algorithms.svm import SVMRiskClassifier
from algorithms.xgboost_model import XGBoostRiskClassifier

FEATURE_COLUMNS = [
    "dmf_score",
    "decayed_count",
    "missing_count",
    "filled_count",
    "gingivitis",
    "periodontal_disease",
    "debris",
    "calculus",
    "abnormal_growth",
    "sugar_beverages",
    "tobacco_user",
    "age",
    "sex",
]
LABEL_COLUMN = "risk_level"

_REGISTRY: dict[str, type[RiskClassifier]] = {
    "logistic_regression": LogisticRegressionClassifier,
    "decision_tree": DecisionTreeRiskClassifier,
    "random_forest": RandomForestRiskClassifier,
    "svm": SVMRiskClassifier,
    "xgboost": XGBoostRiskClassifier,
}


def get_active_classifier() -> RiskClassifier:
    algo_key = config.ACTIVE_ALGORITHM
    if algo_key not in _REGISTRY:
        raise ValueError(
            f"Unknown ACTIVE_ALGORITHM '{algo_key}' in config.py — must be one of {list(_REGISTRY)}"
        )
    return _REGISTRY[algo_key]()


_classifier: RiskClassifier | None = None


def train(dataset_path: str = "data/dummy_train.csv") -> RiskClassifier:
    """Trains the currently active algorithm (per config.py) and caches it."""
    global _classifier
    df = pd.read_csv(dataset_path)
    X = df[FEATURE_COLUMNS]
    y = df[LABEL_COLUMN]
    classifier = get_active_classifier()
    classifier.train(X, y)
    _classifier = classifier
    return classifier


def predict_risk(features: dict) -> dict:
    """features: dict with keys matching FEATURE_COLUMNS.
    Returns {"risk_level": str, "probabilities": dict, "algorithm": str}.
    Dentist MUST validate before any clinical action — this never replaces
    clinical judgment (see CLAUDE.md's ABSOLUTE DO NOT list)."""
    if _classifier is None:
        train()
    X = pd.DataFrame([features])[FEATURE_COLUMNS]
    risk_level = _classifier.predict(X)[0]
    probabilities = _classifier.predict_proba(X)[0]
    return {
        "risk_level": risk_level,
        "probabilities": probabilities,
        "algorithm": _classifier.display_name,
    }


if __name__ == "__main__":
    clf = train()
    sample = {
        "dmf_score": 5.0,
        "decayed_count": 3,
        "missing_count": 1,
        "filled_count": 1,
        "gingivitis": 1,
        "periodontal_disease": 0,
        "debris": 1,
        "calculus": 0,
        "abnormal_growth": 0,
        "sugar_beverages": 1,
        "tobacco_user": 0,
        "age": 10,
        "sex": 0,
    }
    result = predict_risk(sample)
    print(f"Active algorithm: {clf.display_name}")
    print(f"Prediction: {result}")
