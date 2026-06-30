export type ApiRole = "system_admin" | "dentist" | "dental_aide" | "school_admin" | "bho_staff";

export interface ApiUser {
  _id: string;
  school_id: string | null;
  role: ApiRole;
  full_name: string;
  email: string;
  is_enrolled: boolean;
  last_login: string | null;
  isArchived: boolean;
}

export interface ApiSchool {
  _id: string;
  school_name: string;
  school_type: string;
  isArchived: boolean;
}

export interface ApiStudent {
  _id: string;
  school_id: string;
  full_name: string;
  birthday: string;
  sex: string;
  address: string;
  contact_number?: string;
  grade_level: string;
  section: string;
  isArchived: boolean;
}

export interface ApiStudentIptr {
  _id: string;
  student_id: string;
  school_year: string;
}

export interface ApiDentalChart {
  _id: string;
  iptr_id: string;
  date_charted: string;
}

export interface ApiPreventiveCareRecord {
  _id: string;
  iptr_id: string;
}

export interface ApiRiskStratification {
  _id: string;
  preventive_id: string;
  risk_level: "High" | "Medium" | "Low";
}

export interface ApiTreatment {
  _id: string;
  iptr_id: string;
  diagnosis: string;
  treatment_done: string;
  remarks: string;
  date: string;
}

export interface ApiDentist {
  _id: string;
  school_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  license_number: string;
}

export interface ApiAppointment {
  _id: string;
  student_id: string;
  dentist_id: string;
  appointment_datetime: string;
  status: string;
  appointment_type: string;
  requires_followup: boolean;
  parental_supervision_required: boolean;
  isArchived: boolean;
}

export interface ApiDentistRotation {
  _id: string;
  school_id: string;
  dentist_id: string;
  week_start: string;
  week_end: string;
  notes: string;
}
