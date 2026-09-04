import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import type { ApiStudent, ApiStudentIptr } from '../api/types';
import { Notice } from './Notice';
import { useToast } from './Toast';
import { schoolYearLabel } from '../utils/schoolYear';
import { surnameFirst } from '../utils/studentName';

// ─── Promote / Assign ────────────────────────────────────────────────────────
// Rollover, in one reviewed action per section instead of one edit per pupil.
//
// Sprint 57a put grade/section on the IPTR, 69 made intake open the year
// record, and 70 made those fields editable one at a time. This is the bulk
// version of that same edit — the piece backlog 23 called "option A" and
// deferred as a rollout feature. At ~8,000 pupils it is the difference between
// roughly thirty actions and eight thousand.
//
// Two records change per pupil, deliberately:
//   • the StudentIptr for the target year, carrying the new grade/section —
//     CREATED when there is none, or CORRECTED in place when there already is
//     one (Sprint 102). Other years are never touched.
//   • the STUDENT's own grade/section, which is CURRENT enrolment and is what
//     rosters and the appointment picker read.
//
// Sprint 102 made it RE-RUNNABLE. Before it, a pupil who already held the
// target year was forced to skip, so a section applied wrongly could not be
// fixed from the screen that applied it — the only way back was editing each
// pupil by hand, which is the work this screen exists to remove. Correcting is
// opt-in per pupil and never the default: a blind second pass would overwrite
// a deliberate manual fix, which is a worse failure than a visible refusal.
//
// The user's standing constraint applies: no per-record prompts or badges
// across thousands of students. One preview, one confirm, one summary.

const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];

/** The grade after `g`, or null for the exit year (Grade 10 leaves). */
const nextGrade = (g: string): string | null => {
  const i = GRADES.indexOf(g);
  return i >= 0 && i < GRADES.length - 1 ? GRADES[i + 1] : null;
};

/** "2026-2027" → "2027-2028". */
const nextSchoolYear = (sy: string): string => {
  const [a, b] = sy.split('-').map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? `${a + 1}-${b + 1}` : sy;
};

type Action = 'promote' | 'retain' | 'skip' | 'update';

interface RowState {
  student: ApiStudent;
  action: Action;
  /** Section for the new year — defaults to the one they are in now. */
  section: string;
  /** Already has a record for the target year. Before Sprint 102 this forced
   *  `skip` and the row was uneditable, so a section applied wrongly could
   *  NOT be fixed from the screen that applied it. */
  alreadyHasYear: boolean;
  /** The target-year IPTR when one exists — what `update` writes to. */
  existingIptr?: ApiStudentIptr;
}

export const PromoteAssign = ({ onClose, schoolId, schoolName }: {
  onClose: () => void;
  schoolId: string | undefined;
  schoolName: string;
}) => {
  const toast = useToast();
  const fromYear = schoolYearLabel();
  const toYear = nextSchoolYear(fromYear);

  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [iptrs, setIptrs] = useState<ApiStudentIptr[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; corrected: number; skipped: number; failed: string[] } | null>(null);

  // The roster for one school + grade, server-filtered (Sprint 56's
  // filterable/filterableText) rather than pulling every student.
  useEffect(() => {
    if (!schoolId || !grade) { setStudents([]); return; }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ school_id: schoolId, grade_level: grade });
    apiClient.get<ApiStudent[]>(`/students?${params}`)
      .then((rows) => { if (!cancelled) setStudents(rows); })
      .catch(() => { if (!cancelled) setStudents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId, grade]);

  // Which of them already have the TARGET year. Those rows become correctable
  // rather than blocked (Sprint 102) — a POST would still 409 on uniqueBy
  // (student_id + school_year), so they are PUT to their existing record.
  useEffect(() => {
    if (students.length === 0) { setIptrs([]); return; }
    let cancelled = false;
    const ids = students.map((s) => s._id).slice(0, 200).join(',');
    apiClient.get<ApiStudentIptr[]>(`/student-iptrs?student_id=${ids}`)
      .then((rows) => { if (!cancelled) setIptrs(rows); })
      .catch(() => { if (!cancelled) setIptrs([]); });
    return () => { cancelled = true; };
  }, [students]);

  const sections = useMemo(
    () => [...new Set(students.map((s) => s.section).filter(Boolean))].sort(),
    [students],
  );

  // Build the preview whenever the filters or the data change.
  //
  // ⚠ MERGES with what is already on screen rather than replacing it. The
  // roster and the "who already has next year" lookup arrive in two separate
  // requests, so this effect runs twice — and a plain rebuild wiped every
  // per-pupil choice made in between. That is precisely the retain exception
  // this screen exists to capture, silently discarded a second after it was
  // set. Caught by the verification, not by reading the code.
  useEffect(() => {
    const targetByStudent = new Map(
      iptrs.filter((i) => i.school_year === toYear).map((i) => [i.student_id, i]),
    );
    setRows((prev) => {
      const chosen = new Map(prev.map((r) => [r.student._id, r]));
      return students
        .filter((s) => !section || s.section === section)
        .sort((a, b) => (a.last_name ?? '').localeCompare(b.last_name ?? ''))
        .map((s) => {
          const existingIptr = targetByStudent.get(s._id);
          const existing = chosen.get(s._id);
          if (existingIptr) {
            // ⚠ DEFAULTS TO SKIP, NOT UPDATE, AND THAT IS THE POINT (Sprint 102).
            // Someone may have hand-corrected this pupil's year record (Sprint
            // 70). Defaulting to update would silently stamp over that on the
            // next run — trading a visible failure for an invisible one. The
            // operator opts in per pupil, having seen what it would change.
            return {
              student: s,
              // Keep a choice already made this session; otherwise skip.
              action: existing?.alreadyHasYear ? existing.action : ('skip' as Action),
              section: existing?.alreadyHasYear ? existing.section : (existingIptr.section ?? s.section ?? ''),
              alreadyHasYear: true,
              existingIptr,
            };
          }
          return existing
            ? { ...existing, student: s, alreadyHasYear: false, existingIptr: undefined }
            : { student: s, action: 'promote' as Action, section: s.section ?? '', alreadyHasYear: false };
        });
    });
    setResult(null);
  }, [students, iptrs, section, toYear]);

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r) => (r.student._id === id ? { ...r, ...patch } : r)));

  const graduating = grade === GRADES[GRADES.length - 1];
  const target = nextGrade(grade);

  // --- Tick-and-apply selection -------------------------------------------
  // Layered ON TOP of the per-row dropdowns, never replacing them: tick a set,
  // apply one action to all of it, then adjust exceptions row by row. The
  // dropdowns stay the source of truth, so ignoring the tickboxes entirely
  // leaves the original flow untouched.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSection, setBulkSection] = useState('');

  // Drop ids no longer on screen (grade/section changed). A selection the
  // operator cannot see would make the next bulk action touch pupils they are
  // not looking at.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const onScreen = new Set(rows.map((r) => r.student._id));
      const next = new Set([...prev].filter((id) => onScreen.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.student._id)));

  // Which actions a row can legally take. A pupil who already has a toYear
  // record can only be corrected or skipped -- promoting them would POST a
  // duplicate and 409 on uniqueBy (Sprint 102). The bulk bar must respect this
  // or it would appear to act on rows it silently cannot change.
  const canTake = (r: RowState, a: Action) =>
    a === 'skip' ? true
      : r.alreadyHasYear ? a === 'update'
      : a === 'promote' ? !graduating
      : a === 'retain';

  const applyBulkAction = (action: Action) => {
    const picked = rows.filter((r) => selected.has(r.student._id));
    const eligible = new Set(picked.filter((r) => canTake(r, action)).map((r) => r.student._id));
    if (eligible.size === 0) {
      toast.error(`None of the ${picked.length} selected can take that action.`);
      return;
    }
    setRows((prev) => prev.map((r) => (eligible.has(r.student._id) ? { ...r, action } : r)));
    // Say what was NOT changed. A bulk action that quietly skips rows is the
    // same class of lie as a filter that changes a label but not the data.
    const skipped = picked.length - eligible.size;
    toast.success(
      `Applied to ${eligible.size} pupil${eligible.size === 1 ? '' : 's'}` +
      (skipped > 0 ? ` — ${skipped} left unchanged (already has a ${toYear} record).` : '.'),
    );
  };

  const applyBulkSection = () => {
    const value = bulkSection.trim();
    if (!value) return;
    const picked = rows.filter((r) => selected.has(r.student._id) && r.action !== 'skip');
    if (picked.length === 0) {
      toast.error('No selected pupil has an action set — a skipped pupil gets no section.');
      return;
    }
    const ids = new Set(picked.map((r) => r.student._id));
    setRows((prev) => prev.map((r) => (ids.has(r.student._id) ? { ...r, section: value } : r)));
    toast.success(`Section set to "${value}" for ${picked.length} pupil${picked.length === 1 ? '' : 's'}.`);
  };
  const toApply = rows.filter((r) => r.action !== 'skip');
  const toCreate = toApply.filter((r) => r.action !== 'update');
  const toCorrect = toApply.filter((r) => r.action === 'update');

  const run = async () => {
    setRunning(true);
    setError(null);
    let created = 0;
    let corrected = 0;
    const failed: string[] = [];
    for (const r of toApply) {
      // Retained pupils repeat the grade; promoted ones move up. Graduating
      // pupils have no next grade, so only "retain" is meaningful there.
      // `update` keeps the pupil in whatever grade the existing record says —
      // it is a correction of THIS year's placement, not a second promotion.
      // Re-deriving it from `target` would quietly bump anyone corrected twice.
      const newGrade = r.action === 'update'
        ? (r.existingIptr?.grade_level ?? r.student.grade_level ?? '')
        : r.action === 'retain'
          ? (r.student.grade_level ?? '')
          : (target ?? r.student.grade_level ?? '');
      try {
        if (r.action === 'update' && r.existingIptr) {
          // Sprint 102: correct the year record in place. POSTing again would
          // 409 on uniqueBy (student_id + school_year) — which is exactly why
          // this screen used to be unable to fix its own mistakes.
          await apiClient.put(`/student-iptrs/${r.existingIptr._id}`, {
            grade_level: newGrade,
            section: r.section || null,
          });
          corrected += 1;
        } else {
          await apiClient.post('/student-iptrs', {
            student_id: r.student._id,
            school_year: toYear,
            grade_level: newGrade,
            section: r.section || null,
          });
          created += 1;
        }
        // Current enrolment follows — that is what promotion MEANS, and it is
        // what the rosters and the appointment picker read.
        await apiClient.put(`/students/${r.student._id}`, { grade_level: newGrade, section: r.section });
      } catch (err) {
        failed.push(`${surnameFirst(r.student)} — ${err instanceof ApiError ? err.message : 'failed'}`);
      }
    }
    setResult({ created, corrected, skipped: rows.length - toApply.length, failed });
    setRunning(false);
    if (created > 0) toast.success(`${created} pupil${created === 1 ? '' : 's'} moved into ${toYear}.`);
    if (corrected > 0) toast.success(`${corrected} ${toYear} record${corrected === 1 ? '' : 's'} corrected.`);
    if (failed.length > 0) toast.error(`${failed.length} could not be moved — see the summary.`);
  };

  const field = 'border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5" /> Promote / Assign
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Opens next year's record for a whole section at once.
          <span className="font-medium text-foreground"> {fromYear} </span>
          <ArrowRight className="w-3 h-3 inline mx-0.5" />
          <span className="font-medium text-foreground"> {toYear} </span>
          · {schoolName}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setSection(''); }} className={field} aria-label="Grade">
          <option value="">Select grade…</option>
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={section} onChange={(e) => setSection(e.target.value)} className={field} aria-label="Section" disabled={!grade}>
          <option value="">All sections</option>
          {sections.map((s) => <option key={s}>{s}</option>)}
        </select>
        {grade && target && (
          <span className="text-xs text-muted-foreground">
            {grade} <ArrowRight className="w-3 h-3 inline" /> <span className="font-medium text-foreground">{target}</span>
          </span>
        )}
      </div>

      {graduating && (
        <Notice variant="warning">
          {grade} is the exit year — there is no grade above it. Pupils here can be retained, but not promoted.
          Leaving school is not recorded by this system.
        </Notice>
      )}

      {error && <Notice variant="error">{error}</Notice>}

      {loading && <p className="text-sm text-muted-foreground">Loading roster…</p>}

      {!loading && grade && rows.length === 0 && (
        <Notice variant="warning">No pupils in {grade}{section ? ` · ${section}` : ''} at this school.</Notice>
      )}

      {rows.length > 0 && (
        <>
          {/* Tick-and-apply bar. Appears only with a selection, so the screen
              is unchanged for anyone who never ticks anything. Wraps rather
              than scrolling sideways: this is used on a phone in the field. */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-primary/30 bg-primary/5">
              <span className="text-xs font-semibold text-foreground">
                {selected.size} selected
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground">Set action:</span>
              {!graduating && (
                <button type="button" onClick={() => applyBulkAction('promote')}
                  className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:bg-gray-50">
                  Promote to {target}
                </button>
              )}
              <button type="button" onClick={() => applyBulkAction('retain')}
                className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:bg-gray-50">
                Retain
              </button>
              <button type="button" onClick={() => applyBulkAction('update')}
                className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:bg-gray-50">
                Correct {toYear}
              </button>
              <button type="button" onClick={() => applyBulkAction('skip')}
                className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:bg-gray-50">
                Skip
              </button>
              <span className="w-px h-5 bg-border hidden sm:block" />
              <input
                value={bulkSection}
                onChange={(e) => setBulkSection(e.target.value)}
                placeholder="Section for all"
                aria-label="Section to apply to the selected pupils"
                className="text-xs border border-border rounded-md px-2 py-1 w-32 bg-card"
              />
              <button type="button" onClick={applyBulkSection} disabled={!bulkSection.trim()}
                className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:bg-gray-50 disabled:opacity-40">
                Apply section
              </button>
              <button type="button" onClick={() => setSelected(new Set())}
                className="text-xs px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground ml-auto">
                Clear
              </button>
            </div>
          )}

          {/* overflow-x-auto, not overflow-hidden: the tickbox column added a
              fourth column, and on a ~390px phone the table would otherwise
              be CLIPPED rather than scrollable. CLAUDE.md: wide tables scroll
              inside their own container, and the body never scrolls sideways. */}
          <div className="border border-border rounded-xl max-h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-9">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={allSelected ? 'Deselect all pupils' : 'Select all pupils'}
                      className="w-4 h-4 align-middle accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Pupil</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Action</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Section in {toYear}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.student._id} className={r.action === 'skip' ? 'opacity-50' : ''}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.student._id)}
                        onChange={() => toggleOne(r.student._id)}
                        aria-label={`Select ${surnameFirst(r.student)}`}
                        className="w-4 h-4 align-middle accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {surnameFirst(r.student)}
                      {r.alreadyHasYear && (
                        // The operator cannot opt into a correction blind — the
                        // row states what the {toYear} record says NOW, so an
                        // overwrite is a seen decision (Sprint 102).
                        <span className="block text-[11px] text-muted-foreground">
                          {toYear} already: {r.existingIptr?.grade_level || 'grade not recorded'}
                          {r.existingIptr?.section ? ` · ${r.existingIptr.section}` : ''}
                          {r.action === 'update' && (
                            <span className="text-amber-700"> → {r.section || 'no section'}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={r.action}
                        onChange={(e) => setRow(r.student._id, { action: e.target.value as Action })}
                        className="text-xs border border-border rounded-md px-2 py-1 bg-card"
                        aria-label={`Action for ${surnameFirst(r.student)}`}
                      >
                        {r.alreadyHasYear ? (
                          <option value="update">Correct {toYear} record</option>
                        ) : (
                          <>
                            {!graduating && <option value="promote">Promote to {target}</option>}
                            <option value="retain">Retain in {r.student.grade_level}</option>
                          </>
                        )}
                        <option value="skip">Skip</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.section}
                        onChange={(e) => setRow(r.student._id, { section: e.target.value })}
                        disabled={r.action === 'skip'}
                        className="text-xs border border-border rounded-md px-2 py-1 w-32 disabled:opacity-50"
                        aria-label={`Section for ${surnameFirst(r.student)}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{toCreate.length}</span> of {rows.length} will get a new {toYear} record
            {toCorrect.length > 0 && (
              <>, and <span className="font-medium text-amber-700">{toCorrect.length}</span> existing {toYear} record{toCorrect.length === 1 ? '' : 's'} will be OVERWRITTEN</>
            )}.
            Each also has their current grade and section updated — that is what promotion means.
            {toCorrect.length === 0 && ' Existing years are left untouched.'}
          </p>
        </>
      )}

      {result && (
        <Notice variant={result.failed.length ? 'error' : 'success'}>
          {result.created} moved into {toYear}
          {result.corrected > 0 && `, ${result.corrected} corrected`}, {result.skipped} skipped.
          {result.failed.length > 0 && (
            <ul className="mt-1 list-disc list-inside">{result.failed.map((f) => <li key={f}>{f}</li>)}</ul>
          )}
        </Notice>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onClose} disabled={running}
          className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50">
          {result ? 'Close' : 'Cancel'}
        </button>
        <button onClick={run} disabled={running || toApply.length === 0}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {running ? 'Working…' : toCorrect.length && !toCreate.length
            ? `Correct ${toCorrect.length} ${toYear} record${toCorrect.length === 1 ? '' : 's'}`
            : `Open ${toYear} for ${toApply.length}`}
        </button>
      </div>
    </div>
  );
};
