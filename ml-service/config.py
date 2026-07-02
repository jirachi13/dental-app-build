"""Single place that decides which algorithm is active. Swapping models is a
one-line change here — nothing else in the app needs to know or care which
algorithm is running (see predictor.py, which reads only this file).

Per CLAUDE.md: "Active algo in config.py only." Do not hardcode an algorithm
choice anywhere else.
"""

# One of: "logistic_regression", "decision_tree", "random_forest", "svm", "xgboost"
# Sprint 21d: Logistic Regression won on K-Fold F1 (0.7444) — see
# docs/model-selection-rationale.md. NOTE: selected on SYNTHETIC data;
# re-run experiments and revisit once real IPTR data is available.
ACTIVE_ALGORITHM = "logistic_regression"
