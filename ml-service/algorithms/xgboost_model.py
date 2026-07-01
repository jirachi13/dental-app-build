from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

from .base import RiskClassifier


class XGBoostRiskClassifier(RiskClassifier):
    display_name = "XGBoost"

    def __init__(self):
        self.model = XGBClassifier(
            n_estimators=200, random_state=42, eval_metric="mlogloss"
        )
        # XGBoost's sklearn wrapper expects numeric class labels, not strings
        # (High/Medium/Low) — encode/decode at this class's boundary so the
        # rest of the app never has to know about that quirk.
        self.label_encoder = LabelEncoder()

    def train(self, X, y):
        y_encoded = self.label_encoder.fit_transform(y)
        self.model.fit(X, y_encoded)

    def predict(self, X):
        encoded = self.model.predict(X)
        return list(self.label_encoder.inverse_transform(encoded))

    def predict_proba(self, X):
        probs = self.model.predict_proba(X)
        labels = self.label_encoder.classes_
        return [dict(zip(labels, row)) for row in probs]
