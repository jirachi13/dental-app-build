# Model Selection Rationale — Sprint 21d

> **SYNTHETIC DATA NOTICE**: this selection was made on the generated
> placeholder dataset, NOT real IPTR records. The document's *structure* is
> what Chapter 4 Section 4.2 needs, and the reasoning framework carries over
> unchanged — but the winner itself may change when the experiments are re-run
> on real data, and this document must be regenerated at that point.

Source results: [`algo-results.md`](./algo-results.md) (8,000 records, 13
features, High/Medium/Low classes, `random_state=42`).

## Why F1 score is the primary metric

Accuracy alone is misleading on imbalanced medical data: a model that
over-predicts the majority class (Medium, 41.2%) can look accurate while
systematically missing High-risk students — the single most costly error in
this system, since High-risk students are the ones who need earliest clinical
attention. Macro-F1 balances precision and recall *per class* and weights all
three classes equally, so a model cannot score well while neglecting the
smallest class (High, 26.8%).

## Why Stratified K-Fold (k=5) over Train/Test for final selection

A single 80/20 holdout evaluates each model on one particular 1,600-record
sample — the result partly reflects the luck of that split. Stratified 5-fold
cross-validation evaluates every record exactly once across 5 rotations while
preserving class proportions in each fold, giving a mean ± std that shows both
expected performance and its variability. K=5 (not 10) because ~1,600-record
folds keep even the smallest class well-represented per fold (see CLAUDE.md's
EVALUATION METHODS for the full k=5 vs k=10 reasoning).

The Train/Test results are still reported as a consistency check: all five
algorithms show |Δ F1| < 0.007 between the two methods, indicating stable,
non-overfitting models — itself a Chapter 4 discussion point.

## Selected model: Logistic Regression

| Rank | Algorithm | K-Fold F1 (mean ± std) | K-Fold Acc | Train time |
|---|---|---|---|---|
| **1** | **Logistic Regression** | **0.7444 ± 0.0126** | 0.7402 | 0.41s |
| 2 | SVM | 0.7399 ± 0.0104 | 0.7356 | 6.37s |
| 3 | Decision Tree | 0.7284 ± 0.0109 | 0.7230 | 0.02s |
| 4 | XGBoost | 0.7097 ± 0.0096 | 0.7053 | 0.70s |
| 5 | Random Forest | 0.7069 ± 0.0145 | 0.7010 | 1.64s |

Logistic Regression achieved the highest K-Fold F1 (0.7444) and the highest
K-Fold accuracy, with fold-to-fold variability (±0.0126) in line with the
other algorithms. Beyond the primary metric it is also the strongest choice on
the secondary criteria:

- **Interpretability for dentists**: each feature has a signed coefficient —
  "higher DMF score raises predicted risk" is directly readable from the
  model, which supports the system's rule that predictions only *assist* the
  dentist's judgment.
- **Training cost**: 0.41s — retraining on new data (retrain.py) is trivial.
- **Simplicity**: fewest moving parts of the five; an interpretable baseline
  that the more complex models failed to beat.

## Comparison with the runner-up (SVM)

SVM's K-Fold F1 (0.7399) is within one standard deviation of Logistic
Regression's, so the two are statistically close on this dataset. Logistic
Regression is still preferred: it trains ~15× faster, produces calibrated
probabilities natively (SVM's probability estimates require an extra
calibration step, and `SVC(probability=True)` is deprecated in current
scikit-learn), and is far easier to explain to a non-technical panel and to
clinical staff.

## Note on interpretability (per sprint spec)

The Decision Tree (rank 3, F1 0.7284) remains the most *visually* explainable
model — `docs/decision-tree.png` shows its top splits, which are dominated by
DMF score and periodontal disease, mirroring the clinical rule of thumb. While
Logistic Regression achieved the highest F1 and is the selected model, the
Decision Tree diagram is retained in Chapter 4 as the visual explanation of
how the feature space separates the three risk levels.

## Limitations of the selected model

- **Linear decision boundaries**: Logistic Regression cannot capture feature
  interactions (e.g. "high DMF *only when combined with* poor hygiene") unless
  they are engineered explicitly. On this dataset that cost nothing — but real
  data may reward the tree ensembles more, which is one reason the experiments
  must be re-run.
- **Trained on synthetic data**: the current fitted model reflects the
  synthetic generator's assumptions, not Barangay Tanyag's real epidemiology.
  It must never be presented as clinically meaningful until retrained.
- **Sparse-field assumption**: blank condition fields were encoded as
  "absent" (per how clinic staff actually fill the forms). If real forms turn
  out to use blank for "not examined" in some files, that encoding decision
  needs revisiting in Sprint 21b.
- **Assists, never replaces**: regardless of algorithm, every prediction
  requires dentist validation before any clinical action (CLAUDE.md ABSOLUTE
  DO NOT list; enforced in the Sprint 21f UI).

## Mechanism of selection (Strategy Pattern)

The active algorithm is set in `ml-service/config.py`
(`ACTIVE_ALGORITHM = "logistic_regression"`). Swapping to any other algorithm —
including after the real-data re-run — is a one-line change there; nothing
else in the application knows which algorithm is running.
