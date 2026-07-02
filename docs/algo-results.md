# Algorithm Comparison Results — Sprint 21c

> **SYNTHETIC DATA NOTICE**: these results were produced from the
> generated placeholder dataset (`data/raw-synthetic/`), NOT real
> IPTR records. They demonstrate the full experimental pipeline and
> are structurally what Chapter 4 will contain, but every number
> below MUST be regenerated from real data before defense.

Generated: 2026-07-02 07:34 · Dataset: 8000 records · Features: 13 · Classes: High/Medium/Low

Class distribution: High 2145 (26.8%), Medium 3298 (41.2%), Low 2557 (32.0%)

Metrics are macro-averaged across the 3 classes. K-Fold values are
mean ± std across the 5 folds. **K-Fold F1 is the primary selection
metric** (see CLAUDE.md's EVALUATION METHODS).

## Comparison table

| Algorithm | T/T Acc | T/T Prec | T/T Rec | T/T F1 | KF Acc | KF Prec | KF Rec | KF F1 | Train time |
|---|---|---|---|---|---|---|---|---|---|
| Logistic Regression | 0.7444 | 0.7560 | 0.7417 | 0.7469 | 0.7402 ± 0.0133 | 0.7502 ± 0.0140 | 0.7416 ± 0.0114 | **0.7444 ± 0.0126** | 0.41s |
| Decision Tree | 0.7300 | 0.7425 | 0.7265 | 0.7328 | 0.7230 ± 0.0108 | 0.7309 ± 0.0085 | 0.7272 ± 0.0131 | **0.7284 ± 0.0109** | 0.02s |
| Random Forest | 0.6981 | 0.7032 | 0.7025 | 0.7027 | 0.7010 ± 0.0148 | 0.7058 ± 0.0151 | 0.7085 ± 0.0137 | **0.7069 ± 0.0145** | 1.64s |
| SVM | 0.7431 | 0.7513 | 0.7433 | 0.7462 | 0.7356 ± 0.0112 | 0.7433 ± 0.0101 | 0.7385 ± 0.0107 | **0.7399 ± 0.0104** | 6.37s |
| XGBoost | 0.7013 | 0.7071 | 0.7026 | 0.7046 | 0.7053 ± 0.0103 | 0.7108 ± 0.0108 | 0.7098 ± 0.0087 | **0.7097 ± 0.0096** | 0.70s |

**Winner by K-Fold F1: Logistic Regression (0.7444)**

## Train/Test vs K-Fold consistency

Per-algorithm difference between holdout F1 and K-Fold mean F1 — small
deltas mean the models are stable, not overfitting (this comparison is
itself a Chapter 4 discussion point):

| Algorithm | T/T F1 | KF F1 | Δ |
|---|---|---|---|
| Logistic Regression | 0.7469 | 0.7444 | +0.0025 |
| Decision Tree | 0.7328 | 0.7284 | +0.0044 |
| Random Forest | 0.7027 | 0.7069 | -0.0043 |
| SVM | 0.7462 | 0.7399 | +0.0063 |
| XGBoost | 0.7046 | 0.7097 | -0.0051 |

## Artifacts

- `docs/decision-tree.png` — visual decision tree (depth-3 render)
- `docs/feature-importance.png` — RF + XGBoost feature importances
- `docs/confusion-matrices/<algorithm>.png` — per-algorithm confusion
  matrices, Train/Test and averaged K-Fold side by side

## Reproduction

```
python ml-service/pipeline/clean_excel.py data/raw-synthetic
python ml-service/pipeline/build_features.py
python ml-service/experiments/run_experiments.py
```
`random_state=42` everywhere — results are deterministic.