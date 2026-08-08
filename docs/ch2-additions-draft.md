# Chapter 2 — two proposed additions (DRAFT, 2026-08-08)

Separate file by design. Do **not** paste into `Group404 - Manuscript.md` until the
citation-numbering issue below is resolved, or the new text will inherit the same fault.

> ⚠ **Read first — in-text citation numbers do not match the reference list.**
> In Chapter 2 the Swinckels study is cited as `[45]`, but entry `[45]` in the reference
> list is Simmons et al.; Swinckels is `[46]`. The offset is **+1** through the 40s–50s
> (Markose 41→42, Alabdulkarim 42→43, Weber 43→44, Bomfim 46→47, Patel 48→49,
> Kang 49→50, Hung 50→51, Ameli 53→54) and **+2** in the 30s (Elicanal 36→38,
> Caluban 38→40). This is manuscript-wide, not confined to these paragraphs.
> **The numbers used below follow the REFERENCE LIST**, which appears to be correct.
> Renumber the in-text citations to match before inserting.

---

## 1. SVM justification

*Placement: in the machine-learning cluster of Chapter 2, after the Kang et al. discussion.*

> Support Vector Machines (SVM) have likewise been applied to oral health risk prediction,
> though reported results position them as a comparison baseline rather than a leading
> performer. In the six-algorithm comparison conducted by Kang et al. [50], SVM was
> evaluated alongside gradient-boosted decision trees, logistic regression, artificial
> neural networks, and convolutional neural networks on 22,287 samples from the Korean
> children's oral health survey, with Random Forest ultimately achieving the highest
> performance. The inclusion of SVM in such comparisons reflects its standing as a
> structurally distinct classifier: whereas tree-based ensembles partition the feature
> space hierarchically and logistic regression estimates class probabilities directly,
> SVM constructs a maximum-margin decision boundary, and its performance therefore
> characterizes the data from a different methodological perspective. Retaining SVM in a
> comparative evaluation guards against the possibility that a single algorithmic family
> is favored by the structure of the dataset rather than by genuine predictive signal.

**Honest note for the defense:** this paragraph justifies SVM's *inclusion as a baseline*,
which is what the literature actually supports. It does not claim SVM is expected to win.
If a panelist asks "why SVM?", the defensible answer is methodological coverage — a
margin-based classifier alongside probability-based and tree-based ones — not prior
evidence of superiority. If a stronger claim is wanted, an SVM-specific caries or
periodontal prediction study must be located and added to the reference list; nothing
currently in the manuscript supports one.

---

## 2. Stratified K-Fold cross-validation justification

*Placement: wherever Chapter 2 addresses evaluation methodology; if no such subsection
exists, it belongs at the end of the machine-learning cluster.*

> Evaluation methodology is itself a determinant of the reliability of reported model
> performance. A single train/test partition yields an estimate conditioned on one
> arbitrary split, which becomes unstable as sample size decreases or as class
> distributions grow imbalanced. K-fold cross-validation addresses this by partitioning
> the dataset into k subsets, training on k−1 and validating on the remainder, and
> averaging performance across all k iterations, so that every observation contributes to
> both training and validation. Patel et al. [49] applied a five-fold cross-validation
> strategy in developing their periodontal disease prediction model from 27,138 patient
> records, using it to obtain a performance estimate less dependent on any single
> partition. The stratified variant preserves the class distribution of the full dataset
> within each fold, which is material when the clinical outcome of interest is
> comparatively rare: without stratification, a minority class may be unevenly
> distributed or absent from individual folds, producing per-class metrics that reflect
> the partitioning rather than the model. For datasets in which high-risk cases form the
> smallest and most clinically consequential class, stratification is therefore a
> precondition for interpretable recall and F1 measurement.

**Optional additional citation.** The canonical methodological source is Kohavi's
comparison of cross-validation and bootstrap for accuracy estimation and model selection
(IJCAI, 1995). It is widely cited and would strengthen the k-fold justification
considerably — **verify the full bibliographic details yourself before adding it**; it is
not currently in the reference list and I have not confirmed the citation format against
the source.

---

## What these do not cover

Chapter 3 commits to **k=5 rather than k=10**, justified on the grounds that ~8,000
records with imbalanced conditions make rare conditions unreliable in k=10's smaller
folds. The paragraph above supports stratification generally but does **not** defend that
specific choice of k.

That justification also now conflicts with reality: the ~8,000-record premise no longer
holds, since the real data is paper-only and the pilot is ~50 hand-encoded records. At
n=50 the argument for k=5 is stronger, not weaker — folds of ~10 versus ~5 — but the
stated *reason* in Chapter 3 needs rewriting to match the actual sample. Flagging it here
rather than silently drafting around it.
