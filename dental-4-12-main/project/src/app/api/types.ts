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
