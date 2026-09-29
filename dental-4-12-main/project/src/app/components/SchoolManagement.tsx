import { useState } from 'react';
import { Plus, Edit, Archive, School as SchoolIcon } from 'lucide-react';
import { useSchools } from '../hooks/useSchools';
import { apiClient, ApiError } from '../api/client';
import type { ApiSchool } from '../api/types';
import { SkeletonPageHeader, SkeletonTable } from './Skeleton';
import { ConfirmDialog } from './ConfirmDialog';
import { Notice } from './Notice';
import { PageHeader } from './PageHeader';
import { useToast } from './Toast';
import { Modal } from './Modal';
import { getSchoolShortName } from '../utils/schoolColors';

// ─── School registry (System Admin) ──────────────────────────────────────────
// The three schools existed only in a seeder and in five hardcoded arrays
// across the UI. Admin could assign staff to a school but could not add one,
// and a school created through the API appeared in no form.
//
// Every field here is required by the STUDENT-facing School model, so the form
// asks for all of them rather than writing blanks — see CLAUDE.md's rule about
// placeholders.
//
// Archive, not delete: School carries the standard soft-delete fields and
// crudFactory locks both archive and restore to System Admin. Nothing is ever
// removed, so a school with historical records keeps them.

const SCHOOL_TYPES = ['Integrated School', 'Elementary School', 'High School'];

const emptyForm = {
  school_name: '',
  school_type: SCHOOL_TYPES[0],
  principal_name: '',
  street_address: '',
  barangay: 'Tanyag',
  city: 'Taguig City',
  allow_school_year_override: false,
};

export const SchoolManagement = () => {
  const { schools, loading, error, reload } = useSchools();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiSchool | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<ApiSchool | null>(null);
  const [archiving, setArchiving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (s: ApiSchool) => {
    setEditing(s);
    setForm({
      school_name: s.school_name ?? '',
      school_type: s.school_type ?? SCHOOL_TYPES[0],
      principal_name: s.principal_name ?? '',
      street_address: s.street_address ?? '',
      barangay: s.barangay ?? '',
      city: s.city ?? '',
      allow_school_year_override: s.allow_school_year_override ?? false,
    });
    setFormError(null);
    setShowForm(true);
  };

  const submit = async () => {
    setFormError(null);
    // Named explicitly rather than "fill in all required fields" — the blanket
    // message leaves the user hunting for which box is empty.
    const missing = (Object.entries({
      'School name': form.school_name,
      'School type': form.school_type,
      'Principal name': form.principal_name,
      'Street address': form.street_address,
      Barangay: form.barangay,
      City: form.city,
    }) as [string, string][]).filter(([, v]) => !v.trim()).map(([k]) => k);
    if (missing.length) {
      setFormError(`Please fill in: ${missing.join(', ')}.`);
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.put(`/schools/${editing._id}`, form);
        toast.success(`${form.school_name} updated.`);
      } else {
        await apiClient.post('/schools', form);
        toast.success(`${form.school_name} added.`);
      }
      await reload();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save school');
    } finally {
      setSubmitting(false);
    }
  };

  const archive = async () => {
    if (!confirmArchive) return;
    setArchiving(true);
    try {
      await apiClient.patch(`/schools/${confirmArchive._id}/archive`);
      toast.success(`${confirmArchive.school_name} archived.`);
      await reload();
      setConfirmArchive(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to archive school');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) return <><SkeletonPageHeader /><SkeletonTable rows={4} /></>;

  const field = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  const countType = (word: string) => schools.filter((s) => (s.school_type ?? '').toLowerCase().includes(word)).length;
  const stats = [
    { label: 'Total Schools', value: schools.length, bg: '#E8ECF6', fg: '#273A78' },
    { label: 'Elementary', value: countType('elementary'), bg: '#ECFDF5', fg: '#047857' },
    { label: 'Integrated', value: countType('integrated'), bg: '#FFFBEB', fg: '#B45309' },
  ];
  const th = 'px-6 py-3 text-left text-[12.5px] font-bold text-[#94A3B8] uppercase tracking-wider';
  const td = 'px-6 py-4 text-sm text-foreground';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SchoolIcon}
        eyebrow="Administration"
        title="Schools"
        description="Manage the schools. Every school dropdown in the app reads this list."
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Add School
          </button>
        }
      />

      {error && <Notice variant="error">{error}</Notice>}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, bg, fg }) => (
          <div key={label} className="flex items-start justify-between gap-3 min-h-[8.5rem] rounded-2xl border border-border bg-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div className="min-w-0 self-stretch flex flex-col justify-between">
              <div className="text-sm font-bold uppercase tracking-wider text-foreground">{label}</div>
              <div className="text-4xl font-bold text-foreground mt-3 leading-none">{value}</div>
            </div>
            <span style={{ backgroundColor: bg, color: fg }} className="w-10 h-10 flex-shrink-0 rounded-xl grid place-items-center">
              <SchoolIcon className="w-4 h-4" />
            </span>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-xl grid place-items-center bg-[#F4F7FF] text-[#273A78] flex-shrink-0"><SchoolIcon className="w-5 h-5" /></span>
            <div>
              <div className="text-xl font-bold text-foreground">System Schools</div>
              <div className="text-sm text-muted-foreground">Review and manage registered schools.</div>
            </div>
          </div>
          <span className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#64748B] whitespace-nowrap">{schools.length} {schools.length === 1 ? 'school' : 'schools'} found</span>
        </div>
        {schools.length === 0 ? (
          <div className="border-t border-border flex flex-col items-center justify-center text-center px-6 py-20">
            <span className="w-[4.5rem] h-[4.5rem] rounded-2xl grid place-items-center bg-[#F1F5F9] text-[#94A3B8]"><SchoolIcon className="w-8 h-8" /></span>
            <div className="mt-5 text-base font-bold text-foreground">No schools yet</div>
            <div className="mt-2 text-xs text-muted-foreground">Add one. Student, appointment and report forms all read this list.</div>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className={th}>School</th>
                  <th className={th}>Type</th>
                  <th className={th}>Principal</th>
                  <th className={th}>Address</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schools.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="flex items-center gap-4">
                        <span className="w-11 h-11 flex-shrink-0 rounded-xl grid place-items-center bg-[#F4F7FF] text-[#273A78] text-sm font-bold">{s.school_name.trim().charAt(0).toUpperCase()}</span>
                        <div className="min-w-0">
                          <div className="text-base font-bold text-foreground">{s.school_name}</div>
                          <div className="text-sm text-muted-foreground">{getSchoolShortName(s.school_name)}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#DCE3F5] bg-[#F4F7FF] text-xs font-bold text-[#273A78]">{s.school_type}</span>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{s.principal_name}</td>
                    <td className={`${td} text-xs text-muted-foreground`}>{[s.street_address, s.barangay, s.city].filter(Boolean).join(', ')}</td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <button
                        onClick={() => openEdit(s)}
                        className="px-2 py-1 text-primary hover:text-[#1E3A8A]"
                        aria-label={`Edit ${s.school_name}`}
                      ><Edit className="w-4 h-4" /></button>
                      <button
                        onClick={() => setConfirmArchive(s)}
                        className="px-2 py-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Archive ${s.school_name}`}
                      ><Archive className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} closeDisabled={submitting}>
          <div className="p-6 space-y-4 max-w-lg">
            <h2 className="text-base font-bold text-foreground">{editing ? 'Edit School' : 'Add School'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="sm-name">School Name *</label>
                <input id="sm-name" className={field} value={form.school_name}
                  onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="sm-type">School Type *</label>
                <select id="sm-type" className={field} value={form.school_type}
                  onChange={(e) => setForm({ ...form, school_type: e.target.value })}>
                  {SCHOOL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="sm-principal">Principal Name *</label>
                <input id="sm-principal" className={field} value={form.principal_name}
                  onChange={(e) => setForm({ ...form, principal_name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="sm-street">Street Address *</label>
                <input id="sm-street" className={field} value={form.street_address}
                  onChange={(e) => setForm({ ...form, street_address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="sm-brgy">Barangay *</label>
                <input id="sm-brgy" className={field} value={form.barangay}
                  onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="sm-city">City *</label>
                <input id="sm-city" className={field} value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            {/* ⚠ The "Allow school-year rollover anytime" toggle is GONE
                (Sprint 187). Sprint 185 removed the March–August window it
                governed, so it gated nothing and its own description named a
                rule that no longer exists — a control that looks like it does
                something and cannot. Found by opening this screen as a System
                Admin for the first time since the redesign.

                `allow_school_year_override` stays on the SCHOOL model for now,
                unread. A dead checkbox misleads; an unused column does not. */}
            {formError && <Notice variant="error">{formError}</Notice>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} disabled={submitting}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={submit} disabled={submitting}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add School'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmArchive && (
        <ConfirmDialog
          open
          title={`Archive ${confirmArchive.school_name}?`}
          message="It disappears from every school dropdown. Records already filed against it are kept — nothing is deleted — and a System Admin can restore it."
          confirmLabel={archiving ? 'Archiving…' : 'Archive'}
          onConfirm={archive}
          onCancel={() => setConfirmArchive(null)}
        />
      )}
    </div>
  );
};
