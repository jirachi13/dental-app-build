"""(Re)train the active algorithm and persist it to active/model.pkl.

This is the retraining script from the Sprint 21e spec — run it after any
dataset change (e.g. once real IPTR data replaces the synthetic set):

    python ml-service/pipeline/clean_excel.py data/raw
    python ml-service/pipeline/build_features.py
    python ml-service/train.py

The saved bundle includes the fitted classifier wrapper plus enough metadata
for the serving layer to describe itself honestly (algorithm, when trained,
on how many records, and whether the data was synthetic).

Optional args: [dataset_csv] [out_dir]
"""

import sys
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd

ML_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_ROOT))

import config  # noqa: E402
import predictor  # noqa: E402

DEFAULT_DATASET = ML_ROOT.parent / "data" / "processed" / "ml_dataset.csv"
DEFAULT_OUT_DIR = ML_ROOT / "active"

SYNTHETIC = True  # flip to False when training on real data


def main() -> None:
    dataset = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DATASET
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT_DIR

    df = pd.read_csv(dataset)
    X = df[predictor.FEATURE_COLUMNS]
    y = df[predictor.LABEL_COLUMN]

    clf = predictor.get_active_classifier()
    clf.train(X, y)

    bundle = {
        "algorithm": config.ACTIVE_ALGORITHM,
        "display_name": clf.display_name,
        "classifier": clf,
        "feature_columns": predictor.FEATURE_COLUMNS,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "n_records": len(df),
        "synthetic_data": SYNTHETIC,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "model.pkl"
    joblib.dump(bundle, path)
    print(f"trained {clf.display_name} on {len(df)} records -> {path}")
    if SYNTHETIC:
        print("WARNING: trained on SYNTHETIC data — not clinically meaningful.")


if __name__ == "__main__":
    main()
