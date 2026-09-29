import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

/** Roles that do clinical work, and so have anything to be notified about.
 *
 *  ⚠ School Administrator and Barangay Health Office staff are deliberately
 *  excluded: per CLAUDE.md they view reports and dashboards, never clinical
 *  records. A bell that is permanently empty is noise, and one that showed them
 *  overdue RPC visits would be showing clinical state to a role that cannot act
 *  on it. The sidebar hides the control for them entirely rather than rendering
 *  a zero. */
export const NOTIFIED_ROLES = ['dentist', 'dental_aide', 'system_admin'];

export interface UnmarkedAppointment {
  id: string;
  studentId: string;
  studentName: string;
  /** ISO string; already in the past. */
  datetime: string;
}

export interface NotificationCounts {
  /** Visit 1 recorded, visit 2 not, and past the 150-day interval. */
  overdueRpc: number;
  appointmentsToday: number;
  appointmentsTomorrow: number;
  /** Risk assessments the dentist has not validated. */
  awaitingValidation: number;
  /** STUDENT_IPTR consent_status "pending" on the latest iptr per student. */
  consentPending: number;
  /** Appointments whose time has passed with status still "Scheduled" -- same
   *  test the Appointments module's Missed tab uses. Itemized, not counted,
   *  because each one names a different student and a different action. */
  unmarkedAppointments: UnmarkedAppointment[];
  /** Text of today's day note (barangay-wide or for the school in view), or
   *  null if there isn't one. At most one is shown, per DAY_NOTE. */
  dayNoteToday: string | null;
}

const EMPTY: NotificationCounts = {
  overdueRpc: 0,
  appointmentsToday: 0,
  appointmentsTomorrow: 0,
  awaitingValidation: 0,
  consentPending: 0,
  unmarkedAppointments: [],
  dayNoteToday: null,
};

/**
 * Data for the Notifications page and the sidebar bell.
 *
 * ⚠ ONE SERVER CALL, NOT THE UNDERLYING HOOKS. The sources live across six
 * whole collections; mounting those in the sidebar -- which renders on every
 * screen -- would multiply the app's largest reads across the whole app.
 * `/stats/notifications` does the join once.
 *
 * Scoped to the school in view, so the counts agree with the school switcher.
 */
export function useNotifications(enabled: boolean, schoolName: string | null) {
  const [counts, setCounts] = useState<NotificationCounts>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) { setCounts(EMPTY); return; }
    setLoading(true);
    try {
      const q = schoolName ? `?school=${encodeURIComponent(schoolName)}` : '';
      // ⚠ MERGED OVER `EMPTY`, never assigned raw -- a field the server ever
      // stops returning must read as its zero/empty value, not `undefined`
      // (which turned every sum touching it into a silent NaN in the past).
      const fresh = await apiClient.get<Partial<NotificationCounts>>(`/stats/notifications${q}`);
      setCounts({ ...EMPTY, ...fresh });
      setError(null);
    } catch (err) {
      // A failed badge must not blank the sidebar or shout: it is ambient.
      setError(err instanceof Error ? err.message : 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [enabled, schoolName]);

  useEffect(() => { void reload(); }, [reload]);

  const total =
    counts.overdueRpc +
    counts.appointmentsToday +
    counts.awaitingValidation +
    counts.consentPending +
    counts.unmarkedAppointments.length +
    (counts.dayNoteToday ? 1 : 0);

  return { counts, total, loading, error, reload };
}
