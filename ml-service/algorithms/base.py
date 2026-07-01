"""Common interface every algorithm module implements — this is what makes
swapping the active algorithm (config.py) a one-line change instead of a
predictor.py rewrite."""

from abc import ABC, abstractmethod

import pandas as pd


class RiskClassifier(ABC):
    """Wraps a single scikit-learn/xgboost estimator behind a shared interface."""

    display_name: str

    @abstractmethod
    def train(self, X: pd.DataFrame, y: pd.Series) -> None:
        """Fit the underlying model on feature matrix X and labels y."""

    @abstractmethod
    def predict(self, X: pd.DataFrame) -> list[str]:
        """Return predicted risk labels (High/Medium/Low) for each row in X."""

    @abstractmethod
    def predict_proba(self, X: pd.DataFrame) -> list[dict[str, float]]:
        """Return per-class probabilities for each row in X, e.g.
        [{"High": 0.7, "Medium": 0.2, "Low": 0.1}, ...]."""
