from sklearn.linear_model import LogisticRegression

from .base import RiskClassifier


class LogisticRegressionClassifier(RiskClassifier):
    display_name = "Logistic Regression"

    def __init__(self):
        self.model = LogisticRegression(max_iter=1000, random_state=42)

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return list(self.model.predict(X))

    def predict_proba(self, X):
        probs = self.model.predict_proba(X)
        return [dict(zip(self.model.classes_, row)) for row in probs]
