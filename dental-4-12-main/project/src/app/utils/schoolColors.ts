// School Color Coding System
// Each school has a unique color used consistently everywhere
//
// ⚠ Same accessibility correction as gradeColors.ts (Sprint 96): `solid` and
// `text` are painted on `light`, and two of the three were below 4.5:1 there.
// Darkened in HSL with hue held fixed. BT Integrated's blue already passed at
// 7.15:1 and is untouched. `border` is decorative and is left alone — WCAG's
// text rule does not apply to it.

export interface SchoolColor {
  name: string;
  solid: string;
  light: string;
  text: string;
  border: string;
}

export const SCHOOL_COLORS: Record<string, SchoolColor> = {
  'Bagong Tanyag Integrated School': {
    name: 'Bagong Tanyag Integrated School',
    solid: '#1E40AF',
    light: '#DBEAFE',
    text: '#1E40AF',
    border: '#93C5FD',
  },
  'Bagong Tanyag Elementary School Annex A': {
    name: 'Bagong Tanyag Elementary School Annex A',
    solid: '#0B7A70',
    light: '#CCFBF1',
    text: '#0B7A70',
    border: '#5EEAD4',
  },
  'South Daang Hari Elementary School Main': {
    name: 'South Daang Hari Elementary School Main',
    solid: '#BC470A',
    light: '#FFEDD5',
    text: '#BC470A',
    border: '#FDBA74',
  },
};

// Schools added through School Management have no entry above. They get one of
// these colours instead of grey, chosen from the school's name so it is the same
// on every screen and every visit. All are distinct from the three fixed colours.
const EXTRA_PALETTE: Omit<SchoolColor, 'name'>[] = [
  { solid: '#6D28D9', light: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' }, // purple
  { solid: '#BE123C', light: '#FFE4E6', text: '#BE123C', border: '#FDA4AF' }, // rose
  { solid: '#166534', light: '#DCFCE7', text: '#166534', border: '#86EFAC' }, // green
  { solid: '#A21CAF', light: '#FAE8FF', text: '#A21CAF', border: '#F0ABFC' }, // magenta
  { solid: '#0E7490', light: '#CFFAFE', text: '#0E7490', border: '#67E8F9' }, // cyan
  { solid: '#92400E', light: '#FEF3C7', text: '#92400E', border: '#FCD34D' }, // amber
  { solid: '#4338CA', light: '#E0E7FF', text: '#4338CA', border: '#A5B4FC' }, // indigo
];

export const getSchoolColor = (school: string): SchoolColor => {
  const fixed = SCHOOL_COLORS[school];
  if (fixed) return fixed;
  let hash = 0;
  for (let i = 0; i < school.length; i++) hash = (hash * 31 + school.charCodeAt(i)) >>> 0;
  return { name: school, ...EXTRA_PALETTE[hash % EXTRA_PALETTE.length] };
};

export const SCHOOL_SHORT_NAMES: Record<string, string> = {
  'Bagong Tanyag Integrated School': 'Bagong Tanyag Integrated',
  'Bagong Tanyag Elementary School Annex A': 'Bagong Tanyag Annex A',
  'South Daang Hari Elementary School Main': 'S. Daang Hari',
};

// Terser still than SCHOOL_SHORT_NAMES above — for spots too tight for even
// that (the topbar user menu, a table cell tag).
export const SCHOOL_ACRONYMS: Record<string, string> = {
  'Bagong Tanyag Integrated School': 'BTIS',
  'Bagong Tanyag Elementary School Annex A': 'Annex A',
  'South Daang Hari Elementary School Main': 'South Daanghari',
};

export const getSchoolAcronym = (school: string): string => {
  return SCHOOL_ACRONYMS[school] || school;
};

export const getSchoolShortName = (school: string): string => {
  return SCHOOL_SHORT_NAMES[school] || school;
};
