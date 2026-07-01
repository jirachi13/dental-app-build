# Phase 3 Sprint Prompts (21a–21g + Chapter 4 draft)

Saved 2026-07-01. Detailed task breakdowns for each Phase 3 sprint, provided by the user for use **in order**, each requiring explicit review/approval before the next one starts. Do not execute any of these until Phase 1 and Phase 2 are complete and the user explicitly approves starting Phase 3 — see `CLAUDE.md`'s BUILD PHASES and BEHAVIOR RULES (one sprint at a time, ask before proceeding).

This supersedes/details the condensed Phase 3 sprint list already in `CLAUDE.md` — treat this file as the authoritative detailed spec when each sprint actually starts.

---

## SPRINT 21a — Clean Excel Data

Read all Excel files in `/data/raw/`. Do not modify originals.

**Tasks:**
1. List all column headers found per file
2. Map to our IPTR model fields:
   - student name, birthday, sex, grade level, section, school
   - DMF/dmf score (PRIMARY — find this)
   - decayed, missing, filled tooth counts
   - oral health conditions: gingivitis, periodontal disease, debris, calculus, abnormal growth
   - treatments done
   - visit dates
   - any risk indicators
3. Standardize:
   - Consistent column names
   - Date formats → YYYY-MM-DD
   - Boolean fields → true/false
   - Null for missing values
   - Filipino name encoding (UTF-8)
4. Output:
   - `/data/cleaned/dataset.csv`
   - `/data/cleaning-report.md` showing: total records found, fields available vs missing, data quality issues, % completeness per field

**Wait for review before proceeding.**

---

## SPRINT 21b — Feature Engineering

Read `/data/cleaned/dataset.csv`. Create ML-ready dataset:

1. Calculate DMF index per student: DMF = Decayed + Missing + Filled. Uppercase DMF for permanent teeth, lowercase dmf for primary teeth.
2. Create risk labels (if not already present):
   - High → DMF > 4 OR periodontal disease
   - Medium → DMF 2-4 OR gingivitis present
   - Low → DMF 0-1 AND no major conditions
3. Feature columns for ML: dmf_score (float), decayed_count (int), missing_count (int), filled_count (int), gingivitis (0/1), periodontal_disease (0/1), debris (0/1), calculus (0/1), abnormal_growth (0/1), sugar_beverages (0/1), tobacco_user (0/1), age (int), sex (0/1 encoded)
4. Handle missing values: DMF fields → median imputation, boolean fields → mode imputation, drop records missing DMF entirely
5. Check class distribution: print count of High/Medium/Low, flag if severely imbalanced
6. Save to `/data/processed/ml_dataset.csv`
7. Save label encoder to `/ml/encoders/`

**Wait for review of class distribution before proceeding to experiments.**

---

## SPRINT 21c — Algorithm Experiments

Read `/data/processed/ml_dataset.csv`. Run experiments comparing 5 algorithms (Logistic Regression, Decision Tree, Random Forest, SVM, XGBoost) for High/Medium/Low classification.

For EACH algorithm run BOTH:

**A. Train/Test Split (80/20)**: `random_state=42`, stratified split, report Accuracy/Precision/Recall/F1, generate confusion matrix.

**B. Stratified K-Fold (k=5)**: `StratifiedKFold(n_splits=5)`, report mean + std deviation of each metric across folds, generate averaged confusion matrix.

Output results to `/docs/algo-results.md` as a comparison table:

```
Algorithm | T/T Acc | T/T F1 | KF Acc | KF F1
─────────────────────────────────────────────
LR        |         |        |        |
DT        |         |        |        |
RF        |         |        |        |
SVM       |         |        |        |
XGB       |         |        |        |
```

Also generate:
- Visual decision tree diagram → `/docs/decision-tree.png`
- Feature importance chart (RF and XGBoost) → `/docs/feature-importance.png`
- Confusion matrices per algorithm → `/docs/confusion-matrices/`

**Wait for review before selecting winner.**

---

## SPRINT 21d — Select and Justify Winner

Based on `/docs/algo-results.md`:

1. Compare all 5 algorithms across: K-Fold F1 (PRIMARY metric), K-Fold Accuracy, training time, interpretability for dentists
2. Select best performing algorithm based on highest K-Fold F1 score
3. Generate `/docs/model-selection-rationale.md`: why F1 was primary metric, why K-Fold over Train/Test, why winner was selected, comparison with runner-up, limitations of selected model
4. If XGBoost or RF wins: also note Decision Tree results, mention it as most interpretable — "While XGBoost achieved highest F1, Decision Tree provides visual explainability for clinical staff"

This document becomes Chapter 4 Section 4.2. **Wait for approval before integration.**

---

## SPRINT 21e — Integrate Winner (Strategy Pattern)

Integrate winning algorithm into Floral using Strategy Pattern from `CLAUDE.md`.

```
/ml-service/
  /models/
    logistic_regression.py
    decision_tree.py
    random_forest.py
    svm.py
    xgboost_model.py
  /active/
    model.pkl  ← trained winning model
  predictor.py ← single entry point
  config.py    ← ACTIVE_MODEL = "winner_name"
  train.py     ← retraining script
  requirements.txt
```

**Rules:**
- Express API calls `predictor.py` ONLY
- Never import individual model files
- Swapping algo = change `config.py` only
- `predictor.py` returns: `{ risk_level: "High/Medium/Low", confidence: 0.0-1.0, top_features: [], recommendation: "text" }`
- FastAPI endpoint: `POST /predict` — input: student IPTR fields, output: risk classification JSON

Also create `/ml-service/retrain.py` (retrain on new data) and `/ml-service/evaluate.py` (evaluate current model metrics).

**Wait for approval before building UI.**

---

## SPRINT 21f — Risk Classification UI

Build risk classification interface in React frontend.

1. **RiskClassificationPanel** — input: student IPTR data (auto-populated from student record), button "Generate Risk Assessment", loading state while API calls ML
2. **RiskResultCard** — risk level badge (🔴 HIGH / 🟡 MEDIUM / 🟢 LOW), confidence %, top contributing factors (from feature importance), treatment recommendations list
3. **DentistValidationPanel** — dentist reviews AI recommendation, can accept or override, must add clinical notes, submit validated assessment. **CRITICAL: no clinical action taken without dentist validation.**
4. **RiskHistoryTimeline** — previous risk assessments per student, risk level change over time, trend indicator (improving/worsening)

**Rules:** only Dentist role can access this; always show "AI-assisted, not a diagnosis" disclaimer; dentist validation required before saving; log all assessments to `AUDIT_TRAIL`.

Use frontend-design + Impeccable for styling. Match existing prototype UI style.

---

## SPRINT 21g — Decision Support Interface

Build dentist decision support dashboard.

1. **Student Risk Overview** — list all students sorted by risk level, filter by school/grade/risk level, search by name, color coded red/yellow/green
2. **Priority Queue** — auto-sorted High risk first, shows pending treatments, follow-up flags, days since last visit
3. **Bulk Risk Assessment** — run risk assessment for entire class or school, progress bar, summary report after completion
4. **Risk Trend Dashboard** — school-wide risk distribution chart, month-over-month trend, compare across 3 schools, export to PDF for DOH report

**Rules:** Dentist and System Admin only; all bulk assessments logged to `AUDIT_TRAIL`; export aligned with DOH report format; show disclaimer on all AI outputs.

---

## AFTER ALL SPRINTS — Final Chapter 4 Prompt

Generate Chapter 4 results documentation based on actual experiment results in `/docs/algo-results.md`. Format following thesis template:

```
Chapter 4
PRESENTATION, ANALYSIS, AND INTERPRETATION OF DATA

4.1 System Features Presentation
    → Screenshot descriptions per module
    → Map each feature to specific SO

4.2 Predictive Analytics Results
    → Comparison table (all 5 algorithms)
    → Both Train/Test and K-Fold results
    → Visual decision tree description
    → Feature importance analysis
    → Selected model justification
    → Risk classification sample outputs

4.3 ISO 25010:2023 Evaluation Results
    → [To be filled after actual evaluation]
    → Placeholder tables for now
```

Save to `/docs/chapter4-draft.md`.
