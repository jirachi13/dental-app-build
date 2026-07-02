"""Sprint 21c — algorithm comparison experiments.

Runs all 5 algorithms (Logistic Regression, Decision Tree, Random Forest,
SVM, XGBoost) against data/processed/ml_dataset.csv using BOTH evaluation
methods from CLAUDE.md:

  A. Train/Test split: 80/20, stratified, random_state=42 (secondary)
  B. Stratified K-Fold: k=5, shuffle, random_state=42 (PRIMARY — final
     model selection uses K-Fold F1)

Outputs:
  docs/algo-results.md            comparison tables + per-algorithm detail
  docs/decision-tree.png          visual decision tree (depth-limited render)
  docs/feature-importance.png     RF + XGBoost feature importances
  docs/confusion-matrices/*.png   per algorithm (both methods side by side)

> Results produced from SYNTHETIC placeholder data are labeled as such in the
> generated report and MUST be re-run on real IPTR data before defense.

Run from repo root:  python ml-service/experiments/run_experiments.py [in_csv] [docs_dir]
"""

import sys
import time
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.tree import plot_tree

ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT))

import predictor  # noqa: E402  (single sanctioned entry point)

REPO_ROOT = ML_ROOT.parent
DEFAULT_IN = REPO_ROOT / "data" / "processed" / "ml_dataset.csv"
DEFAULT_DOCS = REPO_ROOT / "docs"

LABELS = ["High", "Medium", "Low"]
RANDOM_STATE = 42
SYNTHETIC = True  # flip to False when rerunning on real data


def evaluate(y_true, y_pred) -> dict[str, float]:
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, average="macro", zero_division=0),
        "recall": recall_score(y_true, y_pred, average="macro", zero_division=0),
        "f1": f1_score(y_true, y_pred, average="macro", zero_division=0),
    }


def run_train_test(cls, X, y):
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    clf = cls()
    t0 = time.perf_counter()
    clf.train(X_tr, y_tr)
    train_time = time.perf_counter() - t0
    y_pred = clf.predict(X_te)
    return evaluate(y_te, y_pred), confusion_matrix(y_te, y_pred, labels=LABELS), \
        train_time, clf


def run_kfold(cls, X, y):
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    fold_metrics: list[dict] = []
    cm_total = np.zeros((3, 3), dtype=float)
    for tr_idx, te_idx in skf.split(X, y):
        clf = cls()
        clf.train(X.iloc[tr_idx], y.iloc[tr_idx])
        y_pred = clf.predict(X.iloc[te_idx])
        fold_metrics.append(evaluate(y.iloc[te_idx], y_pred))
        cm_total += confusion_matrix(y.iloc[te_idx], y_pred, labels=LABELS)
    mean = {k: float(np.mean([m[k] for m in fold_metrics])) for k in fold_metrics[0]}
    std = {k: float(np.std([m[k] for m in fold_metrics])) for k in fold_metrics[0]}
    return mean, std, cm_total / 5


def plot_cm(ax, cm, title):
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(3), LABELS)
    ax.set_yticks(range(3), LABELS)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(title, fontsize=10)
    for i in range(3):
        for j in range(3):
            ax.text(j, i, f"{cm[i, j]:.0f}", ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black", fontsize=9)


def main() -> None:
    in_csv = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    docs = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_DOCS
    cm_dir = docs / "confusion-matrices"
    cm_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(in_csv)
    X = df[predictor.FEATURE_COLUMNS]
    y = df[predictor.LABEL_COLUMN]

    results: dict[str, dict] = {}
    fitted: dict[str, object] = {}
    for key, cls in predictor.algorithm_registry().items():
        print(f"running {key} ...", flush=True)
        tt_metrics, tt_cm, train_time, clf = run_train_test(cls, X, y)
        kf_mean, kf_std, kf_cm = run_kfold(cls, X, y)
        results[key] = {
            "name": clf.display_name, "tt": tt_metrics, "tt_cm": tt_cm,
            "kf": kf_mean, "kf_std": kf_std, "kf_cm": kf_cm,
            "train_time": train_time,
        }
        fitted[key] = clf

        fig, axes = plt.subplots(1, 2, figsize=(9, 4))
        plot_cm(axes[0], tt_cm, f"{clf.display_name} — Train/Test (80/20)")
        plot_cm(axes[1], kf_cm, f"{clf.display_name} — K-Fold (k=5, averaged)")
        fig.tight_layout()
        fig.savefig(cm_dir / f"{key}.png", dpi=150)
        plt.close(fig)

    # decision tree diagram (depth-limited for legibility)
    fig, ax = plt.subplots(figsize=(22, 10))
    plot_tree(fitted["decision_tree"].model, feature_names=predictor.FEATURE_COLUMNS,
              class_names=fitted["decision_tree"].model.classes_, filled=True,
              max_depth=3, fontsize=8, ax=ax)
    ax.set_title("Decision Tree (rendered to depth 3 for legibility; "
                 "full tree is deeper)")
    fig.tight_layout()
    fig.savefig(docs / "decision-tree.png", dpi=150)
    plt.close(fig)

    # feature importances: RF + XGBoost
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    for ax, key, title in [(axes[0], "random_forest", "Random Forest"),
                           (axes[1], "xgboost", "XGBoost")]:
        imp = fitted[key].model.feature_importances_
        order = np.argsort(imp)
        ax.barh([predictor.FEATURE_COLUMNS[i] for i in order], imp[order])
        ax.set_title(f"{title} feature importance")
    fig.tight_layout()
    fig.savefig(docs / "feature-importance.png", dpi=150)
    plt.close(fig)

    # ---- algo-results.md ----
    stamp = f"{datetime.now():%Y-%m-%d %H:%M}"
    lines = ["# Algorithm Comparison Results — Sprint 21c", ""]
    if SYNTHETIC:
        lines += [
            "> **SYNTHETIC DATA NOTICE**: these results were produced from the",
            "> generated placeholder dataset (`data/raw-synthetic/`), NOT real",
            "> IPTR records. They demonstrate the full experimental pipeline and",
            "> are structurally what Chapter 4 will contain, but every number",
            "> below MUST be regenerated from real data before defense.",
            "",
        ]
    lines += [
        f"Generated: {stamp} · Dataset: {len(df)} records · "
        f"Features: {len(predictor.FEATURE_COLUMNS)} · Classes: High/Medium/Low",
        "",
        f"Class distribution: "
        + ", ".join(f"{lvl} {int((y == lvl).sum())} ({100 * (y == lvl).mean():.1f}%)"
                    for lvl in LABELS),
        "",
        "Metrics are macro-averaged across the 3 classes. K-Fold values are",
        "mean ± std across the 5 folds. **K-Fold F1 is the primary selection",
        "metric** (see CLAUDE.md's EVALUATION METHODS).",
        "",
        "## Comparison table",
        "",
        "| Algorithm | T/T Acc | T/T Prec | T/T Rec | T/T F1 | KF Acc | KF Prec | KF Rec | KF F1 | Train time |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for key, r in results.items():
        tt, kf, sd = r["tt"], r["kf"], r["kf_std"]
        lines.append(
            f"| {r['name']} | {tt['accuracy']:.4f} | {tt['precision']:.4f} | "
            f"{tt['recall']:.4f} | {tt['f1']:.4f} | "
            f"{kf['accuracy']:.4f} ± {sd['accuracy']:.4f} | "
            f"{kf['precision']:.4f} ± {sd['precision']:.4f} | "
            f"{kf['recall']:.4f} ± {sd['recall']:.4f} | "
            f"**{kf['f1']:.4f} ± {sd['f1']:.4f}** | {r['train_time']:.2f}s |")

    winner = max(results, key=lambda k: results[k]["kf"]["f1"])
    lines += [
        "",
        f"**Winner by K-Fold F1: {results[winner]['name']} "
        f"({results[winner]['kf']['f1']:.4f})**",
        "",
        "## Train/Test vs K-Fold consistency",
        "",
        "Per-algorithm difference between holdout F1 and K-Fold mean F1 — small",
        "deltas mean the models are stable, not overfitting (this comparison is",
        "itself a Chapter 4 discussion point):",
        "",
        "| Algorithm | T/T F1 | KF F1 | Δ |",
        "|---|---|---|---|",
    ]
    for key, r in results.items():
        delta = r["tt"]["f1"] - r["kf"]["f1"]
        lines.append(f"| {r['name']} | {r['tt']['f1']:.4f} | "
                     f"{r['kf']['f1']:.4f} | {delta:+.4f} |")
    lines += [
        "",
        "## Artifacts",
        "",
        "- `docs/decision-tree.png` — visual decision tree (depth-3 render)",
        "- `docs/feature-importance.png` — RF + XGBoost feature importances",
        "- `docs/confusion-matrices/<algorithm>.png` — per-algorithm confusion",
        "  matrices, Train/Test and averaged K-Fold side by side",
        "",
        "## Reproduction",
        "",
        "```",
        "python ml-service/pipeline/clean_excel.py data/raw-synthetic",
        "python ml-service/pipeline/build_features.py",
        "python ml-service/experiments/run_experiments.py",
        "```",
        f"`random_state={RANDOM_STATE}` everywhere — results are deterministic.",
    ]
    (docs / "algo-results.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"\nresults: {docs / 'algo-results.md'}")
    print(f"winner by K-Fold F1: {results[winner]['name']} "
          f"({results[winner]['kf']['f1']:.4f})")


if __name__ == "__main__":
    main()
