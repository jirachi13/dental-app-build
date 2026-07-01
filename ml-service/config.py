"""Single place that decides which algorithm is active. Swapping models is a
one-line change here — nothing else in the app needs to know or care which
algorithm is running (see predictor.py, which reads only this file).

Per CLAUDE.md: "Active algo in config.py only." Do not hardcode an algorithm
choice anywhere else.
"""

# One of: "logistic_regression", "decision_tree", "random_forest", "svm", "xgboost"
ACTIVE_ALGORITHM = "random_forest"
