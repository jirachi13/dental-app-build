const QUEUED_STUDENT_IDS_KEY = 'queued-student-ids';
// Default queue seed for first load/demo so Dental Charts starts in a non-empty queued view.
const DEFAULT_QUEUED_IDS = ['1', '3', '11', '13', '38'];

const normalizeIds = (ids: string[]) => [...new Set(ids.map(String))];

export const getQueuedStudentIds = (): string[] => {
  if (typeof window === 'undefined') return [...DEFAULT_QUEUED_IDS];
  const raw = window.localStorage.getItem(QUEUED_STUDENT_IDS_KEY);
  if (!raw) {
    window.localStorage.setItem(QUEUED_STUDENT_IDS_KEY, JSON.stringify(DEFAULT_QUEUED_IDS));
    return [...DEFAULT_QUEUED_IDS];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid queued student payload');
    // an explicitly emptied queue stays empty — the demo seed only applies
    // when the key has never been written (un-queueing is a real feature now)
    return normalizeIds(parsed);
  } catch {
    window.localStorage.setItem(QUEUED_STUDENT_IDS_KEY, JSON.stringify(DEFAULT_QUEUED_IDS));
    return [...DEFAULT_QUEUED_IDS];
  }
};

export const setQueuedStudentIds = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUEUED_STUDENT_IDS_KEY, JSON.stringify(normalizeIds(ids)));
};

export const addQueuedStudentId = (id: string) => {
  const next = normalizeIds([...getQueuedStudentIds(), String(id)]);
  setQueuedStudentIds(next);
  return next;
};

export const removeQueuedStudentId = (id: string) => {
  const next = getQueuedStudentIds().filter(existingId => existingId !== String(id));
  setQueuedStudentIds(next);
  return next;
};
