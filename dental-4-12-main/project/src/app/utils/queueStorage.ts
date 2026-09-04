const QUEUED_STUDENT_IDS_KEY = 'queued-student-ids';

// Real students have 24-hex Mongo ids; anything shorter is the removed demo
// seed ('1','3',…) still sitting in some browsers' localStorage — drop it.
const normalizeIds = (ids: string[]) => [...new Set(ids.map(String))].filter(id => id.length === 24);

export const getQueuedStudentIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(QUEUED_STUDENT_IDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid queued student payload');
    return normalizeIds(parsed);
  } catch {
    window.localStorage.removeItem(QUEUED_STUDENT_IDS_KEY);
    return [];
  }
};

export const setQueuedStudentIds = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUEUED_STUDENT_IDS_KEY, JSON.stringify(normalizeIds(ids)));
};

// addQueuedStudentId / removeQueuedStudentId were deleted in Sprint 107 with
// the patient list's Actions column, their only caller. They were a SECOND
// write path to the same stored queue alongside the bulk queueTicked /
// unqueueTicked — the drift risk backlog #46 flagged. Keeping them unused
// would have left that risk dormant rather than removed; re-add only if a
// screen genuinely needs single-id queueing again.
