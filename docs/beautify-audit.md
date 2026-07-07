# Beautify Audit — Floral

> ⚠️ **DEGRADED: single-context critique** (no browser automation / sub-agents spawned — cost-conscious run, source + deterministic detector only). A live-browser dual-agent pass would add rendered-pixel findings (real contrast, spacing rhythm, motion) on top of these. These findings are code-evidenced, not screenshot-evidenced.

**Date:** 2026-07-07 · **Method:** source read + `impeccable/detect.mjs` + targeted greps · **Register:** product (design serves the task)

## TL;DR — why it still feels slop

Sprint 23f installed a design-token foundation (`theme.css`: `--primary`, `--foreground`, `--muted`, Public Sans). **The components use none of it.** Measured across `src/app/components/*.tsx`:

| Signal | Count | Meaning |
|---|---:|---|
| Token utilities (`bg-primary`, `text-foreground`, …) | **0** | The 23f foundation is wired to nothing |
| Raw palette utilities (`text-gray-700`, `bg-blue-100`, …) | **1,426** | Every color is ad-hoc |
| Hardcoded hex (`bg-[#1E40AF]`, `#E31E24`) | **73** | Same blue re-typed 73 ways, drifts |
| `rounded-xl` white card shells | **95** | One container style for everything |
| Hand-rolled `fixed inset-0` modals | **5 files** | No shared modal; each reinvented |
| Toast primitives | **0** (only SW update toast) | Form feedback is inline, inconsistent |

The looks aren't broken screen-by-screen — they're **undifferentiated**. Everything is the same white `rounded-xl` card with `border-gray-200`, so nothing has hierarchy, and every color is a one-off literal so the identity never compounds. That uniformity *is* the slop signal, and it's a systemic (tokens/primitives) problem, not a per-screen one. Fixing screens one at a time won't move the feel; fixing the system will.

---

## Ranked — UI / LOOKS

### U1 · [P1] The design tokens are dead; 1,499 hardcoded color literals do the styling
**Evidence:** 0 token utilities vs 1,426 raw-palette + 73 hex across components. `--primary: #1E40AF` is defined once in `theme.css` and then re-typed as `bg-[#1E40AF]`, `text-blue-800`, `bg-blue-100`, `hover:bg-blue-700` etc. everywhere.
**Why it's slop:** No single source of truth means the "brand blue" is actually ~6 different blues. Reads as machine-assembled, not designed. This is the root cause; U2–U4 are symptoms.
**Fix:** Map the raw palette to semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-card`) and sweep components onto them. Extend `theme.css` with the state vocabulary the product register wants (hover/active/selected/success/warning/info) instead of literal `blue-700`/`green-700`.
**Sprint:** `/impeccable extract` (pull tokens) → `/impeccable colorize`.

### U2 · [P1] Identical-card monoculture — 95 white `rounded-xl border-gray-200` shells
**Evidence:** `Skeleton.tsx` confirms the shell (`bg-white rounded-xl border border-gray-200`) is reused for stat tiles, tables, and charts alike; 95 `rounded-xl` hits.
**Why it's slop:** The absolute-ban "identical card grids." Every element has equal visual weight, so the eye finds no hierarchy — the #1 reason a competent app still feels flat/fake.
**Fix:** Differentiate by role, not decoration. Content surface vs. a second neutral layer for toolbars/side panels (product register). Reserve borders+radius for things that are truly cards; let dense tables and section headers breathe without a box. Vary spacing for rhythm instead of uniform `gap-4`.
**Sprint:** `/impeccable layout`.

### U3 · [P2] Chart palette is a 5-color rainbow, not a data system
**Evidence:** `Dashboard.tsx` `COLORS = {red:'#E31E24', blue:'#1E40AF', yellow:'#FBBF24', cyan:'#06B6D4', green:'#16A34A'}` — hues chosen for variety, not meaning; plus five `--chart-*` tokens that don't match.
**Why it's slop:** Saturated rainbow reads consumer, not clinical; risk categories (High/Med/Low) deserve an ordered, semantic scale, not arbitrary hues.
**Fix:** One coherent categorical + one sequential/diverging scale (see `/impeccable dataviz`); map risk tiers to semantic status colors so red always means the same thing.
**Sprint:** `/impeccable colorize` (dataviz skill).

### U4 · [P2] Miniature eyebrow + gray-on-color contrast misses
**Evidence:** `Root.tsx:193` `text-[10px] uppercase tracking-wide` "CURRENT SCHOOL" eyebrow; detector: 11 gray-on-color warnings (`DentalChart.tsx` ×9, `Appointments.tsx`, `RPCTracking.tsx`).
**Why it's slop:** The tracked-uppercase micro-eyebrow is an AI tell; gray text on tinted fills washes out and can miss AA (older-staff legibility is a stated functional requirement).
**Fix:** Replace the eyebrow with weight/size hierarchy; swap `text-gray-*` on colored fills for a darker shade of the fill's own hue.
**Sprint:** `/impeccable polish`.

---

## Ranked — UX / BEHAVIOR

### X1 · [P1] Modal-first, and each modal is hand-rolled
**Evidence:** `fixed inset-0` overlays independently built in `Root.tsx` (change password), `PatientList.tsx` (add student, OCR, bulk upload), `Appointments.tsx`, `AccountManagement.tsx`; only `ConfirmDialog.tsx` is shared.
**Why it's slop:** Product register: "Modal as first thought is laziness." Hand-rolled overlays almost certainly lack consistent Esc-to-close, focus trap, and scroll lock — a keyboard/accessibility red flag (stated AA requirement) and an inconsistent-vocabulary tell (each modal slightly different).
**Fix:** One `<Modal>` primitive (native `<dialog>` or a focus-trapped portal) with Esc + backdrop + focus return; migrate all five. Then challenge each: does add-student / OCR need a modal, or an inline panel / route?
**Sprint:** `/impeccable harden` (primitive + a11y) → `/impeccable shape` (which modals should be inline).

### X2 · [P1] No toast system — success feedback is invisible or inline-only
**Evidence:** 0 toast primitives; only `UpdateToast.tsx` (service-worker updates). Save flows set inline strings (`Root.tsx` "Password changed successfully"); many actions likely confirm nothing.
**Why it's slop:** Visibility-of-status heuristic. After a save/queue/archive the app should say so, consistently, in one place. "Toast consistency" was a named Sprint 23 goal and the primitive doesn't exist yet.
**Fix:** Add one lightweight toast context (success/error/info); route every mutation through it; keep inline errors only for field-level validation.
**Sprint:** `/impeccable craft` (toast primitive) → `/impeccable clarify` (message copy).

### X3 · [P2] All-or-nothing page loading
**Evidence:** `Dashboard.tsx:129` `loading = studentsLoading || appointmentsLoading || rpcLoading || extraLoading` — the whole page waits on the slowest of 8 parallel fetches before anything renders.
**Why it's slop:** Skeletons exist (good) but you stare at them longer than necessary; the page feels heavier than it is. Perceived performance is a big part of "feels like a real app."
**Fix:** Render each region as its own data arrives (per-section skeleton → content) instead of one global gate. Stat tiles shouldn't wait on audit-trail.
**Sprint:** `/impeccable optimize`.

### X4 · [P2] Motion is transition-only; no state/feedback motion
**Evidence:** `transition-colors` / `transition-[width]` on hovers and the sidebar; nothing marks *state change* (row added, item queued, save landed). Skeleton uses `animate-pulse` only.
**Why it's slop:** Product motion should convey state (150–250ms), not just color-fade on hover. Its absence makes actions feel unacknowledged — reinforces X2.
**Fix:** Small, purposeful motion on mutations (row enter/leave, queue toggle, toast in/out) with `prefers-reduced-motion` fallback. No decorative page-load choreography.
**Sprint:** `/impeccable animate`.

---

## Recommended execution order (when usage refreshes)

The system fixes unlock everything else, so do them first — they're also the ones that change the *feel*:

1. **U1 + U2 together** — tokens + card/layout hierarchy (`extract` → `colorize` → `layout`). This is the big one; ~half the slop is here.
2. **X1 + X2** — shared modal primitive + toast system (`harden` → `craft`). The two biggest behavior gaps.
3. **U3 + U4** — chart palette + polish (`colorize` dataviz → `polish`).
4. **X3 + X4** — perceived-performance loading + state motion (`optimize` → `animate`).
5. **`/impeccable polish`** — final consistency sweep.

Each is one approvable sprint. Stop at any commit boundary; none leaves the app half-styled if the token sweep (step 1) lands first, because tokens make the rest incremental.

## Not slop (leave alone)
- Honest empty-state discipline and the dentist-validates-model gate (PRODUCT.md principles) are respected in structure — don't "beautify" those into fabricated data.
- Skeleton shells match real content shells (no layout jump) — keep.
- Role-scoped nav + collapse-persist in `Root.tsx` is solid.
