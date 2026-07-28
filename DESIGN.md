---
name: FLORAL
description: Dental Health Record Management System with Predictive Analytics — Barangay Tanyag school dental clinics
colors:
  official-blue: "#1E40AF"
  official-blue-deep: "#1D4ED8"
  filed-blue: "#EFF6FF"
  ledger-paper: "#F4F6FA"
  form-white: "#FFFFFF"
  ink: "oklch(0.145 0 0)"
  annotation-gray: "#717182"
  rule-line: "rgba(0, 0, 0, 0.1)"
  muted-fill: "#ECECF0"
  fit-green: "#15803D"
  fit-green-surface: "#F0FDF4"
  watch-amber: "#B45309"
  watch-amber-surface: "#FFFBEB"
  alert-red: "#DC2626"
  alert-red-surface: "#FEF2F2"
  destructive-crimson: "#D4183D"
  survey-teal: "#0D9488"
  survey-orange: "#EA580C"
  unassessed-gray: "#9CA3AF"
typography:
  headline:
    fontFamily: "'Public Sans Variable', system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "normal"
  title:
    fontFamily: "'Public Sans Variable', system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "'Public Sans Variable', system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'Public Sans Variable', system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  reading:
    fontFamily: "'Public Sans Variable', system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.official-blue}"
    textColor: "{colors.form-white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.official-blue-deep}"
    textColor: "{colors.form-white}"
  button-secondary:
    backgroundColor: "{colors.form-white}"
    textColor: "{colors.official-blue}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.filed-blue}"
    textColor: "{colors.official-blue}"
  card:
    backgroundColor: "{colors.form-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.form-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  nav-item:
    backgroundColor: "{colors.form-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "12px 16px"
  nav-item-active:
    backgroundColor: "{colors.official-blue}"
    textColor: "{colors.form-white}"
    typography: "{typography.body}"
    padding: "12px 16px"
  table-header-cell:
    backgroundColor: "{colors.muted-fill}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "12px 16px"
  chip-risk-high:
    backgroundColor: "{colors.alert-red-surface}"
    textColor: "{colors.alert-red}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: FLORAL

## 1. Overview

**Creative North Star: "The Clinical Ledger"**

FLORAL replaced a stack of DOH paper IPTR forms, and the interface has not
forgotten it. The ledger is the ancestor: ruled lines, ordered columns, a
designated place for every field, and an official blue stamp used sparingly
enough that it still means something. The system's job is to make that ledger
fast and trustworthy — searchable, arithmetic-free, impossible to lose — without
pretending it is something more fashionable than a government health record.

The register is product, not brand. Staff arrive in a task: encode a student,
chart a mouth tooth by tooth, check who still owes a second preventive-care
visit, produce a DOH report. Nothing here is browsed for pleasure. The interface
earns trust by being predictable across every screen and by disappearing into
the work, which means consistency beats novelty every time. Density is not a
failure state; clinical data is genuinely dense, and flattening a 77-column DOH
cross-tab into something airy would destroy it.

This system explicitly rejects consumer polish. Per PRODUCT.md it must never
read as flashy consumer SaaS or a marketing site — no gradient text, no
glassmorphism, no playful or gamified health-app styling, no decorative motion.
It is light-only by deliberate choice: daytime clinical use under office
lighting, often by older and non-technical staff, where legibility outranks
atmosphere. Surprise is a liability in a tool that records a child's health.

**Key Characteristics:**
- Ruled, not floating — borders and tonal fills carry structure; shadows are near-absent
- One official accent (`#1E40AF`), reserved for primary action, current selection, and state
- Semantic color vocabulary where green/amber/red always mean the same clinical thing
- Public Sans throughout — the US federal typeface, institutional and highly legible
- Honest by construction: empty states say "none yet", never a plausible-looking zero
- Density with hierarchy; horizontal scroll over hiding data

## 2. Colors

A restrained institutional palette: one official blue doing all the brand work,
a cool paper ground, and a three-tier clinical status vocabulary that never
drifts.

### Primary

- **Official Blue** (`#1E40AF`): The stamp. Primary buttons, the active
  navigation item's fill, focus rings, the FLORAL wordmark, and the primary data
  series in every chart. Used on roughly a tenth of any given screen — its
  scarcity is what makes it read as official rather than decorative.
- **Official Blue Deep** (`#1D4ED8`): Hover state on primary buttons only. Never
  a resting color.
- **Filed Blue** (`#EFF6FF`): The pale institutional wash. Navigation hover,
  selected rows, informational banners, the current-school indicator, and
  secondary-button hover. This is how the system says "this one" without shouting.

### Secondary

- **Survey Teal** (`#0D9488`) and **Survey Orange** (`#EA580C`): Categorical
  series in DOH demographic reporting only, where a chart genuinely needs
  distinguishable non-status categories (age bracket, sex). Never used for
  clinical status, and never as decoration.

### Neutral

- **Ledger Paper** (`#F4F6FA`): The page ground. Cool-biased on purpose — a
  deliberate rejection of the warm cream/sand default. The app should feel like
  a form under fluorescent clinic light, not parchment.
- **Form White** (`#FFFFFF`): Every card, table, panel, and drawer sits on pure
  white against the paper ground. The one-step tonal lift from ground to surface
  is the primary depth mechanism in the entire system.
- **Ink** (`oklch(0.145 0 0)`): Near-black body and heading text. The canonical
  value is OKLCH here because that is how the codebase declares it.
- **Annotation Gray** (`#717182`): Secondary text — captions, subtitles, column
  labels, timestamps. Meets 4.5:1 on white. It is the marginal note, never the
  entry itself.
- **Rule Line** (`rgba(0, 0, 0, 0.1)`): Every border, divider, and table rule.
  Deliberately a transparency rather than a solid gray so it sits correctly on
  both the paper ground and white surfaces.
- **Muted Fill** (`#ECECF0`): Table header bands and inert fills.
- **Unassessed Gray** (`#9CA3AF`): Charts only — the "not yet screened / no
  reading" series. Grayness is the message.

### Tertiary — the clinical status vocabulary

Three tiers, fixed meanings, no exceptions. Each is a solid for text, icons, and
borders on white, paired with a light surface fill for banners and rows.

- **Fit Green** (`#15803D`) on **Fit Green Surface** (`#F0FDF4`): Completed,
  orally fit, low risk, synced.
- **Watch Amber** (`#B45309`) on **Watch Amber Surface** (`#FFFBEB`): Medium
  risk, pending, deadline approaching, degraded.
- **Alert Red** (`#DC2626`) on **Alert Red Surface** (`#FEF2F2`): High risk,
  overdue, failed, needs treatment.

### Named Rules

**The One Stamp Rule.** Official Blue marks primary action, current selection,
and state — nothing else. The moment it appears as decoration, a divider tint, or
a background wash for visual interest, it stops reading as official and the
system loses its only piece of institutional authority.

**The Fixed Meaning Rule.** Green, amber, and red carry clinical status and
nothing else. Green never means "brand", amber never means "highlight", red
never means "emphasis". A user must be able to learn the three colors once, on
one screen, and be correct everywhere else forever. All chart color comes from
`src/app/utils/chartColors.ts` — charts never invent their own hues.

**The One Red Rule.** There is exactly one red: Alert Red (`#DC2626`).
`--destructive` and `CHART.danger` now hold the same value and must be kept in
step. The system previously carried a second, near-identical crimson
(`#D4183D`) inherited from the Figma prototype — close enough to look like a
rendering bug, far enough apart to be visible when adjacent. It was removed on
2026-07-28. Never reintroduce a second red.

**The No-Dead-Tokens Rule.** `theme.css` contains only tokens that screens
actually consume. Roughly twenty-three prototype leftovers — `--chart-1` through
`--chart-5` (a rainbow fully superseded by `chartColors.ts`), the entire
`--sidebar-*` family, `--popover*`, `--secondary*`, `--accent*`,
`--card-foreground`, `--destructive-foreground`, `--switch-background`, and
`--input-background` — were deleted on 2026-07-28 after grepping every
corresponding utility class and finding zero uses. The theme file is meant to be
readable as the actual system: if a token is added, a screen must use it.

## 3. Typography

**Display Font:** none — this system has no display face by design.
**Body Font:** Public Sans Variable (with `system-ui`, `-apple-system`, sans-serif)
**Label/Mono Font:** none distinct; tabular numerals are enabled locally where digits must align.

**Character:** One family, many weights. Public Sans is the United States federal
government typeface — institutional, quietly distinctive, and drawn for
legibility at small sizes by readers who are not looking for a reading
experience. It gives the app a type identity instead of defaulting to the
operating system's Segoe UI, without ever calling attention to itself. Product
UI does not need a display/body pairing, and a second family here would read as
decoration.

### Hierarchy

The base is 16px with a tight scale; contrast comes from weight far more than size.

- **Headline** (700, 1.5rem/24px, 1.5): Page titles only — one per screen.
- **Title** (600, 1.125rem/18px, 1.5): Card and section headings.
- **Body** (400, 0.875rem/14px, 1.5): The workhorse. Table cells, form values,
  descriptions, list rows. Most of the interface is this size.
- **Label** (500, 0.75rem/12px, 1.4): Column headers, chips, captions, badges,
  timestamps, and the explanatory subtitles beneath card headings (which drop to
  11px where space is tight).
- **Reading** (700, 1.5rem/24px, 1.2, tabular): A single measured number
  presented as a clinical reading — a count, an index, a completion percentage.

### Named Rules

**The Weight-Before-Size Rule.** Hierarchy is built by moving 400 → 500 → 600 →
700 before reaching for a larger size. A product UI has far more type elements
than a landing page; exaggerated size contrast turns into noise. If a heading
needs more presence, add weight first.

**The Tabular Digit Rule.** Any number that sits in a column, updates in place,
or is compared against another number uses tabular numerals. Counts jittering as
digits change reads as instability in a records system.

**The Fixed Scale Rule.** Sizes are fixed rem steps, never `clamp()`. Staff view
at consistent DPI on clinic desktops, and fluid type that shrinks inside a panel
looks broken, not responsive. Responsive behavior here is structural — the
sidebar becomes a drawer — never typographic.

## 4. Elevation

This system is flat, and the flatness is the ledger metaphor doing its work.
Depth comes almost entirely from tonal layering: white surfaces on the cool
Ledger Paper ground, separated by a one-pixel Rule Line. A page of stacked cards
has no shadows at all. Shadow is reserved for genuine occlusion — an element that
has physically left the page and is floating above it — which in practice means
exactly three things: modals, toasts, and dropdown menus.

### Shadow Vocabulary

- **Floating panel** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`):
  Modal dialogs only, over a `rgb(0 0 0 / 0.5)` backdrop.
- **Transient surface** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`):
  Toasts and open dropdown menus — things that appear, are read, and leave.
- **Affordance nub** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): The one
  exception at rest — the sidebar collapse toggle, which straddles the sidebar
  edge and needs the faintest lift to read as a control rather than an artifact.

### Named Rules

**The Ruled-Not-Floating Rule.** Structure is drawn with borders and tonal fills,
never with shadow. If a card needs to feel separated from its neighbour, the
answer is spacing or a rule line — not elevation. A page where cards cast shadows
is a page that has drifted toward consumer SaaS.

**The Occlusion Test.** Before adding a shadow, ask whether the element genuinely
covers content the user could otherwise interact with. If it does not, it is on
the page, and things on the page do not cast shadows.

**The Z-Scale Rule.** Stacking is a fixed semantic ladder, never ad-hoc numbers:
sticky top bar (30) → drawer backdrop (40) → drawer and toasts (50) → native
`<dialog>` (browser top layer). Values like 999 are forbidden.

## 5. Components

### Buttons

Rectangular with gently curved corners, compact, text-led. They look like form
controls, because that is what they are.

- **Shape:** Gently curved (10px radius), padding `8px 16px`, body size at weight 500.
- **Primary:** Official Blue fill, white text. One per view — the single most
  likely next action.
- **Secondary:** White fill, Official Blue text and 1px Official Blue border.
  Hover fills with Filed Blue.
- **Tertiary / ghost:** Annotation Gray text, no border; hover fills with Muted
  Fill. Used for icon-and-label actions in chrome.
- **Destructive:** Alert Red text on white, hover fills with Alert Red Surface.
  Destructive actions are never a solid red button — a red fill reads as a
  primary action and invites the misclick it should prevent.
- **Hover / Focus:** 200ms color transition. Focus shows a 2px Official Blue ring;
  the ring is never removed without a visible replacement.
- **Disabled:** 60% opacity, cursor default. Loading states replace the label
  with present-tense progress text ("Changing…", "Assessing 3/12…"), never a
  bare spinner.

### Cards / Containers

- **Corner Style:** Generously curved (14px radius) — the most curved thing in
  the system, which is what distinguishes a surface from a control.
- **Background:** Form White on the Ledger Paper ground.
- **Shadow Strategy:** None. See Elevation.
- **Border:** 1px Rule Line, always.
- **Internal Padding:** 16px, rising to 24px for major panels. Card headings pair
  a Title with an 11–12px Annotation Gray subtitle that states what the card
  actually measures.
- **Nested cards are forbidden.** A card inside a card means the hierarchy is
  wrong; use a rule line or a spacing break.

### Tables

The signature surface of a records system, and the ledger made literal.

- **Container:** Card shell (14px radius, Rule Line border) with the corners
  clipped so rows meet the edge cleanly.
- **Header:** Muted Fill band, body size at weight 600, left-aligned, `12px 16px`
  cell padding.
- **Rows:** Divided by a 1px hairline rule, `12px 16px` cells. The first cell is
  Ink at weight 500; subsequent cells are Annotation Gray.
- **Hover:** A near-imperceptible gray wash. Clickable rows are keyboard-operable
  and carry a real focus state — a row that responds to click but not to Enter is
  a defect.
- **Overflow:** Wide tables scroll horizontally inside their own container. The
  page itself never scrolls sideways. Data is never hidden or truncated away to
  achieve a narrower table.

### Inputs / Fields

- **Style:** White fill, 1px Rule Line border, gently curved (10px), `8px 16px`
  padding, body size.
- **Focus:** Border goes transparent and a 2px Official Blue ring takes over.
- **Error:** Field-level messages are bare Alert Red text beneath the input.
  Section-level messages use the Notice banner instead.
- **Labels:** Always visible above the field at weight 500. Placeholder text is
  never a substitute for a label, and placeholders meet the same 4.5:1 contrast
  as body text.

### Chips / Badges

- **Style:** Fully rounded (pill), label size at weight 500–700, `2px 8px`
  padding, status surface fill with matching status text color.
- **State:** Risk level, appointment status, sync state, and the "AI-suggested"
  and "edited" markers on validated predictions. Color is never the sole signal —
  every chip carries its word.

### Notices

Inline section-level banners in three variants (error, success, warning), each a
status surface fill with a matching 1px border, status text, a leading icon, and
a 10px radius. Errors carry `role="alert"`; the others `role="status"`.

### Navigation

- **Desktop (≥768px):** A fixed 220px left rail on white, collapsible to a 60px
  icon-only rail whose state persists across visits. Items are icon-plus-label at
  `12px 16px`; the active item takes a full Official Blue fill with white text —
  the single largest use of the accent anywhere in the app, and the reason it
  must not appear decoratively elsewhere.
- **Mobile (<768px):** The rail becomes a 280px off-canvas drawer behind a
  56px sticky top bar. The drawer holds the same fully-labelled navigation plus
  the school switcher and user identity, traps focus, locks background scroll,
  and closes on navigation, backdrop, or Escape.
- **The label is not optional.** An icon-only navigation item without a visible
  label or a working tooltip is a defect. Tooltips do not exist on touch.

### Signature Component — The Odontogram

The digital dental chart is the one place this system is allowed to look like
nothing else, because nothing else is a mouth. Teeth are laid out in anatomical
quadrants using standard dental notation, each tooth carrying its own condition
state. It opens read-only and requires an explicit switch into edit mode before
any tooth can change — a clinical record should not be editable by accident. The
condition palette and tooth-level editing are dentist-only; other roles see the
chart but cannot alter it. DMF and dmf indices are computed from the tooth states
and never hand-entered.

### Signature Pattern — The Validation Gate

Every predictive output is presented as a proposal, never a conclusion. The
model's risk level and recommendation pre-fill *editable* fields, each marked
with an "AI-suggested" chip that flips to "edited" the moment the dentist changes
it. A single deliberate "Validate & Save" commits, and clinical notes are
required. The screen always carries the standing disclaimer that this is
AI-assisted screening and not a diagnosis. This pattern is load-bearing for the
product's integrity — it is the visual proof that the dentist decides and the
model only assists.

## 6. Do's and Don'ts

### Do:

- **Do** carry every border, divider, and table rule at 1px in Rule Line
  (`rgba(0,0,0,0.1)`), and build structure from rules and tonal fills rather than
  shadow.
- **Do** reserve Official Blue (`#1E40AF`) for primary action, current selection,
  and state — the One Stamp Rule.
- **Do** take all chart color from `src/app/utils/chartColors.ts`. Risk charts use
  the ordered three-tier risk palette, never a rainbow.
- **Do** pair every status color with a word. Color is never the sole signal.
- **Do** write honest empty states that name what is missing and why ("No
  procedures recorded on dental charts yet"), teaching the interface as they go.
- **Do** use horizontal scroll inside a container for wide clinical tables, and
  keep the page itself from ever scrolling sideways.
- **Do** build hierarchy from weight before size, and keep type at fixed rem
  steps.
- **Do** give every interactive element a real focus state, and make clickable
  table rows keyboard-operable.
- **Do** gate all motion behind `prefers-reduced-motion: no-preference`, keep
  transitions at 150–250ms, and use ease-out curves with no bounce.
- **Do** force light rendering in anything captured for PDF or print — the
  exporter photographs the live DOM.

### Don't:

- **Don't** use gradient text, glassmorphism, or playful/gamified health-app
  styling. Quoting PRODUCT.md: the app must not look like "a flashy consumer SaaS
  or marketing site".
- **Don't** build decorative hero metrics — the big-number-plus-gradient-plus-
  supporting-stats template is a SaaS cliché. **One** hero reading is permitted
  where it carries genuine clinical meaning against a named threshold (a DMFT
  index against the WHO benchmark of 3.0; preventive-care compliance against the
  school-year deadline). It must answer a question a dentist actually asks. Scale
  is earned by meaning, never used to make a dashboard look designed.
- **Don't** add decorative motion. Motion conveys state — entrance, feedback,
  loading, reveal — and nothing else. No orchestrated page-load choreography;
  staff load into a task.
- **Don't** use pie or donut charts. They were deliberately replaced with
  horizontal bars because magnitude comparison is easier for older and
  non-technical staff. A designer's reflex to reach for a donut is exactly the
  reflex this rule exists to stop.
- **Don't** ever display a fabricated, sample, or placeholder number. This system
  has already had one full purge of fake dashboard data. A plausible-looking zero
  is worse than an empty state, because it cannot be detected.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored
  accent stripe on cards, rows, callouts, or alerts.
- **Don't** repeat identical icon-plus-heading card grids as a layout reflex.
  Four equal-weight tiles in a row is the most templated pattern in existence and
  is precisely why the dashboard currently reads as generic.
- **Don't** nest a card inside a card.
- **Don't** add a token to `theme.css` that no screen consumes. The prototype
  leftovers were deleted on 2026-07-28; the file is now readable as the real
  system and should stay that way.
- **Don't** introduce a second red. Alert Red (`#DC2626`) is the only one, and
  `--destructive` must stay in step with `CHART.danger`.
- **Don't** ship a solid red destructive button. Destructive actions are red text
  on white with a confirmation step.
- **Don't** rely on `title` tooltips to name anything on a touch surface, and
  never ship an icon-only control without an accessible name.
- **Don't** introduce a second typeface. One family, many weights.
- **Don't** add a dark theme. Light-only is a deliberate decision for daytime
  clinical use, not an oversight.
