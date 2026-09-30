import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Archive as ArchiveIcon, Filter, Search, Calendar, Hash } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { apiClient, ApiError } from '../api/client';
import type { ApiUser, ApiStudent, ApiSchool, ApiStudentIptr, ApiAppointment, ApiTreatment, ApiReferral } from '../api/types';
import { SkeletonTable } from './Skeleton';
import { ConfirmDialog } from './ConfirmDialog';
import { Notice } from './Notice';
import { useToast } from './Toast';
import { formatDate, formatDateTime } from '../utils/localDate';
import { surnameFirst } from '../utils/studentName';
import { ROLE_LABELS } from '../hooks/useUsers';

// ─── Archived records (System Admin) ─────────────────────────────────────────
// CLAUDE.md lists "restore archived records" as a System Admin capability and
// the API has supported it since Sprint 6 — `?includeArchived=true` (admin
// only) and `PATCH /:id/restore`. There was no interface for either, so an
// archived record was invisible from inside the app and recoverable only by a
// direct database query. This is that interface.
//
// ⚠ `includeArchived=true` returns ARCHIVED AND ACTIVE records — the server
// drops the isArchived filter entirely rather than inverting it — so the list
// is narrowed here. Reading that flag as "archived only" would show every
// record in the system with a Restore button beside it.

type Row = Record<string, any>;

interface Kind {
  key: string;
  label: string;
  path: string;
  /** Human identity for one archived row. */
  describe: (r: Row, ctx: Ctx) => string;
  /** Extra context column, where one helps. */
  detail?: (r: Row, ctx: Ctx) => string;
}

interface Ctx {
  studentById: Map<string, ApiStudent>;
  schoolById: Map<string, ApiSchool>;
  userById: Map<string, ApiUser>;
}

const KINDS: Kind[] = [
  {
    key: 'student-iptrs',
    label: 'School years (IPTR)',
    path: '/student-iptrs',
    describe: (r: ApiStudentIptr, c) => {
      const s = c.studentById.get(r.student_id);
      return s ? surnameFirst(s) : 'Unknown student';
    },
    detail: (r: ApiStudentIptr) => `SY ${r.school_year}${r.grade_level ? ` · ${r.grade_level} ${r.section ?? ''}`.trimEnd() : ''}`,
  },
  {
    key: 'students',
    label: 'Students',
    path: '/students',
    describe: (r: ApiStudent) => surnameFirst(r),
    detail: (r: ApiStudent, c) =>
      [c.schoolById.get(r.school_id)?.school_name, r.grade_level, r.section].filter(Boolean).join(' · '),
  },
  {
    key: 'schools',
    label: 'Schools',
    path: '/schools',
    describe: (r: ApiSchool) => r.school_name,
    detail: (r: ApiSchool) => [r.school_type, r.barangay, r.city].filter(Boolean).join(', '),
  },
  {
    key: 'appointments',
    label: 'Appointments',
    path: '/appointments',
    describe: (r: ApiAppointment, c) => {
      const s = c.studentById.get(r.student_id);
      return s ? surnameFirst(s) : 'Unknown student';
    },
    detail: (r: ApiAppointment) => `${formatDate(r.appointment_datetime)} · ${r.appointment_type} · ${r.status}`,
  },
  {
    key: 'treatments',
    label: 'Treatments',
    path: '/treatments',
    describe: (r: ApiTreatment) => r.diagnosis || 'Treatment record',
    detail: (r: ApiTreatment) => [formatDate(r.date), r.treatment_done].filter(Boolean).join(' · '),
  },
  {
    // Sprint 129. Added because Sprint 127 shipped REFERRAL without it, which
    // meant an archived referral was invisible here and therefore impossible to
    // restore — soft-deleted in name only.
    key: 'referrals',
    label: 'Referrals',
    path: '/referrals',
    describe: (r: ApiReferral) => r.facility_name || 'Referral',
    detail: (r: ApiReferral) => [formatDate(r.date_issued), r.reason].filter(Boolean).join(' · '),
  },
];

const FIELD = 'w-full px-4 py-3 text-sm text-[#475569] bg-[#F8FAFC] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#16214F]/30';
const FIELD_STYLE = { border: '1px solid #E2E8F0' } as const;
const CARD = 'bg-card rounded-2xl border border-border shadow-[0_4px_20px_rgba(0,0,0,0.06)]';
const TH = 'px-6 py-3 text-left text-[12.5px] font-bold text-[#94A3B8] uppercase tracking-wider';

export const ArchiveManagement = () => {
  const toast = useToast();
  const [kindKey, setKindKey] = useState(KINDS[0].key);
  const [rows, setRows] = useState<Row[]>([]);
  const [ctx, setCtx] = useState<Ctx>({ studentById: new Map(), schoolById: new Map(), userById: new Map() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [search, setSearch] = useState('');

  const kind = KINDS.find((k) => k.key === kindKey) ?? KINDS[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Students and schools resolve the foreign keys the other kinds show.
      // Fetched WITH archived, so an archived student's archived IPTR still
      // renders a name instead of "Unknown student".
      const [all, students, schools, users] = await Promise.all([
        apiClient.get<Row[]>(`${kind.path}?includeArchived=true`),
        apiClient.get<ApiStudent[]>('/students?includeArchived=true'),
        apiClient.get<ApiSchool[]>('/schools?includeArchived=true'),
        // Whoever archived a record may have been deactivated since.
        apiClient.get<ApiUser[]>('/users?includeArchived=true').catch(() => [] as ApiUser[]),
      ]);
      setCtx({
        studentById: new Map(students.map((s) => [s._id, s])),
        schoolById: new Map(schools.map((s) => [s._id, s])),
        userById: new Map(users.map((u) => [u._id, u])),
      });
      setRows(
        all
          .filter((r) => r.isArchived)
          .sort((a, b) => String(b.archivedAt ?? '').localeCompare(String(a.archivedAt ?? ''))),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load archived records');
    } finally {
      setLoading(false);
    }
  }, [kind.path]);

  useEffect(() => { void load(); }, [load]);

  const restore = async () => {
    if (!confirmRow) return;
    setRestoring(true);
    try {
      await apiClient.patch(`${kind.path}/${confirmRow._id}/restore`);
      toast.success(`${kind.describe(confirmRow, ctx)} restored.`);
      setConfirmRow(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to restore');
    } finally {
      setRestoring(false);
    }
  };

  // Search narrows the loaded list only; it never refetches.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${kind.describe(r, ctx)} ${kind.detail?.(r, ctx) ?? ''}`.toLowerCase().includes(q));
  }, [rows, search, kind, ctx]);

  // archivedAt / archivedBy can be null on records archived before those fields
  // were populated: say so rather than render an empty cell that reads as
  // "not archived".
  const notRecorded = <span className="text-muted-foreground">Not recorded</span>;
  const archivedDate = (r: Row) => r.archivedAt
    ? new Date(r.archivedAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
    : null;
  const archivedTime = (r: Row) => r.archivedAt
    ? new Date(r.archivedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null;
  const archiver = (r: Row) => {
    const u = r.archivedBy ? ctx.userById.get(String(r.archivedBy)) : undefined;
    return u ? { name: u.full_name, role: ROLE_LABELS[u.role] ?? u.role } : null;
  };
  const ArchivedBy = ({ r }: { r: Row }) => {
    const u = archiver(r);
    if (!u) return r.archivedBy ? <span className="text-muted-foreground">Unknown user</span> : notRecorded;
    return (
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 flex-shrink-0 rounded-xl grid place-items-center bg-[#F4F7FF] text-[#273A78] text-sm font-bold">{u.name.trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground">{u.name}</div>
          <div className="text-xs text-muted-foreground">{u.role}</div>
        </div>
      </div>
    );
  };

  const RestoreBtn = ({ r }: { r: Row }) => (
    <button
      onClick={() => setConfirmRow(r)}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-surface text-primary text-sm font-bold hover:opacity-80 transition-opacity"
    >
      <RotateCcw className="w-4 h-4" /> Restore
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArchiveIcon}
        eyebrow="System Administration"
        title="Archived Records"
        description="Nothing is ever deleted. Archived records are hidden from every other screen and can be restored here."
      />

      {error && <Notice variant="error">{error}</Notice>}

      <div className={CARD}>
        <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
          <span className="w-12 h-12 rounded-xl grid place-items-center bg-[#F1F5F9] text-[#334155] flex-shrink-0"><Filter className="w-5 h-5" /></span>
          <div>
            <div className="text-base font-bold text-foreground">Search &amp; Filters</div>
            <div className="text-sm text-muted-foreground">Choose a record type and refine the list.</div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name or details"
              aria-label="Search archived records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${FIELD} pl-12`}
              style={FIELD_STYLE}
            />
          </div>
          <select
            id="archive-kind"
            aria-label="Record type"
            value={kindKey}
            onChange={(e) => { setKindKey(e.target.value); setSearch(''); }}
            className={FIELD}
            style={FIELD_STYLE}
          >
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? <SkeletonTable rows={4} /> : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl grid place-items-center bg-[#F4F7FF] text-[#273A78] flex-shrink-0"><ArchiveIcon className="w-5 h-5" /></span>
              <div>
                <div className="text-xl font-bold text-foreground">Archived {kind.label}</div>
                <div className="text-sm text-muted-foreground">Restore records hidden from the rest of the system.</div>
              </div>
            </div>
            <span className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#64748B] whitespace-nowrap">
              {visible.length} {visible.length === 1 ? 'record' : 'records'} found
            </span>
          </div>

          {visible.length > 0 && (
            <div className="hidden lg:block overflow-x-auto border-t border-border">
              <table className="w-full table-fixed min-w-[1200px]">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className={TH} style={{ width: '17%' }}>Record</th>
                    <th className={TH} style={{ width: '18%' }}>Details</th>
                    <th className={TH} style={{ width: '18%' }}>Archived by</th>
                    <th className={TH} style={{ width: '12%' }}>Date</th>
                    <th className={TH} style={{ width: '8%' }}>Time</th>
                    <th className={TH} style={{ width: '18%' }}>Record ID</th>
                    <th className={TH} style={{ width: '9%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visible.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-bold text-foreground">{kind.describe(r, ctx)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{kind.detail?.(r, ctx) ?? ''}</td>
                      <td className="px-6 py-4"><ArchivedBy r={r} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {archivedDate(r)
                          ? <span className="inline-flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />{archivedDate(r)}</span>
                          : notRecorded}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{archivedTime(r) ?? notRecorded}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                        <span className="inline-flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-[#94A3B8]" />{String(r._id)}</span>
                      </td>
                      <td className="px-6 py-4"><RestoreBtn r={r} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {visible.length > 0 && (
            <div className="lg:hidden border-t border-border divide-y divide-gray-200">
              {visible.map((r) => (
                <div key={r._id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground">{kind.describe(r, ctx)}</div>
                    <div className="text-xs text-muted-foreground">{kind.detail?.(r, ctx) ?? ''}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.archivedAt ? formatDateTime(r.archivedAt) : 'Archive date not recorded'}
                      {archiver(r) ? ` · by ${archiver(r)!.name}` : ''}
                    </div>
                  </div>
                  <RestoreBtn r={r} />
                </div>
              ))}
            </div>
          )}

          {visible.length === 0 && (
            <div className="border-t border-border flex flex-col items-center justify-center text-center px-6 py-20">
              <span className="w-[4.5rem] h-[4.5rem] rounded-2xl grid place-items-center bg-[#F1F5F9] text-[#94A3B8]"><ArchiveIcon className="w-8 h-8" /></span>
              <div className="mt-5 text-base font-bold text-foreground">No archived {kind.label.toLowerCase()}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {search ? 'Nothing matches your search.' : 'Nothing of this type has been archived.'}
              </div>
            </div>
          )}
        </div>
      )}

      {confirmRow && (
        <ConfirmDialog
          open
          title={`Restore ${kind.describe(confirmRow, ctx)}?`}
          message="It returns to the normal lists and reports immediately, and will be counted again wherever it was counted before."
          confirmLabel={restoring ? 'Restoring…' : 'Restore'}
          onConfirm={restore}
          onCancel={() => setConfirmRow(null)}
        />
      )}
    </div>
  );
};
