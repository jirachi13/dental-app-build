import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Bell, Calendar, Brain, StickyNote, ClipboardCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications, NOTIFIED_ROLES } from '../hooks/useNotifications';
import { PageHeader } from './PageHeader';

// ─── Notifications page ──────────────────────────────────────────────────────
// Split view: a left panel of urgency tiers (counts only), a right panel of
// individual notification rows (an email-inbox layout). Per-appointment rows
// are itemized (one row per student); RPC, risk validation and consent are
// aggregate counts, because a single "3 overdue RPC visits" row is what's
// useful there, not three near-identical rows.
//
// Read state: manual (the check button) or automatic (following a "Go to"
// link marks that row read). Persisted client-side per browser/device --
// there is no server model for "read", and a notification is a reminder to
// look at something, not a record that needs to survive across devices.
// Stored read ids are pruned against the live payload each load, so a row
// that no longer exists (the RPC visit was recorded, the appointment was
// marked) can never leave a stale "read" entry behind forever.
export const Notifications = () => {
  const { user, selectedSchool } = useAuth();
  const enabled = NOTIFIED_ROLES.includes(user?.role ?? '');
  const { counts, loading, error } = useNotifications(enabled, selectedSchool);
  const canValidateRisk = user?.role === 'dentist';

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('floral.notifications.read');
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [activeTier, setActiveTier] = useState<string | null>(null);

  const persistRead = (next: Set<string>) => {
    setReadIds(next);
    try { localStorage.setItem('floral.notifications.read', JSON.stringify([...next])); } catch { /* storage unavailable */ }
  };
  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    persistRead(new Set(readIds).add(id));
  };

  type Row = {
    id: string;
    tier: 'needs-action' | 'today' | 'awaiting-review';
    icon: typeof Calendar;
    tone: string;
    chip: string;
    title: string;
    preview: string;
    timestamp: string;
    linkTo: string;
    linkLabel: string;
  };

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];

    for (const a of counts.unmarkedAppointments) {
      const dt = new Date(a.datetime);
      list.push({
        id: `appt-missed-${a.id}`,
        tier: 'needs-action',
        icon: Calendar,
        tone: 'text-destructive',
        chip: 'bg-danger-surface text-destructive',
        title: `Missed appointment: ${a.studentName}`,
        preview: `Scheduled for ${dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}, never marked.`,
        timestamp: dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (counts.overdueRpc > 0) {
      list.push({
        id: 'rpc-overdue',
        tier: 'needs-action',
        icon: ClipboardCheck,
        tone: 'text-destructive',
        chip: 'bg-danger-surface text-destructive',
        title: `${counts.overdueRpc} overdue RPC visit${counts.overdueRpc === 1 ? '' : 's'}`,
        preview: 'Visit 1 recorded, Visit 2 still due and past the interval.',
        timestamp: 'Ongoing',
        linkTo: '/rpc',
        linkLabel: 'Go to RPC Monitoring',
      });
    }
    if (counts.appointmentsToday > 0) {
      list.push({
        id: 'appt-today',
        tier: 'today',
        icon: Calendar,
        tone: 'text-primary',
        chip: 'bg-primary-surface text-primary',
        title: `${counts.appointmentsToday} appointment${counts.appointmentsToday === 1 ? '' : 's'} today`,
        preview: 'Scheduled for today, across the school in view.',
        timestamp: 'Today',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (counts.appointmentsTomorrow > 0) {
      list.push({
        id: 'appt-tomorrow',
        tier: 'today',
        icon: Calendar,
        tone: 'text-primary',
        chip: 'bg-primary-surface text-primary',
        title: `${counts.appointmentsTomorrow} appointment${counts.appointmentsTomorrow === 1 ? '' : 's'} tomorrow`,
        preview: 'Scheduled for tomorrow, across the school in view.',
        timestamp: 'Tomorrow',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (counts.dayNoteToday) {
      list.push({
        id: 'day-note-today',
        tier: 'today',
        icon: StickyNote,
        tone: 'text-warning',
        chip: 'bg-warning-surface text-warning',
        title: 'Note for today',
        preview: counts.dayNoteToday,
        timestamp: 'Today',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (canValidateRisk && counts.awaitingValidation > 0) {
      list.push({
        id: 'risk-awaiting',
        tier: 'awaiting-review',
        icon: Brain,
        tone: 'text-warning',
        chip: 'bg-warning-surface text-warning',
        title: `${counts.awaitingValidation} risk assessment${counts.awaitingValidation === 1 ? '' : 's'} awaiting validation`,
        preview: 'Predicted, not yet reviewed by the dentist.',
        timestamp: 'Ongoing',
        linkTo: '/ai-analytics',
        linkLabel: 'Go to Risk Classification',
      });
    }
    if (counts.consentPending > 0) {
      list.push({
        id: 'consent-pending',
        tier: 'awaiting-review',
        icon: ClipboardCheck,
        tone: 'text-warning',
        chip: 'bg-warning-surface text-warning',
        title: `${counts.consentPending} student${counts.consentPending === 1 ? '' : 's'} with consent pending`,
        preview: 'Latest IPTR consent decision not yet recorded.',
        timestamp: 'Ongoing',
        linkTo: '/patients',
        linkLabel: 'Go to Students',
      });
    }
    return list;
  }, [counts, canValidateRisk]);

  // Prune stale read ids: a row that no longer exists (the RPC visit was
  // recorded, the appointment was marked) never leaves a permanent "read"
  // entry taking up storage.
  useEffect(() => {
    if (loading) return;
    const liveIds = new Set(rows.map((r) => r.id));
    const pruned = new Set([...readIds].filter((id) => liveIds.has(id)));
    if (pruned.size !== readIds.size) persistRead(pruned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, loading]);

  if (!enabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Bell}
          eyebrow="Alerts"
          title="Notifications"
          description="Notifications aren't shown for this role. School Administrator and Barangay Health Office staff view reports, not clinical records."
        />
      </div>
    );
  }

  const TIERS = [
    { key: 'needs-action', label: 'Needs action', tone: 'text-destructive' },
    { key: 'today', label: 'Today and tomorrow', tone: 'text-primary' },
    { key: 'awaiting-review', label: 'Awaiting review', tone: 'text-warning' },
  ] as const;

  const tierCount = (key: string) => rows.filter((r) => r.tier === key).length;
  const unreadCount = rows.filter((r) => !readIds.has(r.id)).length;

  const visibleRows = rows
    .filter((r) => !activeTier || r.tier === activeTier)
    .filter((r) => tab === 'all' || !readIds.has(r.id));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        eyebrow="Alerts"
        title="Notifications"
        description="Appointments, RPC visits, risk validation, and consent, across every module."
        badge={unreadCount}
      />

      {error && (
        <div className="flex items-center gap-2 bg-danger-surface text-destructive text-sm rounded-xl border border-destructive/20 p-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Counts unavailable right now.
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 bg-card rounded-xl border border-border p-12 text-center">
          <Bell className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing needs attention.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex sm:flex-col gap-2 sm:w-56 shrink-0 overflow-x-auto sm:overflow-visible">
            <button
              type="button"
              onClick={() => setActiveTier(null)}
              className={`text-left rounded-xl border p-3 shrink-0 sm:shrink transition-colors ${
                activeTier === null ? 'border-primary bg-primary-surface' : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <p className="text-sm font-semibold text-foreground whitespace-nowrap">All</p>
              <p className="text-xs text-muted-foreground">{rows.length} total</p>
            </button>
            {TIERS.map((t) => {
              const n = tierCount(t.key);
              if (n === 0) return null;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTier(t.key)}
                  className={`text-left rounded-xl border p-3 shrink-0 sm:shrink transition-colors ${
                    activeTier === t.key ? 'border-primary bg-primary-surface' : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <p className={`text-sm font-semibold whitespace-nowrap ${t.tone}`}>{t.label}</p>
                  <p className="text-xs text-muted-foreground">{n} item{n === 1 ? '' : 's'}</p>
                </button>
              );
            })}
          </div>

          <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Inbox</span>
                {unreadCount > 0 && (
                  <span className="bg-destructive text-white text-xs font-semibold rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setTab('all')}
                  className={`text-xs font-medium rounded-md px-3 py-1 transition-colors ${
                    tab === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTab('unread')}
                  className={`text-xs font-medium rounded-md px-3 py-1 transition-colors ${
                    tab === 'unread' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Unread
                </button>
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nothing here.</div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleRows.map((r) => {
                  const Icon = r.icon;
                  const isRead = readIds.has(r.id);
                  return (
                    <li key={r.id} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.chip}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${isRead ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground'}`}>
                          {r.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{r.preview}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{r.timestamp}</span>
                      <Link
                        to={r.linkTo}
                        onClick={() => markRead(r.id)}
                        className="text-xs font-medium text-primary hover:underline whitespace-nowrap shrink-0"
                      >
                        {r.linkLabel}
                      </Link>
                      <button
                        type="button"
                        onClick={() => markRead(r.id)}
                        disabled={isRead}
                        aria-label={isRead ? 'Already read' : 'Mark as read'}
                        title={isRead ? 'Already read' : 'Mark as read'}
                        className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                          isRead
                            ? 'bg-transparent border-border text-muted-foreground'
                            : 'bg-primary border-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
