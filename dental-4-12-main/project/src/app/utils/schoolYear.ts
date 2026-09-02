// The clinic's year is the DepEd school calendar, June through April, not the
// calendar year — per the dentist, "kailangan pumasok siya sa school calendar".
// May falls outside the calendar entirely and is bucketed to the school year
// that is about to start, so every date belongs to exactly one school year.
//
// Extracted from useRPCTracking (Sprint 56) so the appointments window and the
// RPC Visit-2 cutoff cannot drift apart; the rules were already identical and
// the RPC logic was smoke-tested against the dentist's own examples.

/** Start of the school year containing `d` — June 1. */
export function schoolYearStart(d: Date): Date {
  const m = d.getMonth(); // 0-indexed
  return m <= 3 ? new Date(d.getFullYear() - 1, 5, 1) : new Date(d.getFullYear(), 5, 1);
}

/** End of the school year containing `d` — April 30. June–Dec → April 30 next
 *  year; Jan–Apr → April 30 same year; May → bucketed to the next school year. */
export function schoolYearEnd(d: Date): Date {
  const m = d.getMonth(); // 0-indexed
  return m <= 3 ? new Date(d.getFullYear(), 3, 30) : new Date(d.getFullYear() + 1, 3, 30);
}
