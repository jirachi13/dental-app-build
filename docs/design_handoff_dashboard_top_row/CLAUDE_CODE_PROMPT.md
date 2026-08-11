# Prompt for Claude Code

## Setup first — replace the stale bundle in the repo

⚠ **A copy of this folder is already in the repo at `docs/design_handoff_dashboard_top_row/`
(commit `e2fd18bd`) and it is OUT OF DATE.** It is the round-2 design — its `README.md`
specifies direction 2a (52px amber hero, 340px right column, `radius 14px`, `padding 24px`).
This prompt specifies round 3, a bordered ledger strip (`radius 6px`, `#ECECF0` title bar,
28px cells, RPC value in blue). **They are different designs.** Building the in-repo README
produces the wrong one.

So:

1. Download `design_handoff_dashboard_top_row/` from the design project (it comes as a zip).
2. **Unzip it over `docs/design_handoff_dashboard_top_row/`, replacing the existing folder
   entirely.** Do not merge — replace.
3. Confirm `docs/design_handoff_dashboard_top_row/CLAUDE_CODE_PROMPT.md` and
   `Dentist Dashboard (3a).dc.html` now exist. Neither is in the round-2 copy; their presence
   is how you know the replacement worked.

   ```
   dental-app-build/
   ├─ docs/
   │  └─ design_handoff_dashboard_top_row/     ← replace this whole folder
   │     ├─ README.md
   │     ├─ CLAUDE_CODE_PROMPT.md                ← not in the round-2 copy
   │     ├─ Dentist Dashboard (current).dc.html
   │     ├─ Dentist Dashboard (3a).dc.html        ← not in the round-2 copy
   │     ├─ School Admin Dashboard (current).dc.html
   │     ├─ School Admin Dashboard (3a).dc.html   ← not in the round-2 copy
   │     ├─ BHO Dashboard (current).dc.html
   │     ├─ BHO Dashboard (3a).dc.html            ← not in the round-2 copy
   │     ├─ Dashboard Redesign.dc.html
   │     ├─ Design Report.dc.html
   │     ├─ figures/
   │     ├─ support.js
   │     └─ doc-page.js
   └─ dental-4-12-main/
      └─ project/
         └─ src/app/components/Dashboard.tsx
   ```

4. Open Claude Code at the repo root and paste everything below the horizontal rule.

Every reference below is relative to the repo root, so the folder path is
`docs/design_handoff_dashboard_top_row/`.

Copy everything below the line into Claude Code.

---

## Task

You are implementing an approved design change to the FLORAL dental dashboard. The design work
is finished; this is an implementation job, not a design exploration. Do not redesign anything,
do not "improve" adjacent code, and do not touch anything outside the scope defined below.

**Read `docs/design_handoff_dashboard_top_row/README.md` before writing any code** — but only
after confirming the folder was replaced per the setup step. It carries the reasoning behind each
value.

**On conflicts: this prompt wins, not the README.** That reverses the instruction in an earlier
version. If the README describes an amber hero, a 340px right column, `radius 14px` or
`padding 24px`, you are reading the stale round-2 copy — stop and re-do the replacement.

`HANDOFF.md` item 12 in the repo tracks this work and is more current than any design file.
Read it too.

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
only**. The four-tile grid to replace is at roughly **`:376`**. (`:247–294` is the shared
`StatCard` component and its `STAT_CHIP` map — do not restructure it; other roles still use it.)

Everything below the top row stays exactly as it is: Risk Distribution, Oral Health Trend, RPC
Two-Visit Funnel, Procedures Performed, Validated Risk Assessments, RPC Follow-ups Due.

The same four-box row exists in the other branches at `:644`, `:774`, `:977` and `:1151`. Leave
them alone. Dental aide is a separate sprint; system admin is excluded because three of its four
tiles are literal `"N/A"` — a ruled strip would present three absences as if they were readings.

## Using the design references

The `.dc.html` files in this folder are **design references, not production code**. They are
standalone HTML prototypes — open them in a browser to see the intended result. Do not copy the
HTML into the codebase. Rebuild the design using this project's existing Tailwind classes and
component conventions.

| File | What it shows |
|---|---|
| `Dentist Dashboard (current).dc.html` | The screen as it ships today — the "before" |
| `Dentist Dashboard (3a).dc.html` | **The target.** The full screen with the new top row |
| `School Admin Dashboard (current).dc.html` | School-admin role today |
| `School Admin Dashboard (3a).dc.html` | Same treatment, school-admin role (not in scope yet) |
| `BHO Dashboard (current).dc.html` | BHO role today |
| `BHO Dashboard (3a).dc.html` | Same treatment, BHO role (not in scope yet) |
| `Dashboard Redesign.dc.html` | All explored options across five rounds, with rationale |
| `Design Report.dc.html` | The written design report — brief, method, findings |
| `figures/*.png` | Flat before/after screenshots of all three roles, if the HTML will not open |

`support.js` and `doc-page.js` are runtime files the `.dc.html` prototypes need in order to
render. Keep them in the folder; ignore them otherwise.

## Do not infer the design

Everything you need is specified. If something appears missing:

- **Open `Dentist Dashboard (3a).dc.html` in a browser** and look at it. It is the approved target,
  rendered.
- **If you cannot open HTML, use `figures/dentist-3a.png`** — a flat screenshot of the same screen.
- **If a value is still not determinable, stop and ask.** Do not infer, approximate, or
  substitute a value that seems reasonable.

This design went through five rounds of review. Values that look arbitrary — 10px labels, the 6px
radius, blue on a 17% figure — are decisions, not defaults, and the README gives the reasoning for
each. An inferred approximation will look close and be wrong.

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
| 1 | `users` | Patients enrolled | `6` | 5 screened |
| 2 | `calendar` | Appointments today | `0` | None scheduled |
| 3 | `circle-alert` | High-risk patients | `0` | 2 medium · 3 low |
| 4 | `shield` | RPC completion | `17%` + `1 of 6` | Both visits completed |

Cell 1's context line is **"5 screened"**, not "5 with a validated risk level". Nothing in the data
is validated — see the false-label finding below.

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

No new data fetching — but **three values the design needs are not currently variables**, so this
is not a pure markup swap.

| Value | Status | Action |
|---|---|---|
| `totalPatients` | exists | use directly |
| `todayAppointments` | exists | use directly |
| `highRiskCount` | exists | use directly |
| `rpcCompletionRate` (`:130`) | exists | see denominator warning below |
| Visit-1 count | **inline in the funnel JSX at `:479`** | hoist to component scope |
| Visit-1 rate (the footer's "83%") | **not a variable** | derive from the hoisted count |
| most-overdue days | **not a variable** | `upcomingFollowUps[0].daysUntilDue` — already sorted most-overdue-first at `:204` |

⚠ **Denominator mismatch.** `rpcCompletionRate` (`:130`) divides by `scopedRpc.length` — RPC
*records* — while cell 1 counts `allStudents.length` — *students*. Both are 6 today, so they look
interchangeable; they diverge the moment a student has no RPC record, and Katrina Lopez is already
unscreened. **Label cell 4 off the RPC denominator** so the two never claim to describe the same
set.

Cell 3 keeps the existing conditional: foreground at `0`, `#DC2626` when non-zero.

## Decisions I need from you before wiring

1. **Hero color threshold.** Do not hardcode the RPC color. **Three sources disagree:** the
   codebase's status vocabulary implies red at 17%; the round-2 README specifies amber; the
   approved round-3 design says **blue `#1E40AF`**. Blue is the user's decision — amber already
   means "medium caries risk" and would be overloaded on one screen. Implement blue, but flag it.
2. **`DESIGN.md` needs one line added** — broadening blue to cover *operational state* (progress
   against an administrative target, coverage, completion) while green/amber/red stay
   clinical-severity-only. Wording was drafted 2026-08-10. Propose it; do not edit unilaterally.

## Known issue — fix in a separate commit

One item, unrelated to this redesign. Do not mix it into the redesign commit.

**Bar labels clip at narrow viewports.** In the horizontal bar charts the `n (n%)` label is
absolutely positioned inside an `overflow:hidden` track. Any percentage-based `left`/`right` fails
at some fill/viewport combination — inside the fill clips on short fills, after the fill clips on
long ones. Restructure the row to `label | track (flex:1, min-width:110px) | value`, where the
value is a fixed-width (~68px) right-aligned `flex-shrink:0` sibling **outside** the
`overflow:hidden` element, and the label is `flex:0 1 144px; min-width:0` with ellipsis.

*(An earlier version of this prompt also listed the `STAT_CHIP` missing-yellow-key bug and the
string-in-a-numeric-slot bug. **Both were fixed on 2026-08-05/06** — `Dashboard.tsx:236-242` and
`:269-273`. Do not re-fix them.)*

## Hard rules

- **Never fabricate data.** Zeros render as zeros. Empty states stay empty. `DESIGN.md` forbids
  filling them with plausible numbers.
- Blue `#1E40AF` = operational state, primary action, selection. Green `#15803D` / amber `#B45309`
  / red `#DC2626` = clinical condition only.
- No pie or donut charts, no gradients, no glassmorphism, light theme only, Public Sans throughout.
- Shadows only where an element genuinely occludes content.
- All numerals use `font-variant-numeric: tabular-nums`.

## Two findings to know about — do not fix

**1. The seed-vs-figure risk discrepancy is explained.**
`fig-4.4.1-dashboard-dentist.png` shows 0 High / 2 Medium / 3 Low; `seedStudents.ts` assigns
2 High / 1 Medium / 2 Low + 1 unscreened. **Cause: `seedStudents.ts:61` skips students that
already exist by name**, so editing a `risk:` value never updates an already-seeded record. The
figure captured an earlier DB state. Re-seeding onto a populated DB will not reconcile it. This is
a manuscript decision (recapture the figure or not), not a code fix. Do not attempt to resolve it.

**2. "Validated caries-risk classification" is a false label.**
`Dashboard.tsx:415` gives the Risk Distribution card that title, but `useStudents.ts:80` reads raw
`RiskStratification.risk_level` with **no `validated_at` filter**, and `seedStudents.ts:89` creates
every record without `validated_at`/`validated_by`. Nothing is validated; the card filters for
nothing. This is why cell 1's context line reads "5 screened". Fixing the label vs fixing the
filter yields different figures — flag it, do not decide it.

## When done

Report what changed, what you'd want reviewed before merging, and anything in the spec that did
not survive contact with the codebase. Do not merge to `main`.
