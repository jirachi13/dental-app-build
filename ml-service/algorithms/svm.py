from sklearn.svm import SVC

from .base import RiskClassifier


class SVMRiskClassifier(RiskClassifier):
    display_name = "SVM"

    def __init__(self):
        # probability=True is required for predict_proba; it slows down
        # training via internal cross-validation, acceptable at this dataset scale.
        self.model = SVC(kernel="rbf", probability=True, random_state=42)

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return list(self.model.predict(X))

    def predict_proba(self, X):
        probs = self.model.predict_proba(X)
        return [dict(zip(self.model.classes_, row)) for row in probs]
