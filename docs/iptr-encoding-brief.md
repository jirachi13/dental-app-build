# Encoding Brief — 50 IPTR Records for the Predictive Model

**For:** the dentist encoding the sample
**Prepared:** 2026-09-01
**Status:** Section 4 (risk labelling) is INCOMPLETE — see the note there.

---

## 1. What is being asked, and why

The predictive component of Floral learns from records that have already been
assessed by a dentist. Barangay Tanyag's dental records exist only as
accomplished paper IPTR forms, so there is no existing file to train on — the
training set has to be encoded by hand, once.

We are asking for **50 student records**, transferred from the paper forms into
one spreadsheet, each carrying **your risk assessment** of that student.

Fifty is a deliberate figure, not an arbitrary one. It is enough to demonstrate
the full analytics pipeline honestly, and the study reports it as a pilot rather
than as a definitive comparison of algorithms. More records would produce more
stable numbers, so if 75–100 are achievable without delaying the schedule they
are welcome — but **50 is the target and is sufficient.**

Your assessment on each record is the single most valuable part of this. The
system can compute the DMF index arithmetically; it cannot infer clinical
judgment. Every label the model learns from is yours.

---

## 2. Choosing which 50

**Aim for a spread across risk levels, not a random draw.** Roughly balanced
thirds — about 17 high, 17 medium, 16 low — is ideal. An even sample is not
required and exact quotas are not expected; what must be avoided is 45 low-risk
records and 5 high, because the model cannot learn a category it has barely
seen.

In practice this means labelling as you go rather than selecting first: pull
records, assess each, and once one category is well represented, favour the
others. Stop at 50.

Beyond that, choose ordinary, representative records:

- **Include** records that are complete enough to assess — the oral examination
  section filled in, so the tooth counts and conditions can be read.
- **Spread across the three schools and across grade levels** where convenient.
  This is not a strict requirement and should not override the risk spread
  above; it is recorded as a description of the sample.
- **Exclude** forms too incomplete or illegible to assess confidently. A guessed
  record is worse than a missing one — it teaches the model something untrue.
  There is no need to note which ones you skipped.

---

## 3. Privacy — no names

**Do not write student names anywhere in the spreadsheet.** Use `Student_001`
through `Student_050` in the `student_id` column.

If you need to keep track of which paper form each row came from, keep that
mapping on a separate sheet that stays with you and is not sent. The
spreadsheet that reaches the researchers should not identify any child.

Names are dropped from the analytics pipeline entirely, not merely anonymised —
this is why.

---

## 4. Assigning the risk level

> **⚠ INCOMPLETE — pending your DOH risk-classification reference.**
>
> This section will state the criteria for High / Medium / Low. It is left
> blank on purpose: the study needs a *citable* basis for how risk was
> classified, and the DOH lecture or study you mentioned is that source. Once
> you send it, the criteria will be written here and this brief reissued.
>
> **Please do not begin labelling until this section is filled in.** Sections 1,
> 2, 3 and 5 are final and can be prepared against now — the column template can
> be set up and the demographic and examination fields transferred, leaving only
> the `risk_level` column to complete afterwards.
>
> If no written DOH source exists, tell us — the study can describe the criteria
> as your clinical protocol instead, but it has to say so accurately, and that
> needs to be settled before labelling rather than after.

---

## 5. The spreadsheet

One row per student, 50 rows. The first row holds the column headings exactly as
written below.

Send it as `.xlsx` or `.csv`.

### Columns

| Column | What to enter | Accepted forms |
|---|---|---|
| `student_id` | `Student_001` … `Student_050` | — |
| `school` | Which of the three schools | Full or short name |
| `birthday` | Date of birth | `2015-04-03`, `04/03/2015`, `3-Apr-2015`, `April 3, 2015` |
| `sex` | Sex | `M` / `F`, `Male` / `Female`, `Lalaki` / `Babae` |
| `grade` | Grade level | `Kinder`, `K`, `Grade 3`, `G3`, `3` |
| `section` | Section name | — |
| `visit_date` | Date of the examination on the form | same as `birthday` |
| `decayed_count` | Number of decayed teeth | a number |
| `missing_count` | Number of missing teeth | a number |
| `filled_count` | Number of filled teeth | a number |
| `dmf_score` | DMF / dmf total | a number |
| `gingivitis` | Present? | `Yes` / `No` |
| `periodontal_disease` | Present? | `Yes` / `No` |
| `debris` | Present? | `Yes` / `No` |
| `calculus` | Present? | `Yes` / `No` |
| `abnormal_growth` | Present? | `Yes` / `No` |
| `sugar_beverages` | Consumes sugary drinks regularly? | `Yes` / `No` |
| `tobacco_user` | Tobacco user? | `Yes` / `No` |
| `risk_level` | Your assessment — **see Section 4** | `High` / `Medium` / `Low` |

### Notes on filling it in

- **Yes/No columns are forgiving.** `Yes`, `Y`, `1`, `✓` and `x` all read as yes;
  `No`, `N`, `0` all read as no. Use whichever is quickest.
- **Leave a cell blank if the form does not say.** Blank, `N/A` and `-` are all
  read as "not recorded", which is handled correctly. **Do not enter `0` to mean
  "not recorded"** — for the count columns, `0` means genuinely zero teeth, and
  the difference matters.
- **`dmf_score` will normally equal decayed + missing + filled.** Enter what the
  form states; if the form's total disagrees with its own counts, enter both as
  written and we will follow up rather than silently correcting it.
- **Dates accept several formats** — just be consistent within the column, and
  avoid ambiguous two-digit years.
- Every column above is used somewhere in the study. Not all of them feed the
  model — the model uses a deliberately small set of inputs, because a model
  given too many inputs on 50 records learns noise. The remainder describe the
  sample in the written chapters.

---

## 6. Sending it back

Send the finished file to the research group. On receipt it is checked
automatically for unreadable dates, unrecognised entries and missing values, and
you will be told promptly if anything needs revisiting — this is a routine check
on formatting, not on your assessments.

The encoded file is used only for this study. It carries no student names, and
the paper forms remain where they are.

---

## Open items for the research group

*(Not part of what the dentist receives — delete before sending.)*

1. **Section 4 is blocked** on the DOH risk-classification lecture/study, which
   is already on the chase-up list in HANDOFF's user-only items. Do not send this
   brief out with Section 4 empty; the fallback wording is drafted in the note
   itself if no written source turns out to exist.
2. **`build_features.py` must be cut to ~5 features before the real run.** It
   currently trains on 13 (`dmf_score`, the three counts, seven booleans, `age`,
   `sex`), which at n=50 is ~4 records per feature — past the cap CLAUDE.md sets
   and exactly the condition that makes RF/XGBoost post meaningless scores. Note
   also that `decayed_count + missing_count + filled_count` sum to `dmf_score`,
   so those four columns carry one signal. This is a separate sprint and does not
   affect what the dentist encodes.
3. **`rule_label()` must not fire on this data.** It is the Sprint 21b threshold
   fallback for records with no dentist assessment. All 50 rows should carry a
   `risk_level`; if any arrive blank, chase them rather than letting the rule
   fill them in — a rule-derived label is not a dentist-derived label, and
   Chapter 3 claims the latter.
4. **Confirm the achieved count** against the 50 target before it goes into
   Chapter 5's Limitations section, which currently reads 50 with a marker.
