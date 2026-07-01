// Formats a Date using LOCAL time components (not UTC) as "YYYY-MM-DD" /
// "HH:MM". Appointment day/time bucketing should always use the clinic's
// local time, not UTC — an 8am PH appointment should show on today's date
// regardless of what UTC calendar day that instant falls on. Using
// toISOString() (UTC) for this instead caused appointments near midnight to
// silently vanish from the calendar grid (correct day-tile, wrong date
// string to match against) — see HANDOFF.md's Sprint 20 notes.
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function toLocalTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
