// Grade Level Color Coding System
// Consistent colors used across all modules for visual hierarchy

export interface GradeColor {
  name: string;
  solid: string;
  light: string;
}

export const GRADE_COLORS: Record<string, GradeColor> = {
  'Kinder': {
    name: 'Kinder',
    solid: '#7C3AED',
    light: '#EDE9FE'
  },
  'Grade 1': {
    name: 'Grade 1',
    solid: '#DB2777',
    light: '#FCE7F3'
  },
  'Grade 2': {
    name: 'Grade 2',
    solid: '#EA580C',
    light: '#FFEDD5'
  },
  'Grade 3': {
    name: 'Grade 3',
    solid: '#D97706',
    light: '#FEF3C7'
  },
  'Grade 4': {
    name: 'Grade 4',
    solid: '#16A34A',
    light: '#DCFCE7'
  },
  'Grade 5': {
    name: 'Grade 5',
    solid: '#0D9488',
    light: '#CCFBF1'
  },
  'Grade 6': {
    name: 'Grade 6',
    solid: '#2563EB',
    light: '#DBEAFE'
  },
  'Grade 7': {
    name: 'Grade 7',
    solid: '#4338CA',
    light: '#E0E7FF'
  },
  'Grade 8': {
    name: 'Grade 8',
    solid: '#0891B2',
    light: '#CFFAFE'
  },
  'Grade 9': {
    name: 'Grade 9',
    solid: '#65A30D',
    light: '#ECFCCB'
  },
  'Grade 10': {
    name: 'Grade 10',
    solid: '#E11D48',
    light: '#FFE4E6'
  }
};

export const getGradeColor = (grade: string): GradeColor => {
  return GRADE_COLORS[grade] || {
    name: grade,
    solid: '#6B7280',
    light: '#F3F4F6'
  };
};

export const getGradeSolidColor = (grade: string): string => {
  return getGradeColor(grade).solid;
};

export const getGradeLightColor = (grade: string): string => {
  return getGradeColor(grade).light;
};
