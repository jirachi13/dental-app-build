"""Sprint 21b — feature engineering: cleaned CSV → ML-ready dataset.

Reads data/cleaned/dataset.csv, produces data/processed/ml_dataset.csv with
exactly the 13 feature columns predictor.py already expects, plus student_id
and the risk_level label.

Decisions (documented for Chapter 4):
- DMF score: recorded total where present; recomputed as D+M+F when the total
  is blank but components exist. Records with no DMF information at all are
  dropped (DMF is the PRIMARY variable — imputing it would fabricate the one
  signal the model depends on most).
- Remaining missing D/M/F component values → median imputation.
- Boolean condition/habit fields: null → 0 (false). DELIBERATE deviation from
  generic mode-imputation: on these forms staff tick positives only, so a
  blank means "not observed", not "unknown" (user-confirmed). Mode imputation
  would be wrong here — for several conditions the recorded values are
  majority-positive precisely because negatives are usually left blank, so
  the mode would flip every blank to "has the disease".
- age: computed from birthday → visit date; missing → median imputation.
- sex: M=1, F=0 (encoder saved to ml-service/encoders/encoders.json).
- risk_level label: dentist-recorded assessment where present; where absent,
  rule fallback per the sprint spec (High: DMF>4 or periodontal disease;
  Medium: DMF 2-4 or gingivitis; Low: otherwise).

Run from repo root:  python ml-service/pipeline/build_features.py [in_csv] [out_dir] [encoder_dir]
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_IN = REPO_ROOT / "data" / "cleaned" / "dataset.csv"
DEFAULT_OUT_DIR = REPO_ROOT / "data" / "processed"
ENCODER_DIR = Path(__file__).resolve().parents[1] / "encoders"

BOOL_FIELDS = ["gingivitis", "periodontal_disease", "debris", "calculus",
               "abnormal_growth", "sugar_beverages", "tobacco_user"]

SEX_ENCODING = {"M": 1, "F": 0}
RISK_LEVELS = ["High", "Medium", "Low"]

FEATURE_COLUMNS = ["dmf_score", "decayed_count", "missing_count", "filled_count",
                   *BOOL_FIELDS, "age", "sex"]


def rule_label(row) -> str:
    """Fallback risk rule from the Sprint 21b spec, for records where the
    source file had no dentist-recorded risk assessment."""
    if row["dmf_score"] > 4 or row["periodontal_disease"] == 1:
        return "High"
    if 2 <= row["dmf_score"] <= 4 or row["gingivitis"] == 1:
        return "Medium"
    return "Low"


def main() -> None:
    in_csv = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT_DIR
    encoder_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else ENCODER_DIR
    df = pd.read_csv(in_csv)
    n_start = len(df)

    # booleans: blank = not ticked = absent (see module docstring)
    for col in BOOL_FIELDS:
        df[col] = df[col].map({True: 1, False: 0}).fillna(0).astype(int)

    # DMF: recompute from components when total is missing
    components = df[["decayed_count", "missing_count", "filled_count"]]
    df["dmf_score"] = df["dmf_score"].fillna(components.sum(axis=1, min_count=1))
    df = df.dropna(subset=["dmf_score"])
    dropped_no_dmf = n_start - len(df)

    # median-impute remaining component gaps
    for col in ["decayed_count", "missing_count", "filled_count"]:
        df[col] = df[col].fillna(df[col].median())

    # age from birthday → visit date
    birth = pd.to_datetime(df["birthday"], errors="coerce")
    visit = pd.to_datetime(df["visit_date"], errors="coerce")
    df["age"] = ((visit - birth).dt.days / 365.25).apply(
        lambda d: int(d) if pd.notna(d) else None)
    df["age"] = df["age"].fillna(df["age"].median()).astype(int)

    df["sex"] = df["sex"].map(SEX_ENCODING)
    df["sex"] = df["sex"].fillna(df["sex"].mode()[0]).astype(int)

    # label: dentist-recorded where present, rule fallback otherwise
    from_rule = df["risk_level"].isna()
    df.loc[from_rule, "risk_level"] = df[from_rule].apply(rule_label, axis=1)

    out = df[["student_id", *FEATURE_COLUMNS, "risk_level"]].copy()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "ml_dataset.csv"
    out.to_csv(out_path, index=False, encoding="utf-8")

    encoder_dir.mkdir(parents=True, exist_ok=True)
    (encoder_dir / "encoders.json").write_text(json.dumps({
        "generated": datetime.now().isoformat(timespec="seconds"),
        "sex": SEX_ENCODING,
        "risk_levels": RISK_LEVELS,
        "boolean_null_policy": "null means not-ticked, encoded as 0",
    }, indent=2), encoding="utf-8")

    dist = out["risk_level"].value_counts()
    print(f"ml dataset: {out_path} ({len(out)} records, "
          f"{dropped_no_dmf} dropped for missing DMF)")
    print(f"labels from dentist-recorded risk: {(~from_rule).sum()}, "
          f"from rule fallback: {from_rule.sum()}")
    print("\nclass distribution:")
    for lvl in RISK_LEVELS:
        n = dist.get(lvl, 0)
        print(f"  {lvl:<7} {n:>5}  ({100 * n / len(out):.1f}%)")
    ratio = dist.max() / dist.min()
    print(f"\nimbalance ratio (largest/smallest class): {ratio:.2f}"
          + ("  — SEVERE, consider class weights" if ratio > 3 else "  — acceptable"))


if __name__ == "__main__":
    main()
