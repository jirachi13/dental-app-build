import React, { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'dentist' | 'dental_aide' | 'clinic_staff' | 'school_admin' | 'system_admin';

const ALL_SCHOOLS = [
  'Bagong Tanyag Integrated School',
  'Bagong Tanyag Elementary School Annex A',
  'South Daang Hari Elementary School Main',
];

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  schools: string[]; // assigned schools
}

interface AuthContextType {
  user: User | null;
  selectedSchool: string | null;
  setSelectedSchool: (school: string | null) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  const login = (email: string, password: string) => {
    const mockUsers: Record<string, User> = {
      'dentist@floral.ph': {
        id: '1', name: 'Dr. Maria Santos', email: 'dentist@floral.ph',
        role: 'dentist', schools: ALL_SCHOOLS,
      },
      'aide@floral.ph': {
        id: '2', name: 'Ana Reyes', email: 'aide@floral.ph',
        role: 'dental_aide', schools: ALL_SCHOOLS,
      },
      'school@floral.ph': {
        id: '3', name: 'Nurse Rosa Cruz', email: 'school@floral.ph',
        role: 'clinic_staff', schools: ALL_SCHOOLS,
      },
      'barangay@floral.ph': {
        id: '4', name: 'Mr. Jose Santos', email: 'barangay@floral.ph',
        role: 'school_admin', schools: ALL_SCHOOLS,
      },
      'admin@floral.ph': {
        id: '5', name: 'System Administrator', email: 'admin@floral.ph',
        role: 'system_admin', schools: ALL_SCHOOLS,
      },
    };

    const credentials: Record<string, string> = {
      'dentist@floral.ph': 'demo',
      'aide@floral.ph': 'demo',
      'school@floral.ph': 'demo',
      'barangay@floral.ph': 'demo',
      'admin@floral.ph': 'demo',
    };

    if (mockUsers[email] && credentials[email] === password) {
      setUser(mockUsers[email]);
      setSelectedSchool(null); // reset school on login
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setSelectedSchool(null);
  };

  return (
    <AuthContext.Provider value={{ user, selectedSchool, setSelectedSchool, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
