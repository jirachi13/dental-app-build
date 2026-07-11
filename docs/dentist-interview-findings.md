# Dentist Interview — findings vs the built system

Source: AI-transcribed Tagalog/Taglish interview with the Barangay Tanyag school dentist (+ dental aide "Ate Sony"), transcript has inaccuracies — treat quotes as approximate. Cross-checked against the codebase 2026-07-11. This is the proposal-stage requirements interview; most of it is already Chapter 3. Sections below: what's confirmed built, what's NEW and actionable, and what's thesis-writing material.

## Already accounted (interview confirms the build)
- **3 schools, 1 dentist + 1 aide, rotation** — core scope; DentistRotation model exists.
- **Offline input, sync when online; reports submitted online** — Phase 2 PWA (IndexedDB queue, background sync).
- **Charting**: permanent + temporary rows; UPPERCASE = permanent, lowercase = temporary; standard letter codes are non-negotiable ("hindi natin pwedeng baguhin yung standard") with color as a visual aid only — matches the chart (D/M/F/X codes, dmft/DMFT casing, mixed-dentition hint, color palette).
- **SDF (silver diamine fluoride)** named as a real procedure — already in `treatmentCodes` ('SDF'), plus PFS sealant, OP, FV, extraction, fillings.
- **Auto-counting from charting** ("pag pinasok si patient, automatic addition") — DOH report computes from tooth records via `useDohReportData`.
- **Age brackets, not grade levels, for monthly DOH reporting**; she settled on under-5 / 5-9 / 10-14 / 15-19 (+ adults) — `SUMMARY_BRACKETS` matches exactly ('4 yrs & below','5-9','10-14','15-19','20 & above'). Male/female/combined counts — report has M/F per bracket.
- **Monthly report per school + aggregate across schools** — Reports per school; BHO consolidated view.
- **RPC two visits, fluoride 2nd dose 4–6 months after 1st, need a list of who's due** — RPCTracking with the 4–6 month window, early-Visit-2 flag, dashboard follow-ups-due list.
- **Appointments by section/grade, reschedule-not-notify, walk-in emergencies from other grades still counted** — session grouping by section; treatments count in reports regardless of appointment.
- **Consent required beyond oral exam; no consent → not treated/counted; parents have NO system access** — consent_status + consent gating; no parent role.
- **PhilHealth + 4Ps on the record** (she explains why: PhilHealth reporting, 4Ps as no-PhilHealth marker) — Sprint 14 fields.
- **Grade-level color coding** (their paper envelopes are color-coded by grade) — gradeColors/GradePill mirror the physical system.
- **OFC year-over-year progression** (kinder OK → grade 1 has a D → grade 2 D becomes F) — per-year IPTR tabs + DMFT progression table.
- **Supplies inventory explicitly NOT wanted** ("hindi binibilang ang consumables") — validated scope exclusion; we never built it.
- **Lost paper records, aide counts 3 schools alone by hand** — the exact pain points the system solves (see thesis material below).
- **Roles**: dentist + aide input; office secretary receives/generates reports (≈ BHO staff role); health-center reuse noted as future.

## NEW / actionable (not built — backlog candidates, each needs approval)
1. **Risk thresholds from clinical practice (feeds Sprint 21a-d real-data re-run):** her rule is **decayed-count based**: 1–2 D = Low, 3–5 D = Medium, >5 D = High; **decayed teeth contribute, filled do NOT (already treated), missing do NOT (tooth gone)**; gingivitis is a poor-hygiene proxy ("walang taong may gingivitis na walang sira"). Our synthetic labeling rule (High: DMF>4 or periodontal; Medium: DMF 2–4 or gingivitis) uses the DMF *total*, which includes M and F. When real data lands, label on D-count (or justify the difference), and she promised the DOH lecture/study with the official classification — **get that document; it's the citable labeling source Chapter 4 needs.**
2. **Quarterly / semiannual / annual reports**: reporting cadence is monthly → quarterly → semiannual → annual ("i-add lang yung monthly"). Reports today is monthly-only. Cheap version: month-range aggregation over the same `V()` lookup.
3. **RPC school-calendar cutoff**: visit 2 must land within the same school year (June–April) or it can't be reported to DOH/PhilHealth — the 4–6-month window is necessary but not sufficient near year-end (e.g. Visit 1 in December ⇒ visit 2 must fit before April). RPC tracking knows the 4–6mo window but not the school-year boundary. Small flag ("won't fit in school year") on RPCTracking.
4. **The 4–6-month rule is fluoride-specific** — other treatments can happen any time ("strict lang kami sa 4–6 months because of the fluoride"). Our RPC copy implies it's the visit interval generally. Wording tweak at most.
5. **Staff/teachers/faculty also treated and reported in the adult bracket** — students-only is our scope; the '20 & above' summary column exists but there's no way to register a non-student patient. Future work, not a sprint.
6. **Scale-out ambition: 18–25 schools** (their office wants the whole district; "dito muna kami magte-test sa 3") — architecture already multi-school; keep as future work / Chapter 5.

## Thesis-writing material (Chapter 1/4/5)
- **Ch. 1 significance / Ch. 4 discussion — quantified paper pain**: ~40–45 students/section, 4 sections/half-day, 200 students/day during blitzes; Bayanihan events 50–150 patients/day; the aide alone counts every M/F × bracket × procedure by hand across 3 schools; records lost after passing charts through teachers ("nawawala, gagawa na naman kami ng bago"); envelopes color-coded by grade as their only organization system.
- **Ch. 4 predictive-analytics discussion**: compare the model's learned feature importance (`docs/feature-importance.png`) against the clinician heuristic (D-count thresholds, gingivitis proxy, filled/missing non-contributing). Agreement = clinical validity evidence; divergence = discussion point. Also her framing of *why* risk output helps: "kung hindi lumababa ang caries at extractions, walang changes — improve more" (the system as a program-effectiveness feedback loop, not just triage).
- **Ch. 4 validation flow**: she independently confirmed the dentist-validation gate ("kailangan sa akin manggaling ang data… we really need that") — matches the built validate-before-save flow and the adviser's "heavy validation" requirement.
- **Ch. 5 recommendations**: district scale-out (18–25 schools); barangay health center reuse (same reports, wider age brackets: infants + adults); adult/staff patient records; PhilHealth first/second-visit claim tracking; provisioned tablets/laptops (their own budget proposal).
- **ISO 25010 respondent pool confirmed feasible**: dentist + aide + secretary + health-center staff (2 dentists, aide, data manager) + Bayanihan group (10–15) + 2 other district dentists (Doc Liv/Doc Omar, both handling 2–3 schools) ≈ the 30 respondents planned.
- **Known data gap**: Daang Hari main had no records encoded yet at interview time ("wala kang record… pwede niyong gawan") — corroborates the real-IPTR-data hunt.

## User-side follow-ups (no sprint)
- Get from the dentist: the **DOH risk-classification lecture/study** (she'll send it — chase this, it unblocks defensible labeling), the **blank standard forms** she offered, and the promised factor list.
- Send her the questionnaire digitally (she asked for it on her phone).
