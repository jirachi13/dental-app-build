from sklearn.ensemble import RandomForestClassifier

from .base import RiskClassifier


class RandomForestRiskClassifier(RiskClassifier):
    display_name = "Random Forest"

    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=200, random_state=42)

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return list(self.model.predict(X))

    def predict_proba(self, X):
        probs = self.model.predict_proba(X)
        return [dict(zip(self.model.classes_, row)) for row in probs]
