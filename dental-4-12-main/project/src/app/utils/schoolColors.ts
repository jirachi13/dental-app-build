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

// Schools added through School Management have no entry above. Their colour is
// generated from the school's name: any of 360 hues, in one of three shades, so
// it is the same on every screen and every visit and two schools rarely match.
// Lightness is fixed per part (dark text on a pale fill) so text stays legible
// whatever the hue is: measured over all 360 hues, text on fill is at least
// 4.9:1 and the solid bar/icon colour at least 3:1 against white.
const SHADES = [
  { text: 18, solid: 26, border: 72 },
  { text: 22, solid: 30, border: 66 },
  { text: 26, solid: 34, border: 78 },
];

export const getSchoolColor = (school: string): SchoolColor => {
  const fixed = SCHOOL_COLORS[school];
  if (fixed) return fixed;
  let hash = 0;
  for (let i = 0; i < school.length; i++) hash = (hash * 31 + school.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const shade = SHADES[Math.floor(hash / 360) % SHADES.length];
  return {
    name: school,
    solid: `hsl(${hue}, 72%, ${shade.solid}%)`,
    text: `hsl(${hue}, 72%, ${shade.text}%)`,
    light: `hsl(${hue}, 85%, 93%)`,
    border: `hsl(${hue}, 75%, ${shade.border}%)`,
  };
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
