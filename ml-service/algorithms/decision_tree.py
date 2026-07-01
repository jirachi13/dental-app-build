from sklearn.tree import DecisionTreeClassifier

from .base import RiskClassifier


class DecisionTreeRiskClassifier(RiskClassifier):
    display_name = "Decision Tree"

    def __init__(self):
        self.model = DecisionTreeClassifier(random_state=42, max_depth=6)

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return list(self.model.predict(X))

    def predict_proba(self, X):
        probs = self.model.predict_proba(X)
        return [dict(zip(self.model.classes_, row)) for row in probs]
