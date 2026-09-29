// ─── Single-choice checkbox reader (Sex, PhilHealth Status) ─────────────────
// Same technique as iptrCheckboxes.ts's Year 1-5 grid: a tick is a MARK, not a
// character, so it is read by INK DENSITY in the box, never by asking OCR what
// "✓" says. The difference is only where the box is found: not from a ruled
// table, but from the OCR'd position of the option's own label ("Male",
// "Principal", …), so a photo that is not framed identically twice still works.
//
// ⚠ DECLINES RATHER THAN GUESSES. It answers null unless exactly one box is
// clearly darker than every other box in its group. Blank group, two ticks, or
// near-equal densities all give null — the encoder ticks it themselves.

export interface PixelSource { width: number; height: number; data: ArrayLike<number> }
export interface LabelBox { text: string; x0: number; x1: number; y0: number; y1: number }

/** Same luminance cut-off as the Year 1-5 grid reader. */
const DARK_LUM = 170;
/** Ticked box interior must be at least this fraction dark… */
const MIN_INK = 0.08;
/** …and beat the runner-up by at least this much (absolute). */
const MIN_MARGIN = 0.05;

export interface TickChoice {
  /** The option whose box is ticked, or null when undecidable. */
  choice: string | null;
  /** 0-100: how dominant the ticked box is over the runner-up. 0 when null. */
  confidence: number;
  /** Ink ratio per option, for diagnostics. */
  densities: Record<string, number>;
}

/** Fraction of dark pixels in the INTERIOR of the box just left of a label.
 *  The box is assumed ~one label-height square, sitting immediately before the
 *  label; the outer 25% is skipped so the printed outline does not count as ink. */
function boxInk(px: PixelSource, label: LabelBox): number {
  const h = label.y1 - label.y0;
  const side = h * 1.1;
  const gap = h * 0.25;
  const bx1 = label.x0 - gap;
  const bx0 = bx1 - side;
  const cy = (label.y0 + label.y1) / 2;
  const inset = side * 0.25;
  const x0 = Math.max(0, Math.round(bx0 + inset));
  const x1 = Math.min(px.width, Math.round(bx1 - inset));
  const y0 = Math.max(0, Math.round(cy - side / 2 + inset));
  const y1 = Math.min(px.height, Math.round(cy + side / 2 - inset));
  if (x1 <= x0 || y1 <= y0) return 0;
  let dark = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * px.width + x) * 4;
      const lum = 0.299 * px.data[p] + 0.587 * px.data[p + 1] + 0.114 * px.data[p + 2];
      if (lum < DARK_LUM) dark++;
    }
  }
  return dark / ((x1 - x0) * (y1 - y0));
}

/** Picks the ticked option among labelled boxes, or declines. */
export function readTickGroup(px: PixelSource, options: Record<string, LabelBox>): TickChoice {
  const densities: Record<string, number> = {};
  for (const [name, box] of Object.entries(options)) densities[name] = boxInk(px, box);
  const ranked = Object.entries(densities).sort((a, b) => b[1] - a[1]);
  const [bestName, best] = ranked[0] ?? ['', 0];
  const second = ranked[1]?.[1] ?? 0;
  if (best < MIN_INK || best - second < MIN_MARGIN) return { choice: null, confidence: 0, densities };
  return { choice: bestName, confidence: Math.round(((best - second) / best) * 100), densities };
}

/** One option word per name, and all on one visual line — otherwise the label
 *  match is coincidence (e.g. "Principal / Dependent" typed inside a caption)
 *  and we decline. */
function findGroup(words: LabelBox[], names: Record<string, RegExp>): Record<string, LabelBox> | null {
  const found: Record<string, LabelBox> = {};
  for (const [name, re] of Object.entries(names)) {
    const hits = words.filter((w) => re.test(w.text.trim().replace(/[^A-Za-z]/g, '')));
    if (hits.length !== 1) return null;
    found[name] = hits[0];
  }
  const boxes = Object.values(found);
  const h = Math.max(...boxes.map((b) => b.y1 - b.y0));
  const mid = boxes.map((b) => (b.y0 + b.y1) / 2);
  if (Math.max(...mid) - Math.min(...mid) > h) return null;
  return found;
}

export interface TickBoxResult {
  gender?: { value: 'Male' | 'Female'; confidence: number };
  philhealthStatus?: { value: 'None' | 'Principal' | 'Dependent'; confidence: number };
}

/** Reads Sex and PhilHealth Status from a page image given its OCR words. */
export function readIptrTickBoxes(px: PixelSource, words: LabelBox[]): TickBoxResult {
  const out: TickBoxResult = {};

  const sex = findGroup(words, { Male: /^male$/i, Female: /^female$/i });
  if (sex) {
    const r = readTickGroup(px, sex);
    if (r.choice) out.gender = { value: r.choice as 'Male' | 'Female', confidence: r.confidence };
  }

  const status = findGroup(words, { None: /^none$/i, Principal: /^principal$/i, Dependent: /^dependent$/i });
  if (status) {
    const r = readTickGroup(px, status);
    if (r.choice) out.philhealthStatus = { value: r.choice as 'None' | 'Principal' | 'Dependent', confidence: r.confidence };
  }
  return out;
}
