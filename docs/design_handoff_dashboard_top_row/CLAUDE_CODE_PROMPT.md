# Prompt for Claude Code

## Setup first — get this folder into your repo

This folder currently lives in the **design project**, not in your codebase. Before using the
prompt:

1. Download `design_handoff_dashboard_top_row/` from the design project (it comes as a zip).
2. Unzip it into the **root of your local `dental-app-build` clone**, so the path is:

   ```
   dental-app-build/
   ├─ design_handoff_dashboard_top_row/     ← here
   │  ├─ README.md
   │  ├─ CLAUDE_CODE_PROMPT.md
   │  ├─ Dentist Dashboard (current).dc.html
   │  ├─ Dentist Dashboard (3a).dc.html
   │  └─ …
   └─ dental-4-12-main/
      └─ project/
         └─ src/app/components/Dashboard.tsx
   ```

3. Open Claude Code in `dental-app-build/`.
4. Paste everything below the horizontal rule.

Every path in the prompt is relative to the repo root on that basis. If you put the folder
somewhere else, adjust the paths accordingly.

The folder is design reference material — it does not need to be committed. If you would rather
keep it out of the repo entirely, add it to `.gitignore`, or keep it beside the repo and give
Claude Code the absolute path instead.

Copy everything below the line into Claude Code.

---

## Task

You are implementing an approved design change to the FLORAL dental dashboard. The design work
is finished; this is an implementation job, not a design exploration. Do not redesign anything,
do not "improve" adjacent code, and do not touch anything outside the scope defined below.

**Read `design_handoff_dashboard_top_row/README.md` in full before writing any code** (the folder
is at the repo root, alongside `dental-4-12-main/`). It is the spec — exact colors, type sizes,
spacing, state sources, responsive rules, and rollback are all defined there. This prompt
summarises it; the README wins on any conflict.

## Repository context

- Repo: `jirachi13/dental-app-build`
- App root: `dental-4-12-main/project/`
- Stack: React + TypeScript + Tailwind, Vite, Express/Mongoose backend
- **`DESIGN.md` in this repo is the binding visual system.** Do not introduce colors, type sizes,
  spacing steps, radii or shadows that are not already in it.

## Why this change

The dentist dashboard opens with four equal-weight counter cards — Total Patients, Today's
Appointments, High-Risk Patients, RPC Completion Rate — each a white `rounded-xl` card with
`shadow-sm`, a 36px tinted icon chip, a 30px extrabold value, and a hover lift.

`DESIGN.md` already condemns this pattern, calling four equal-weight tiles in a row *"not
restraint, [but] the absence of hierarchy — it is why the dashboard currently reads like every
other capstone project."* So this change enforces the design system rather than departing from it.

Three of the four figures are answers the dentist does not need at a glance, and two of them are
zero. The one figure carrying a clinical obligation — 17% RPC completion, with a student 77 days
overdue — sits fourth at the same weight as a count of zero.

## Before you start

```
git checkout main
git pull
git tag pre-dashboard-redesign
git push origin pre-dashboard-redesign
git checkout -b dashboard-top-row
```

**Never commit this work to `main`.** The tag is the revert point. If the change is rejected,
`git checkout main` restores the current dashboard exactly — nothing here is destructive.

## Scope

**One file:** `dental-4-12-main/project/src/app/components/Dashboard.tsx`, the **dentist branch
only** (`user?.role === 'dentist'`, around L336), specifically the `StatCard` grid at roughly
L247–294.

Everything below the top row stays exactly as it is: Risk Distribution, Oral Health Trend, RPC
Two-Visit Funnel, Procedures Performed, Validated Risk Assessments, RPC Follow-ups Due.

Do not modify the `dental_aide` (L611), `school_admin` (L717), `bho_staff` (L908) or
`system_admin` (L1081) branches. They have the same four-box pattern and will be done separately.

## Using the design references

The `.dc.html` files in this folder are **design references, not production code**. They are
standalone HTML prototypes — open them in a browser to see the intended result. Do not copy the
HTML into the codebase. Rebuild the design using this project's existing Tailwind classes and
component conventions.

| File | What it shows |
|---|---|
| `Dentist Dashboard (current).dc.html` | The screen as it ships today — the "before" |
| `Dentist Dashboard (3a).dc.html` | **The target.** The full screen with the new top row |
| `School Admin Dashboard (3a).dc.html` | Same treatment, school-admin role (not in scope yet) |
| `BHO Dashboard (3a).dc.html` | Same treatment, BHO role (not in scope yet) |
| `Dashboard Redesign.dc.html` | All explored options across five rounds, with rationale |
| `Design Report.dc.html` | The written design report — brief, method, findings |

## What to build

Replace the 4-column `StatCard` grid with a single bordered block.

**Container**
- `background: #FFFFFF`, `border: 1px solid rgba(0,0,0,0.14)`, `border-radius: 6px`,
  `overflow: hidden`
- Sits in the existing page stack, directly below the page header, directly above the first chart
  row, with the same 24px gap as today

**Title bar**
- `background: #ECECF0`, `border-bottom: 1px solid rgba(0,0,0,0.14)`, `padding: 9px 16px`
- Left: `Clinic summary` — 11px / 700 / `letter-spacing: 0.06em` / uppercase / foreground
- Right: the date, e.g. `Tuesday, 28 July 2026` — 11px / 600 / `letter-spacing: 0.04em` /
  uppercase / `#717182`
- The date moves here from the page header, so remove the right-aligned
  "Tuesday, July 28 / 0 appointments today" block from the header

**Four cells** — `display: grid; grid-template-columns: repeat(4, minmax(0,1fr))`, each
`padding: 14px 16px`, first three with `border-right: 1px solid rgba(0,0,0,0.1)`

Each cell contains, in order:

1. A label row — `display: flex; align-items: center; justify-content: space-between; gap: 8px;
   margin-bottom: 6px`
   - Left: a 14px Lucide icon in `#717182` (`stroke-width: 2`), then the field label at
     10px / 700 / `letter-spacing: 0.06em` / uppercase / `#717182`, gap 7px
   - Right: a 12px `chevron-right` in `#1E40AF` (`stroke-width: 2.5`) — the click affordance
2. The value — 28px / 700 / `line-height: 1` / `font-variant-numeric: tabular-nums`
3. A context line — 11px / `#717182` / `margin-top: 6px`

| Cell | Icon | Label | Value | Context line |
|---|---|---|---|---|
| 1 | `users` | Patients enrolled | `6` | 5 with a validated risk level |
| 2 | `calendar` | Appointments today | `0` | None scheduled |
| 3 | `circle-alert` | High-risk patients | `0` | 2 medium · 3 low |
| 4 | `shield` | RPC completion | `17%` + `1 of 6` | Both visits completed |

Cell 4's value row is `display: flex; align-items: baseline; gap: 8px` — the percentage at 28px
in `#1E40AF`, then `1 of 6` at 11px in `#717182`.

**Footer line**
- `border-top: 1px solid rgba(0,0,0,0.1)`, `padding: 9px 16px`, 11px, `#717182`
- Text: `1 student 77 days overdue for Visit 2 · Visit 1 done for 5 of 6 (83%) · target 100% by
  end of school year`
- The first clause only — "1 student 77 days overdue for Visit 2" — is `#1E40AF` and
  `font-weight: 600`. The rest is muted.
- Generate this from data; suppress the overdue clause entirely when nothing is overdue.

**No icon chips, no tinted squares, no per-cell card, no shadow.** Those are what made the old row
read as templated. The icons stay, but muted and inline.

## Interaction

- **Keep the cells navigable.** `StatCard` currently renders as a `<Link>` when `linkTo` is
  passed. Every figure that has a `linkTo` today must remain a link.
- **Replace the affordance, not the behaviour.** Drop `hover:shadow-md hover:-translate-y-0.5`.
  Use a cell tint instead: `hover:bg-[#EFF6FF]` with `transition-colors 150ms`, matching the
  `hover:bg-gray-50` row pattern already used in `RPCTracking.tsx` and `StudentListTableStyles.ts`.
- **Add a visible focus ring:** `outline: 2px solid #1E40AF; outline-offset: -2px`. These are
  links and the current row relies on the browser default.
- Cells without a `linkTo` omit the chevron and take no hover state.
- **No hover state on the container itself.** Nothing about the block as a whole is clickable.
- Optional entrance animation on any progress fill: `transform: scaleX()` from 0,
  `transform-origin: left`, `700ms cubic-bezier(0.22, 1, 0.36, 1)`, once on mount, respecting
  `prefers-reduced-motion`. `DESIGN.md` bans decorative motion, so that is the ceiling.

## State

No new data fetching. Every value already exists in the dentist branch.

| Value | Existing source | Used for |
|---|---|---|
| `totalPatients` | existing | Cell 1 |
| `todayAppointments` | existing | Cell 2 |
| `highRiskCount` | existing | Cell 3 + its red conditional |
| `rpcCompletionRate` | existing | Cell 4 |
| `rpcBothVisitsCount` | existing | "1 of 6" |
| `rpcVisit1Rate` | computed by the funnel card | footer "83%" |
| most-overdue `daysOverdue` | computed by the Follow-ups card | footer overdue clause |

Cell 3 keeps the existing conditional: foreground at `0`, `#DC2626` when non-zero.

## Decisions I need from you before wiring

1. **Hero color threshold.** Do not hardcode the RPC color. The codebase's status vocabulary
   implies `>=100 → #15803D`, `>=50 → #B45309`, `<50 → #DC2626`, which makes 17% **red**. The
   approved mock shows it in **blue** (`#1E40AF`), because blue was assigned to operational state
   and green/amber/red reserved for clinical condition — otherwise amber means both "medium caries
   risk" and "behind on paperwork" on the same screen. Implement blue as specified, but flag this
   so I can confirm.
2. **`DESIGN.md` needs one line added** — blue currently means only "primary action and selection";
   it now also carries operational status. Propose the wording, do not edit it unilaterally.

## Known issues — fix in separate commits

Found while reading the code, unrelated to this redesign. Do not mix them into the redesign commit.

1. **`STAT_CHIP` has no yellow key.** The School Admin "Upcoming Visits" card passes
   `color="text-yellow-600"`, but `STAT_CHIP` has no entry for it, so the tile silently falls back
   to blue. The code says yellow; the screen renders blue.
2. **A string in a numeric slot.** That same card's value is the string `"None scheduled"` rendered
   at 30px/800 in a slot designed for a numeral, so it shouts louder than the real figures beside
   it. Render non-numeric states at body size.
3. **Bar labels clip at narrow viewports.** In the horizontal bar charts the `n (n%)` label is
   absolutely positioned inside an `overflow:hidden` track. Any percentage-based `left`/`right`
   fails at some fill/viewport combination — inside the fill clips on short fills, after the fill
   clips on long ones. Restructure the row to `label | track (flex:1, min-width:110px) | value`,
   where the value is a fixed-width (~68px) right-aligned `flex-shrink:0` sibling **outside** the
   `overflow:hidden` element, and the label is `flex:0 1 144px; min-width:0` with ellipsis.

## Hard rules

- **Never fabricate data.** Zeros render as zeros. Empty states stay empty. `DESIGN.md` forbids
  filling them with plausible numbers.
- Blue `#1E40AF` = operational state, primary action, selection. Green `#15803D` / amber `#B45309`
  / red `#DC2626` = clinical condition only.
- No pie or donut charts, no gradients, no glassmorphism, light theme only, Public Sans throughout.
- Shadows only where an element genuinely occludes content.
- All numerals use `font-variant-numeric: tabular-nums`.

## Unresolved data question — do not fix, just confirm

`server/scripts/seedStudents.ts` assigns **2 High / 1 Medium / 2 Low** at Bagong Tanyag Integrated
(Aldrin Villanueva and Trisha Santos are High). But `docs/figures/fig-4.4.1-dashboard-dentist.png`
shows **0 High / 2 Medium / 3 Low** for those same five students. The totals agree, the tiers do
not.

Likely the Risk Distribution card reads dentist-validated risk rather than
`RiskStratification.risk_level`. Please check which source it reads and report back — this is a
data-integrity question, not a design one, and it affects a figure in the manuscript.

## When done

Report what changed, what you'd want reviewed before merging, and anything in the spec that did
not survive contact with the codebase. Do not merge to `main`.
