import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { usePendingWritesFor } from './useOfflineQueue';
import { toLocalDateString, toLocalTimeString } from '../utils/localDate';
import type { ApiAppointment, ApiStudent, ApiDentist, ApiSchool } from '../api/types';

export interface SessionStudent {
  id: string;
  name: string;
  gender: string;
  age: number;
  riskLevel: string | null;
}

export interface AppointmentSession {
  id: string; // synthetic group key
  appointmentIds: string[]; // underlying real Appointment _ids, for status updates
  date: string;
  time: string;
  school: string;
  grade: string;
  section: string;
  studentCount: number;
  type: string;
  status: string;
  dentist: string;
  students: SessionStudent[];
  pending?: boolean;
}

function calculateAge(birthdate: string) {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function buildSessions(
  appointments: ApiAppointment[],
  studentById: Map<string, ApiStudent>,
  schoolNameById: Map<string, string>,
  dentistNameById: Map<string, string>,
): AppointmentSession[] {
  const groups = new Map<string, AppointmentSession>();
  for (const appt of appointments) {
    const student = studentById.get(appt.student_id);
    if (!student) continue;

    const dt = new Date(appt.appointment_datetime);
    const date = toLocalDateString(dt);
    const time = toLocalTimeString(dt);
    const school = schoolNameById.get(student.school_id) ?? 'Unknown School';
    const key = [date, time, school, student.grade_level, student.section, appt.appointment_type, appt.dentist_id, appt._id.startsWith('pending-') ? appt._id : ''].join('|');

    let group = groups.get(key);
    if (!group) {
      group = {
        id: key,
        appointmentIds: [],
        date,
        time,
        school,
        grade: student.grade_level,
        section: student.section,
        studentCount: 0,
        type: appt.appointment_type,
        status: appt.status,
        dentist: dentistNameById.get(appt.dentist_id) ?? 'Unassigned',
        students: [],
        pending: appt._id.startsWith('pending-'),
      };
      groups.set(key, group);
    }

    group.appointmentIds.push(appt._id);
    group.studentCount++;
    group.students.push({
      id: student._id,
      name: student.full_name,
      gender: student.sex,
      age: calculateAge(student.birthday),
      riskLevel: null,
    });
  }
  return Array.from(groups.values());
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [schools, setSchools] = useState<ApiSchool[]>([]);
  const [dentists, setDentists] = useState<ApiDentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingWrites = usePendingWritesFor('/appointments');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [apiAppointments, apiStudents, apiDentists, apiSchools] = await Promise.all([
        apiClient.get<ApiAppointment[]>('/appointments'),
        apiClient.get<ApiStudent[]>('/students'),
        apiClient.get<ApiDentist[]>('/dentists'),
        apiClient.get<ApiSchool[]>('/schools'),
      ]);

      setAppointments(apiAppointments);
      setStudents(apiStudents);
      setSchools(apiSchools);
      setDentists(apiDentists);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // A pending write disappearing from the queue means it just synced.
  const prevPendingCount = useRef(pendingWrites.length);
  useEffect(() => {
    if (pendingWrites.length < prevPendingCount.current) reload();
    prevPendingCount.current = pendingWrites.length;
  }, [pendingWrites.length, reload]);

  const sessions = useMemo(() => {
    const studentById = new Map(students.map((s) => [s._id, s]));
    const schoolNameById = new Map(schools.map((s) => [s._id, s.school_name]));
    const dentistNameById = new Map(dentists.map((d) => [d._id, `Dr. ${d.first_name} ${d.last_name}`]));

    const pendingAppointments: ApiAppointment[] = pendingWrites.map((w) => {
      const body = w.body as Partial<ApiAppointment>;
      return {
        _id: `pending-${w.id}`,
        student_id: body.student_id ?? '',
        dentist_id: body.dentist_id ?? '',
        appointment_datetime: body.appointment_datetime ?? new Date().toISOString(),
        status: body.status ?? 'scheduled',
        appointment_type: body.appointment_type ?? 'checkup',
        requires_followup: body.requires_followup ?? false,
        parental_supervision_required: body.parental_supervision_required ?? false,
        isArchived: false,
      };
    });

    return buildSessions([...appointments, ...pendingAppointments], studentById, schoolNameById, dentistNameById);
  }, [appointments, students, schools, dentists, pendingWrites]);

  const updateSessionStatus = useCallback(async (session: AppointmentSession, status: string) => {
    await Promise.all(session.appointmentIds.map((id) => apiClient.put(`/appointments/${id}`, { status })));
    await reload();
  }, [reload]);

  return { sessions, dentists, loading, error, reload, updateSessionStatus };
}
