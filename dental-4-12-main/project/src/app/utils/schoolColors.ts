// School Color Coding System
// Each school has a unique color used consistently everywhere

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
    solid: '#0D9488',
    light: '#CCFBF1',
    text: '#0D9488',
    border: '#5EEAD4',
  },
  'South Daang Hari Elementary School Main': {
    name: 'South Daang Hari Elementary School Main',
    solid: '#EA580C',
    light: '#FFEDD5',
    text: '#EA580C',
    border: '#FDBA74',
  },
};

export const getSchoolColor = (school: string): SchoolColor => {
  return SCHOOL_COLORS[school] || {
    name: school,
    solid: '#6B7280',
    light: '#F3F4F6',
    text: '#6B7280',
    border: '#D1D5DB',
  };
};

export const SCHOOL_SHORT_NAMES: Record<string, string> = {
  'Bagong Tanyag Integrated School': 'BT Integrated',
  'Bagong Tanyag Elementary School Annex A': 'BT Annex A',
  'South Daang Hari Elementary School Main': 'S. Daang Hari',
};

export const getSchoolShortName = (school: string): string => {
  return SCHOOL_SHORT_NAMES[school] || school;
};
