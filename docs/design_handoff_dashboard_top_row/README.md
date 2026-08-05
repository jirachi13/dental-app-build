# Handoff: FLORAL Dashboard — Top Row Redesign

> **Read this first.** The `.dc.html` files bundled here are **design references**, not
> production code. They are HTML prototypes that show intended look and behaviour. Your task
> is to recreate the chosen direction inside the existing FLORAL codebase
> (`jirachi13/dental-app-build`, React + TypeScript + Tailwind, `dental-4-12-main/project/`),
> using its established components, tokens and patterns. Do not copy the HTML in.

---

## Overview

The FLORAL dentist dashboard opens with a row of four equal-weight counter cards
(Total Patients, Today's Appointments, High-Risk Patients, RPC Completion Rate). The client's
complaint: this row is what every other capstone group built, and it makes the dashboard
look generic.

The project's own `DESIGN.md` already condemns the pattern — it calls four equal-weight tiles
in a row *"not restraint, [but] the absence of hierarchy — it is why the dashboard currently
reads like every other capstone project."* So this redesign is the design system being
obeyed, not departed from.

**Scope of the recommended change is deliberately narrow:** replace only the strip between
the page title and the first chart row in the dentist dashboard. Everything below it — Risk
Distribution, Oral Health Trend, RPC Two-Visit Funnel, Procedures Performed, Validated Risk
Assessments, RPC Follow-ups Due — stays exactly as it is. No student list and no per-student
detail panel belong on this screen.

## Fidelity

**High-fidelity.** Colors, type sizes, weights, spacing, radii and hover states in the
prototypes are final and were lifted from the live codebase (`theme.css`, `Root.tsx`,
`Dashboard.tsx`, `chartColors.ts`). Recreate pixel-perfectly using the codebase's existing
Tailwind classes and card components. Exact values are listed under **Design Tokens** below.

## Recommended direction: 2a

Three top-row treatments were designed (`2a`, `2b`, `2c` in `Dashboard Redesign.dc.html`).
**Implement 2a.** It removes the templated tile row, earns a single hero reading against a
real named threshold, retains every figure the current screen reports, and is a contained
edit to one JSX block.

`2b` (prose standing line) and `2c` (ruled ledger band) are documented below as alternates in
case the client changes their mind — do not build them unless asked.

---

## Screens / Views

### Dentist Dashboard — top row (the only thing that changes)

**Purpose.** Tell the dentist, on arrival, the one thing that carries a clinical obligation,
and report the three supporting counts without competing for attention.

**Container.** Single card replacing the current 4-column grid.
- `background: #FFFFFF`
- `border: 1px solid rgba(0,0,0,0.1)`
- `border-radius: 14px`
- `padding: 24px`
- `display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 32px; align-items: stretch`
- Sits in the existing `flex flex-col gap-6` page stack, directly below the page header and
  directly above the first chart row. Same vertical rhythm as today (24px gap).

#### Left cell — hero reading

`display: flex; flex-direction: column; gap: 12px`

1. **Heading block**
   - `h2` — "Preventive care compliance" — `14px / 700 / line-height 1.5 / #0F0F11`
     (the codebase's `oklch(0.145 0 0)` foreground)
   - `p` — "Students who completed both RPC visits · every enrolled student by the end of the
     school year" — `11px / 400 / line-height 1.4 / #717182`
   - These two lines match the existing chart-card header pattern exactly.

2. **Figure row** — `display: flex; align-items: flex-end; gap: 14px`
   - Value: `17%` — `52px / 700 / line-height 0.9 / letter-spacing -0.03em /
     font-variant-numeric: tabular-nums / color #B45309`
   - Caption: `1 of 6 students` — `13px / 400 / #717182 / padding-bottom: 6px`
   - The color is amber because the value is below target. Bind it to the status vocabulary
     (see **State** below), do not hardcode amber.

3. **Progress track with threshold marker**
   - Track: `position: relative; height: 28px; background: #ECECF0; border-radius: 8px;
     overflow: hidden; border: 1px solid rgba(0,0,0,0.08)`
   - Fill: `height: 100%; width: 17%; background: #B45309`
   - Marker: `position: absolute; top: 0; bottom: 0; left: 83%; width: 2px; background: #15803D`
     — this is the Visit-1 completion rate, i.e. the reachable ceiling, not the 100% target.
   - Legend row below: `display: flex; justify-content: space-between; margin-top: 6px;
     font-size: 11px; color: #717182`
     - left: `Visit 1 done for 5 of 6 (83%)`
     - right: `Target 100% by end of school year` — `#15803D`, `font-weight: 600`

4. **Explanatory line** — `13px / line-height 1.65 / #717182 / text-wrap: pretty`
   - "One student is 77 days overdue for Visit 2 — that single record is the whole gap
     between 17% and 83%."
   - Must be generated from data, not hardcoded. See **State**.

#### Right cell — three supporting figures

`border-left: 1px solid rgba(0,0,0,0.1); padding-left: 28px; display: flex;
flex-direction: column; justify-content: center; gap: 2px`

Three rows, each:
`display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
padding: 11px 0`
with `border-bottom: 1px solid rgba(0,0,0,0.06)` on the first two only (last row has none).

| Label (13px / 400 / #717182) | Value (20px / 700 / tabular-nums / #0F0F11) |
|---|---|
| Total patients | `6` |
| Appointments today | `0` |
| High-risk patients | `0` |

No icons, no icon chips, no per-row card. The icons are what made the old row read as
templated; dropping them is the point.

**High-risk color rule:** the value stays foreground-colored at `0`. If it becomes non-zero it
takes `#DC2626`. This mirrors the current `Dashboard.tsx` behaviour where the high-risk stat
card is red-valued — keep that conditional, just at 20px instead of 30px.

---

## Interactions & Behavior

Deliberately minimal — this is a reporting surface.

- **No hover state on the container.** The current tile row has
  `hover:shadow-md hover:-translate-y-0.5` on each card; drop it. Nothing here is clickable,
  so nothing should invite a click.
- **The three supporting rows are static text.** If the team wants them navigable later, make
  the whole row a link to Students / Appointments / Risk Classification and add
  `hover:bg-[#EFF6FF]` — but ship it static.
- **Progress fill animation** is optional. If used: `transform: scaleX()` from 0,
  `transform-origin: left`, `700ms cubic-bezier(0.22, 1, 0.36, 1)`, `300ms` delay, once on
  mount. Respect `prefers-reduced-motion`. `DESIGN.md` bans decorative motion, so a single
  entrance grow is the ceiling.
- **Empty / zero states.** Every figure here can legitimately be `0`. Render the zero. Never
  substitute a dash, a placeholder, or a fabricated number — `DESIGN.md` forbids it.
- **No data at all** (no enrolled students): render the container with `—` for the hero value,
  `0 of 0 students`, an empty track, and suppress the explanatory line. Do not hide the card.
- **Responsive.** Below ~1100px the grid collapses to one column; the right cell loses
  `border-left` / `padding-left` and gains `border-top: 1px solid rgba(0,0,0,0.1)` /
  `padding-top: 20px`. The hero value drops to `40px`.

## State Management

All values already exist in `Dashboard.tsx`'s dentist branch. No new fetching required — this
is a presentation change.

| Value | Source | Used for |
|---|---|---|
| `totalPatients` | existing | "Total patients" |
| `todayAppointments` | existing | "Appointments today" |
| `highRiskCount` | existing | "High-risk patients" + red conditional |
| `rpcCompletionRate` | existing | hero value + fill width |
| `rpcBothVisitsCount` / `totalPatients` | existing | "1 of 6 students" |
| `rpcVisit1Rate` | existing (funnel already computes it) | threshold marker `left: %` + legend |
| most-overdue student's `daysOverdue` | existing (Follow-ups Due card already computes it) | explanatory line |

**Hero color binding.** Do not hardcode `#B45309`. Derive from the status vocabulary already
in the codebase:

```
rate >= 100  → #15803D  (green — target met)
rate >= 50   → #B45309  (amber — progressing)
rate <  50   → #DC2626  (red — critical)
```

At the current seeded value (17%) this yields red, not amber. **The prototype shows amber
deliberately** — the client should confirm which threshold they want before you wire it.
Flag this rather than guessing.

**Explanatory line** should be templated, e.g.
`One student is {days} days overdue for Visit {n} — that single record is the whole gap
between {rate}% and {visit1Rate}%.`
Pluralize, and suppress the sentence entirely when nothing is overdue.

---

## Design Tokens

All from `theme.css` / `chartColors.ts` / `Root.tsx`. Introduce nothing new.

**Colors**

| Token | Hex | Use |
|---|---|---|
| Primary blue | `#1E40AF` | primary action, selection, active nav |
| Blue hover | `#1D4ED8` | primary hover |
| Blue tint | `#EFF6FF` | selected/hover surface, icon chip bg |
| Foreground | `oklch(0.145 0 0)` (`#0F0F11`) | headings, values |
| Muted foreground | `#717182` | labels, captions, secondary copy |
| Surface | `#FFFFFF` | cards |
| Page background | `#F4F6FA` | app canvas |
| Neutral track | `#ECECF0` | progress track, table header |
| Success | `#15803D` | low risk, target met, threshold marker |
| Warning | `#B45309` | medium risk, progressing |
| Warning surface | `#FFFBEB` | amber card fill (2c only) |
| Warning border | `#FDE68A` | amber card border (2c only) |
| Danger | `#DC2626` | high risk, overdue, critical |
| Danger surface | `#FEF2F2` | red chip fill |
| Border | `rgba(0,0,0,0.1)` | card borders, rules |
| Border subtle | `rgba(0,0,0,0.06)` | inner row rules |

**Typography** — Public Sans throughout (already loaded).

| Role | Size / weight / other |
|---|---|
| Page title | 24px / 700 / lh 1.5 |
| Page subtitle | 14px / 400 / lh 1.5 / muted |
| Card heading | 14px / 700 / lh 1.5 |
| Card subheading | 11px / 400 / lh 1.4 / muted |
| Hero value | 52px / 700 / lh 0.9 / ls -0.03em / tabular-nums |
| Supporting value | 20px / 700 / tabular-nums |
| Body | 13px / 400 / lh 1.65 |
| Label | 13px / 400 / muted |
| Caption / legend | 11px / 400 / muted |

All numerals use `font-variant-numeric: tabular-nums`.

**Spacing** — 2px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px, 28px, 32px.
Card padding 24px. Grid gap 32px. Page section gap 24px.

**Radii** — 6px (bars), 8px (progress track), 10px (buttons, chips), 14px (cards),
9999px (pills).

**Shadows** — none on this component. `DESIGN.md` allows shadow only where an element
genuinely occludes content (dropdowns, modals). The removal of `shadow-sm` from the tile row
is intentional.

---

## Alternates (do not build unless asked)

**2b · Standing line.** No cards. The clinic's standing as one 24px sentence
(`line-height 1.55`, `max-width 1000px`, `#717182`) with figures set inline as
`font-weight 700` colored spans, followed by three outline link-buttons (Open RPC Tracking /
Risk Classification / Students — `13px/600`, `padding 7px 14px`, `radius 10px`; the first
`border: 1px solid #1E40AF; color: #1E40AF`, the others `border: 1px solid rgba(0,0,0,0.14);
color: #717182`). Most distinct from other groups' work; most dependent on copy quality.

**2c · Ruled ledger band.** One white card, `grid-template-columns: 1.6fr 1fr 1fr 1fr`,
`overflow: hidden`, 1px column rules. First column is the amber "Needs attention" cell
(`background: #FFFBEB`, 11px/600 uppercase `letter-spacing 0.04em` `#B45309` eyebrow, 40px
value, 8px progress track with the same 83% marker). Remaining three columns:
`padding 20px 24px`, 12px muted label, 28px/700 value, 11px muted context line. Same
footprint as today; lowest-risk change to implement.

---

## Assets

- **Icons** — Lucide, already a dependency (`Root.tsx` imports it). The recommended top row
  uses **no icons at all**. Prototype SVG geometry was lifted from `lucide-icons/lucide` for
  the surrounding chrome only.
- **Font** — Public Sans, already loaded.
- **No images.** Nothing new to add to the repo.

## Files in this bundle

| File | What it is |
|---|---|
| `Dashboard Redesign.dc.html` | All six directions. Turn 2 (`2a`/`2b`/`2c` — top row only) is at the top; turn 1 (`1a`/`1b`/`1c` — whole-dashboard explorations, superseded) below. |
| `Dentist Dashboard (current).dc.html` | Faithful recreation of the shipped dentist dashboard. The before-state baseline. |
| `School Admin Dashboard (current).dc.html` | Faithful recreation of the school-admin dashboard. |
| `Design Report.dc.html` | The design report: brief, method, five findings, rationale for each direction. |
| `doc-page.js` | Runtime for `Design Report.dc.html` only. Not part of the design. |

Open any `.dc.html` directly in a browser.

## Target files to change

- `dental-4-12-main/project/src/app/components/Dashboard.tsx` — the dentist branch's stat-card
  grid. This is the only file the recommended change touches.

## Known issues found while reading the codebase

Two things worth fixing independently of this redesign:

1. **`STAT_CHIP` has no yellow key.** The School Admin dashboard's "Upcoming Visits" card
   passes `color="text-yellow-600"`, but `STAT_CHIP` has no entry for it, so the tile silently
   falls back to blue. The code says yellow; the screen says blue. Either add the key or
   change the call site.
2. **A string in a numeric slot.** That same card's value is the string `"None scheduled"`
   rendered at `30px / 800` in a slot designed for a numeral, so it visually shouts louder
   than the real figures beside it. Render non-numeric states at body size.

## Out of scope

- The Barangay Health Office dashboard branch was not recreated (its source was truncated on
  read). If BHO needs the same treatment, ask for it.
- Once monthly DMFT snapshots accumulate, mean DMFT against the WHO benchmark of 3.0 becomes
  the stronger hero reading and should replace RPC compliance. Build 2a so the hero block can
  be swapped without touching the supporting column.
- The deployed model is still trained on synthetic placeholder data. Confidence figures shown
  anywhere in these prototypes are real model output but not yet clinically meaningful, and
  the synthetic-data disclaimer must stay visible wherever they appear.
