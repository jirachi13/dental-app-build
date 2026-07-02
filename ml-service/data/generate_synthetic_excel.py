"""SYNTHETIC data generator — produces messy Excel files that mimic the real
Barangay Tanyag dental IPTR spreadsheets (inconsistent column names, date
formats, boolean encodings, misspellings, missing values, junk rows), so the
Sprint 21a cleaning pipeline is real, testable work that can be rerun on the
real files the moment they arrive.

THIS IS NOT REAL PATIENT DATA. Every name, score, and condition is generated.
Output goes to data/raw-synthetic/ (never data/raw/, which is reserved for the
real files). Chapter 4 numbers derived from this data are placeholders and
MUST be re-run on real data before defense.

Generation model: a latent risk level (Low/Medium/High) is drawn first, then
features are sampled conditioned on it (overlapping distributions), and the
recorded "risk" column gets ~7% label noise (dentist disagreement). This is
deliberate — if labels were derived deterministically from the features, tree
models would trivially score 100% and the algorithm comparison would be
meaningless.

Run from repo root:  python ml-service/data/generate_synthetic_excel.py
Optional first arg overrides the output directory (workaround for Windows
Controlled Folder Access blocking python.exe writes under Documents).
"""

import random
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
OUT_DIR = (Path(sys.argv[1]) if len(sys.argv) > 1
           else Path(__file__).resolve().parents[2] / "data" / "raw-synthetic")

FIRST_NAMES = [
    "Juan", "Jose", "Andres", "Carlo", "Miguel", "Rafael", "Paolo", "Marco",
    "Angelo", "Gabriel", "Joshua", "Nathan", "Elijah", "James", "Lorenzo",
    "Maria", "Ana", "Sofia", "Isabella", "Angela", "Trisha", "Nicole",
    "Andrea", "Samantha", "Bianca", "Camille", "Kyla", "Althea", "Jasmine",
    "Princess", "Angel", "Divine", "Precious", "Rhian", "Danica",
]
LAST_NAMES = [
    "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza",
    "Torres", "Flores", "Villanueva", "Ramos", "Aquino", "Castillo", "Rivera",
    "Domingo", "Salazar", "Navarro", "Del Rosario", "Aguilar", "Mercado",
    "Dela Cruz", "Fernandez", "Gonzales", "Lopez", "Pascual", "Soriano",
]
SECTIONS = ["Rose", "Sampaguita", "Ilang-Ilang", "Orchid", "Daisy", "Tulip",
            "Jasmine", "Camia", "Dahlia", "Lily"]

# P(risk), then per-risk feature distributions
RISK_PROBS = {"Low": 0.35, "Medium": 0.40, "High": 0.25}
POISSON = {  # (decayed, missing, filled) lambda per risk
    "Low": (0.6, 0.2, 0.5),
    "Medium": (2.5, 0.6, 1.0),
    "High": (5.0, 1.5, 1.5),
}
COND_PROBS = {  # gingivitis, periodontal, debris, calculus, abnormal_growth, sugar
    "Low":    (0.05, 0.01, 0.20, 0.10, 0.01, 0.50),
    "Medium": (0.45, 0.08, 0.50, 0.35, 0.03, 0.70),
    "High":   (0.70, 0.45, 0.70, 0.60, 0.06, 0.85),
}
LABEL_NOISE = 0.07  # recorded risk disagrees with latent risk this often
NEIGHBOR = {"Low": ["Medium"], "Medium": ["Low", "High"], "High": ["Medium"]}


def gen_student(rng: random.Random, nprng: np.random.Generator,
                grade_range: tuple[int, int]) -> dict:
    latent = rng.choices(list(RISK_PROBS), weights=RISK_PROBS.values())[0]
    grade = rng.randint(*grade_range)  # 0 = Kinder
    age = grade + 5 + rng.choice([0, 0, 0, 1, 1, 2])
    birth_year = 2026 - age
    birthday = date(birth_year, rng.randint(1, 12), rng.randint(1, 28))

    ld, lm, lf = POISSON[latent]
    decayed = min(int(nprng.poisson(ld)), 12)
    missing = min(int(nprng.poisson(lm)), 6)
    filled = min(int(nprng.poisson(lf)), 8)
    g, p, d, c, a, s = COND_PROBS[latent]
    tobacco_p = 0.0 if age < 10 else {"Low": 0.01, "Medium": 0.03, "High": 0.08}[latent]

    recorded = latent
    if rng.random() < LABEL_NOISE:
        recorded = rng.choice(NEIGHBOR[latent])

    return {
        "name": f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}",
        "birthday": birthday,
        "sex": rng.choice(["M", "F"]),
        "grade": grade,
        "section": rng.choice(SECTIONS),
        "decayed": decayed,
        "missing": missing,
        "filled": filled,
        "dmf": decayed + missing + filled,
        "gingivitis": int(rng.random() < g),
        "periodontal": int(rng.random() < p),
        "debris": int(rng.random() < d),
        "calculus": int(rng.random() < c),
        "abnormal_growth": int(rng.random() < a),
        "sugar": int(rng.random() < s),
        "tobacco": int(rng.random() < tobacco_p),
        "risk": recorded,
        "visit": date(2025, rng.randint(6, 12), rng.randint(1, 28)),
    }


def grade_label(g: int, style: str) -> str:
    if g == 0:
        return {"long": "Kinder", "short": "K", "num": "K"}[style]
    return {"long": f"Grade {g}", "short": f"G{g}", "num": str(g)}[style]


def maybe_missing(rng, value, p, token=""):
    """Blank out a cell with probability p, using the file's missing-token."""
    return token if rng.random() < p else value


def sparse_bool(rng, v: int, yes: str, no: str) -> str:
    """Condition/habit cells on real IPTR forms are usually blank — staff mostly
    tick positives only (user-confirmed). Positive: recorded 85% of the time,
    blank 15%. Negative: blank 70% of the time, explicit 'No' 30%."""
    if v:
        return yes if rng.random() < 0.85 else ""
    return "" if rng.random() < 0.70 else no


ALLERGY_NOTES = ["seafood allergy", "penicillin", "asthma", "peanuts", "none known"]


def sparse_medical(rng) -> str:
    """Medical-history free-text column: overwhelmingly blank on real forms."""
    return rng.choice(ALLERGY_NOTES) if rng.random() < 0.06 else ""


def build_file(students: list[dict], dialect: str, rng: random.Random) -> pd.DataFrame:
    """Render the same underlying facts through one file's naming/format dialect."""
    rows = []
    for st in students:
        if dialect == "btis_2024":
            yn = lambda v: "Yes" if v else "No"
            rows.append({
                "Name of Pupil": st["name"],
                "Date of Birth": st["birthday"].strftime("%m/%d/%Y"),
                "Sex": st["sex"],
                "Grade": grade_label(st["grade"], "long"),
                "Section": st["section"],
                "D": maybe_missing(rng, st["decayed"], 0.03),
                "M": maybe_missing(rng, st["missing"], 0.03),
                "F": maybe_missing(rng, st["filled"], 0.03),
                "DMF Score": st["dmf"],
                "Gingivitis": sparse_bool(rng, st["gingivitis"], "Yes", "No"),
                "Periodontal Disease": sparse_bool(rng, st["periodontal"], "Yes", "No"),
                "Debris": sparse_bool(rng, st["debris"], "Yes", "No"),
                "Calculus": sparse_bool(rng, st["calculus"], "Yes", "No"),
                "Abnormal Growth": sparse_bool(rng, st["abnormal_growth"], "Yes", "No"),
                "Sugary Drinks": sparse_bool(rng, st["sugar"], "Yes", "No"),
                "Tobacco Use": sparse_bool(rng, st["tobacco"], "Yes", "No"),
                "Medical History": sparse_medical(rng),
                "Date of Oral Examination": st["visit"].strftime("%m/%d/%Y"),
                "Risk Level": st["risk"],
            })
        elif dialect == "btis_2025":
            yn = lambda v: "Y" if v else "N"
            rows.append({
                "STUDENT NAME": st["name"].upper(),
                "BIRTHDAY": st["birthday"].strftime("%d-%b-%Y"),
                "GENDER": st["sex"],
                "GRADE LEVEL": grade_label(st["grade"], "short"),
                "SECTION": st["section"].upper(),
                "Decayed": st["decayed"],
                "Missing": st["missing"],
                "Filled": st["filled"],
                "dmft": maybe_missing(rng, st["dmf"], 0.04),
                "Gingvitis": sparse_bool(rng, st["gingivitis"], "Y", "N"),  # misspelled on purpose
                "Periodontal": sparse_bool(rng, st["periodontal"], "Y", "N"),
                "Debris": sparse_bool(rng, st["debris"], "Y", "N"),
                "Calculus": sparse_bool(rng, st["calculus"], "Y", "N"),
                "Growth": sparse_bool(rng, st["abnormal_growth"], "Y", "N"),
                "Sugar Beverages": sparse_bool(rng, st["sugar"], "Y", "N"),
                "Tobacco": sparse_bool(rng, st["tobacco"], "Y", "N"),
                "Exam Date": st["visit"].strftime("%d-%b-%Y"),
                "Caries Risk": st["risk"][0],               # H / M / L
            })
        elif dialect == "annexa_2024":
            rows.append({
                "Pupil's Name": st["name"],
                "Birthdate": st["birthday"].isoformat(),
                "Sex (M/F)": st["sex"],
                "Grade & Section": f"{grade_label(st['grade'], 'num')}-{st['section']}",
                "No. of Decayed Teeth": st["decayed"],
                "No. of Missing Teeth": st["missing"],
                "No. of Filled Teeth": st["filled"],
                "DMF Index": maybe_missing(rng, st["dmf"], 0.05, "N/A"),
                "Gingivitis (1/0)": sparse_bool(rng, st["gingivitis"], "1", "0"),
                "Periodontal Dse (1/0)": sparse_bool(rng, st["periodontal"], "1", "0"),
                "Debris (1/0)": sparse_bool(rng, st["debris"], "1", "0"),
                "Calculus (1/0)": sparse_bool(rng, st["calculus"], "1", "0"),
                "Abnormal Growth (1/0)": sparse_bool(rng, st["abnormal_growth"], "1", "0"),
                "Sugary Bev (1/0)": sparse_bool(rng, st["sugar"], "1", "0"),
                "Tobacco (1/0)": sparse_bool(rng, st["tobacco"], "1", "0"),
                "Allergies": sparse_medical(rng),
                "Visit Date": st["visit"].isoformat(),
                "Risk": {"Low": "LOW", "Medium": "MODERATE", "High": "HIGH RISK"}[st["risk"]],
            })
        elif dialect == "annexa_2025":
            chk = lambda v: "✓" if v else ""
            rows.append({
                "Name": st["name"],
                "DOB": st["birthday"].strftime("%m/%d/%y"),
                "Sex": {"M": "Male", "F": "Female"}[st["sex"]],
                "Grade": grade_label(st["grade"], "num"),
                "Section": st["section"],
                "Decayed": maybe_missing(rng, st["decayed"], 0.04, "-"),
                "Missing": maybe_missing(rng, st["missing"], 0.04, "-"),
                "Filled": maybe_missing(rng, st["filled"], 0.04, "-"),
                "dmf score": st["dmf"],
                "Gingivitis": chk(st["gingivitis"]),
                "Periodontitis": chk(st["periodontal"]),
                "Debris": chk(st["debris"]),
                "Calculus": chk(st["calculus"]),
                "Abnormal Growth": chk(st["abnormal_growth"]),
                "Sugary Drinks": chk(st["sugar"]),
                "Tobacco": chk(st["tobacco"]),
                "Date Examined": st["visit"].strftime("%m/%d/%y"),
                "Caries Risk Assessment": st["risk"],
            })
        elif dialect == "sdhes_2024":
            tf = lambda v: "TRUE" if v else "FALSE"
            rows.append({
                "Learner's Name": st["name"],
                "Birth Date": st["birthday"].strftime("%B %d, %Y"),
                "Sex": {"M": "Male", "F": "Female"}[st["sex"]],
                "Grade Level": grade_label(st["grade"], "long"),
                "Section": st["section"],
                "decayed_count": st["decayed"],
                "missing_count": st["missing"],
                "filled_count": st["filled"],
                "DMFT": maybe_missing(rng, st["dmf"], 0.08),
                "gingivitis": sparse_bool(rng, st["gingivitis"], "TRUE", "FALSE"),
                "periodontal_disease": sparse_bool(rng, st["periodontal"], "TRUE", "FALSE"),
                "debris": sparse_bool(rng, st["debris"], "TRUE", "FALSE"),
                "calculus": sparse_bool(rng, st["calculus"], "TRUE", "FALSE"),
                "abnormal_growth": sparse_bool(rng, st["abnormal_growth"], "TRUE", "FALSE"),
                "sugar_beverages": sparse_bool(rng, st["sugar"], "TRUE", "FALSE"),
                "tobacco_user": sparse_bool(rng, st["tobacco"], "TRUE", "FALSE"),
                "exam_date": st["visit"].strftime("%B %d, %Y"),
                "risk_level": st["risk"],
            })
        else:  # sdhes_2025 — NO risk column at all (tests 21b's rule fallback)
            yn = lambda v: "YES" if v else "NO"
            rows.append({
                "NAME OF LEARNER": st["name"].upper(),
                "BIRTHDAY": st["birthday"].strftime("%m/%d/%Y"),
                "SEX": st["sex"],
                "GRADE": grade_label(st["grade"], "long").upper(),
                "SECTION": st["section"].upper(),
                "D": st["decayed"],
                "M": st["missing"],
                "F": st["filled"],
                "DMF": st["dmf"],
                "GINGIVITIS": sparse_bool(rng, st["gingivitis"], "YES", "NO"),
                "PERIODONTAL": sparse_bool(rng, st["periodontal"], "YES", "NO"),
                "DEBRIS": sparse_bool(rng, st["debris"], "YES", "NO"),
                "CALCULUS": sparse_bool(rng, st["calculus"], "YES", "NO"),
                "ABNORMAL GROWTH": sparse_bool(rng, st["abnormal_growth"], "YES", "NO"),
                "SUGARY DRINKS": sparse_bool(rng, st["sugar"], "YES", "NO"),
                "TOBACCO": sparse_bool(rng, st["tobacco"], "YES", "NO"),
                "DATE OF EXAM": st["visit"].strftime("%m/%d/%Y"),
                "REMARKS": maybe_missing(rng, "for follow-up", 0.85),
            })
    return pd.DataFrame(rows)


FILES = [
    # (filename, dialect, n_rows, grade range (0=K), title rows above header)
    ("BTIS Dental IPTR SY2024-2025.xlsx", "btis_2024", 1800, (0, 10),
     ["BAGONG TANYAG INTEGRATED SCHOOL", "Dental Health Program — IPTR Summary SY 2024-2025", ""]),
    ("BTIS Dental IPTR SY2025-2026.xlsx", "btis_2025", 1800, (0, 10), []),
    ("Annex A - Oral Health Records 2024.xlsx", "annexa_2024", 1200, (0, 6),
     ["Bagong Tanyag Elementary School Annex A — Oral Health Records", ""]),
    ("Annex A - Oral Health Records 2025.xlsx", "annexa_2025", 1200, (0, 6), []),
    ("SDHES Main IPTR 2024.xlsx", "sdhes_2024", 1000, (0, 6), []),
    ("SDHES Main IPTR 2025.xlsx", "sdhes_2025", 1000, (0, 6), []),
]


def main() -> None:
    rng = random.Random(SEED)
    nprng = np.random.default_rng(SEED)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0
    for filename, dialect, n, grades, titles in FILES:
        students = [gen_student(rng, nprng, grades) for _ in range(n)]
        df = build_file(students, dialect, rng)

        # ~15 exact duplicate rows in the no-risk file (real files have these)
        if dialect == "sdhes_2025":
            dupes = df.sample(15, random_state=SEED)
            df = pd.concat([df, dupes], ignore_index=True)
        # summary junk row at the bottom of one file
        if dialect == "sdhes_2024":
            junk = {col: "" for col in df.columns}
            junk["Learner's Name"] = "TOTAL"
            junk["DMFT"] = df["DMFT"].apply(pd.to_numeric, errors="coerce").sum()
            df = pd.concat([df, pd.DataFrame([junk])], ignore_index=True)

        path = OUT_DIR / filename
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, startrow=len(titles), sheet_name="Sheet1")
            ws = writer.sheets["Sheet1"]
            for i, t in enumerate(titles):
                ws.cell(row=i + 1, column=1, value=t)
        total += n
        print(f"wrote {path.name}: {len(df)} rows ({dialect})")
    print(f"\nTotal underlying students: {total}")


if __name__ == "__main__":
    main()
