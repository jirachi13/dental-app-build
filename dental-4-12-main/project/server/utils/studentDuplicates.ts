import Student from "../models/Student.js";

/** What the client needs to show "is this the same child?" — deliberately a
 *  projection, not the whole record: the dialog only has to be recognisable. */
export interface DuplicateCandidate {
  _id: string;
  full_name: string;
  grade_level: string;
  section: string;
  sex: string;
  birthday: Date;
}

/** Lowercase, collapse internal whitespace, and fold accents so "Peña" and
 *  "Pena" match — the same child is regularly encoded both ways depending on
 *  whether the encoder's keyboard had the ñ. NFD splits the accent off as a
 *  combining mark, which \p{Mn} then strips. */
function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Finds students who look like the one being created.
 *
 *  Match rule: same school + same birthday + same last and first name.
 *  `middle_name` is deliberately NOT part of the key — OCR drops it often
 *  enough that requiring it would miss the exact duplicates this is for. `sex`
 *  is likewise excluded (it is a common mis-entry) but is returned so the
 *  person deciding can see it.
 *
 *  Why this shape: name fields are encrypted with random IVs (Sprint 26), so a
 *  plaintext equality query on them NEVER matches. `birthday`, `school_id` and
 *  `isArchived` are unencrypted, so they do the narrowing in the database and
 *  only that handful of documents gets name-compared in JS. This keeps the
 *  check off the unbounded-read path even at the ~8,000-student scale.
 *
 *  Archived students are excluded: the dialog offers "Open existing", and an
 *  archived record 404s for everyone except System Admin, so warning about one
 *  would be a dead end for the clinical staff who do the encoding.
 */
export async function findDuplicateStudents(
  body: Record<string, unknown>,
): Promise<DuplicateCandidate[]> {
  const { school_id, birthday, last_name, first_name } = body;
  if (!school_id || !birthday || !last_name || !first_name) return [];

  const day = new Date(birthday as string);
  if (Number.isNaN(day.getTime())) return [];
  // Match the whole calendar day rather than an exact instant: birthdays
  // entered through different paths can carry a time component.
  const dayStart = new Date(day);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  // find() runs the decryption hook, so names are plaintext on these docs.
  const sameDay = await Student.find({
    school_id,
    isArchived: false,
    birthday: { $gte: dayStart, $lt: dayEnd },
  });

  const wantLast = normalizeName(last_name);
  const wantFirst = normalizeName(first_name);

  return sameDay
    .filter(
      (s: any) =>
        normalizeName(s.last_name) === wantLast &&
        normalizeName(s.first_name) === wantFirst,
    )
    .map((s: any) => ({
      _id: s._id.toString(),
      full_name: s.full_name,
      grade_level: s.grade_level,
      section: s.section,
      sex: s.sex,
      birthday: s.birthday,
    }));
}
