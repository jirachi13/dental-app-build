# Product

<!-- Written 2026-07-05 for /impeccable. Register/Users/Purpose/Accessibility
     are drawn from CLAUDE.md (authoritative project spec); Brand Personality
     and Anti-references are INFERRED from what the app is — adjust if you
     disagree. This file exists so /impeccable stops re-running its init step. -->

## Register

product

## Users

Internal clinical + administrative staff at the Barangay Tanyag (Taguig City) school dental program — a small team serving ~8,000 student records across three schools. Five roles, each in a task, not browsing:
- **System Admin** — user/account management, audit trail, archive restoration, system settings.
- **Dentist** — patient records, dental charting (tooth-by-tooth, DMF/dmf), treatments, appointments, and validating every predictive caries-risk recommendation before any clinical action.
- **Dental Aide** — patient records, appointments, clinic coordination, two-visit RPC monitoring.
- **School Administrator** — school-scoped reports and dashboards only (no clinical records).
- **Barangay Health Office Staff** — consolidated cross-school reports for City Health Office submission.

Context of use: office/clinic lighting during working hours, primarily desktop/tablet (installable PWA, works offline), often by non-technical and older staff. The job is fast, accurate record work — encode/lookup a student, chart, schedule, track RPC visits, generate a DOH report.

## Product Purpose

FLORAL — a Dental Health Record Management System with Predictive Analytics (undergraduate capstone thesis). It replaces DOH IPTR paper forms with a digital system: student registration + IPTR (medical history, dietary/social habits, oral-health conditions), digital dental charting with DMF/dmf indices, appointment scheduling, two-visit Routine Preventive Care (RPC) monitoring, DOH-aligned report generation, and a machine-learning module that classifies caries risk (High/Medium/Low) as **decision support the dentist must validate** — never an automated clinical decision. Success = staff trust it for daily record-keeping and DOH reporting, and the risk module measurably assists (never replaces) the dentist.

## Brand Personality

*(inferred — adjust)* Trustworthy, clinical, and unadorned. It should feel like a serious government/health records system: calm, legible, and efficient, with the interface disappearing into the task. Institutional confidence over consumer flair. Single-hue blue (`#1E40AF`) identity, familiar patterns, density where the data warrants it.

## Anti-references

*(inferred — adjust)* Should NOT look like a flashy consumer SaaS or marketing site: no gradient text, no hero-metric dashboards, no glassmorphism, no playful/gamified health-app styling, no decorative motion. Familiarity and restraint are features here — surprise is a liability in a clinical tool.

## Design Principles

1. **The dentist decides, the model assists.** Predictive risk is decision support only; every recommendation is validated by a clinician before clinical action, and the UI must make that gate obvious. Never present predictions as conclusions.
2. **Honest empty states, never fabricated data.** If a data source doesn't exist yet (e.g. referrals, session tracking), show a truthful empty state — never placeholder numbers. Trust is the product.
3. **Earned familiarity.** Standard, consistent affordances across every screen; the tool disappears into the task. Delight is reserved for moments, not pages.
4. **Legible under real conditions.** Light-only daytime clarity, WCAG AA contrast, keyboard-operable, readable by older staff — accessibility is a functional requirement, not polish.
5. **Density with hierarchy.** Clinical data is dense (tables, charts, DOH cross-tabs); serve it with clear hierarchy and horizontal scroll rather than hiding or oversimplifying.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Known needs: non-technical and older staff (favor legibility — body text meets 4.5:1, no reliance on faint gray), keyboard operability for all interactive elements including clickable table rows, and reduced-motion-safe interactions. Color is never the sole signal for status (pair with labels/icons). Light theme only by design (daytime clinical use).
