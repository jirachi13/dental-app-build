"""Generates ml-service/data/dummy_train.csv — a small SYNTHETIC placeholder
dataset used only to prove the swappable-algorithm architecture trains and
predicts correctly. NOT real patient data. Delete/replace once real cleaned
dental IPTR data exists (Sprint 21a-21d) and never treat predictions built on
this data as clinically meaningful.

Risk labeling follows CLAUDE.md's Sprint 21b rule so labels are at least
internally consistent with the eventual real pipeline:
  High   -> DMF > 4 OR periodontal_disease
  Medium -> DMF 2-4 OR gingivitis
  Low    -> DMF 0-1 AND no major conditions
"""

import random

import pandas as pd

random.seed(42)


def label_risk(dmf, periodontal, gingivitis):
    if dmf > 4 or periodontal:
        return "High"
    if 2 <= dmf <= 4 or gingivitis:
        return "Medium"
    return "Low"


def generate_row():
    # Weighted toward lower counts so all 3 risk bands end up reasonably
    # represented instead of "High" dominating (DMF > 4 is easy to hit with
    # uniform random 0-5/0-3/0-3 ranges).
    decayed = random.choices([0, 1, 2, 3, 4, 5], weights=[30, 25, 20, 12, 8, 5])[0]
    missing = random.choices([0, 1, 2, 3], weights=[55, 25, 12, 8])[0]
    filled = random.choices([0, 1, 2, 3], weights=[55, 25, 12, 8])[0]
    dmf = float(decayed + missing + filled)
    periodontal = random.random() < 0.1
    gingivitis = random.random() < 0.25

    return {
        "dmf_score": dmf,
        "decayed_count": decayed,
        "missing_count": missing,
        "filled_count": filled,
        "gingivitis": int(gingivitis),
        "periodontal_disease": int(periodontal),
        "debris": int(random.random() < 0.25),
        "calculus": int(random.random() < 0.2),
        "abnormal_growth": int(random.random() < 0.03),
        "sugar_beverages": int(random.random() < 0.5),
        "tobacco_user": int(random.random() < 0.05),
        "age": random.randint(5, 15),
        "sex": random.randint(0, 1),
        "risk_level": label_risk(dmf, periodontal, gingivitis),
    }


if __name__ == "__main__":
    import sys

    rows = [generate_row() for _ in range(300)]
    df = pd.DataFrame(rows)
    if "--stats" in sys.argv:
        print("Class distribution:\n", df["risk_level"].value_counts(), file=sys.stderr)
    print(df.to_csv(index=False), end="")
