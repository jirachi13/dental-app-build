"""Evaluate the currently persisted model (active/model.pkl) against a
labeled dataset — quick health check that the deployed model still matches
its training data, without re-running the full Sprint 21c experiment suite.

    python ml-service/evaluate.py [dataset_csv]
"""

import sys
from pathlib import Path

import pandas as pd
from sklearn.metrics import classification_report

ML_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_ROOT))

import predictor  # noqa: E402

DEFAULT_DATASET = ML_ROOT.parent / "data" / "processed" / "ml_dataset.csv"


def main() -> None:
    dataset = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DATASET
    clf = predictor.load_model()
    info = predictor.model_info()
    print(f"model: {info.get('display_name', clf.display_name)} "
          f"(trained {info.get('trained_at', 'in-memory')}, "
          f"{info.get('n_records', '?')} records, "
          f"synthetic={info.get('synthetic_data', '?')})\n")

    df = pd.read_csv(dataset)
    X = df[predictor.FEATURE_COLUMNS]
    y = df[predictor.LABEL_COLUMN]
    y_pred = clf.predict(X)
    print(classification_report(y, y_pred, zero_division=0))
    print("NOTE: this evaluates on the model's own training data (an upper "
          "bound, for drift checks) — real performance numbers come from "
          "experiments/run_experiments.py.")


if __name__ == "__main__":
    main()
