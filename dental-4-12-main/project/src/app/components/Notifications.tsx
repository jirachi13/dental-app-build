import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle, Bell, Calendar, Brain, StickyNote, ClipboardCheck, Clock,
  MoreHorizontal, CheckCircle2, Circle, Trash2, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications, NOTIFIED_ROLES } from '../hooks/useNotifications';
import { PageHeader } from './PageHeader';

// ─── Notifications page ──────────────────────────────────────────────────────
// One flat feed, grouped Today / Earlier (approved design: "variant 1", a
// Facebook-style notification list). Unread rows carry a soft tint and bold
// text; each row's icon circle carries a small corner badge naming its kind.
// Per-row actions live behind a three-dot menu: Mark as read/unread (toggle)
// and Delete this notification -- both client-side only (localStorage), since
// there is no server model for "read" or "dismissed" and these are reminders
// to look at something, not records that need to survive across devices.
// Stored ids are pruned against the live payload each load, so a row that no
// longer exists (the RPC visit was recorded, the appointment was marked) can
// never leave a stale entry behind forever.
export const Notifications = () => {
  const { user, selectedSchool } = useAuth();
  const enabled = NOTIFIED_ROLES.includes(user?.role ?? '');
  const { counts, loading, error } = useNotifications(enabled, selectedSchool);
  const canValidateRisk = user?.role === 'dentist';

  const loadIds = (key: string): Set<string> => {
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  };
  const [readIds, setReadIds] = useState<Set<string>>(() => loadIds('floral.notifications.read'));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadIds('floral.notifications.dismissed'));
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const persist = (key: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    setter(set);
    try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* storage unavailable */ }
  };
  const toggleRead = (id: string) => {
    const next = new Set(readIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    persist('floral.notifications.read', next, setReadIds);
    setOpenMenuId(null);
  };
  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    persist('floral.notifications.read', new Set(readIds).add(id), setReadIds);
  };
  const dismiss = (id: string) => {
    persist('floral.notifications.dismissed', new Set(dismissedIds).add(id), setDismissedIds);
    setOpenMenuId(null);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenuId]);

  type Row = {
    id: string;
    group: 'today' | 'earlier';
    tier: 'needs-action' | 'today-tomorrow' | 'awaiting-review';
    Icon: typeof Calendar;
    Badge: typeof Calendar;
    iconBg: string;
    iconFg: string;
    badgeBg: string;
    textBefore: string;
    textBold: string;
    textAfter: string;
    timeLabel: string;
    linkTo: string;
    linkLabel: string;
  };

  const relTime = (d: Date): string => {
    const diffH = Math.floor((Date.now() - d.getTime()) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d`;
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];

    for (const a of counts.unmarkedAppointments) {
      const dt = new Date(a.datetime);
      list.push({
        id: `appt-missed-${a.id}`,
        group: 'earlier',
        tier: 'needs-action',
        Icon: Calendar,
        Badge: AlertTriangle,
        iconBg: 'bg-danger-surface',
        iconFg: 'text-destructive',
        badgeBg: 'bg-destructive',
        textBefore: 'Missed appointment: ',
        textBold: a.studentName,
        textAfter: `. Scheduled for ${dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}, never marked.`,
        timeLabel: relTime(dt),
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (counts.overdueRpc > 0) {
      list.push({
        id: 'rpc-overdue',
        group: 'today',
        tier: 'needs-action',
        Icon: ClipboardCheck,
        Badge: Clock,
        iconBg: 'bg-danger-surface',
        iconFg: 'text-destructive',
        badgeBg: 'bg-destructive',
        textBefore: '',
        textBold: `${counts.overdueRpc} overdue RPC visit${counts.overdueRpc === 1 ? '' : 's'}`,
        textAfter: '. Visit 1 recorded, Visit 2 still due and past the interval.',
        timeLabel: 'Ongoing',
        linkTo: '/rpc',
        linkLabel: 'Go to RPC Monitoring',
      });
    }
    if (counts.appointmentsToday > 0) {
      list.push({
        id: 'appt-today',
        group: 'today',
        tier: 'today-tomorrow',
        Icon: Calendar,
        Badge: Clock,
        iconBg: 'bg-primary-surface',
        iconFg: 'text-primary',
        badgeBg: 'bg-primary',
        textBefore: '',
        textBold: `${counts.appointmentsToday} appointment${counts.appointmentsToday === 1 ? '' : 's'} today`,
        textAfter: '. Scheduled for today, across the school in view.',
        timeLabel: 'Today',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (counts.appointmentsTomorrow > 0) {
      list.push({
        id: 'appt-tomorrow',
        group: 'today',
        tier: 'today-tomorrow',
        Icon: Calendar,
        Badge: Clock,
        iconBg: 'bg-primary-surface',
        iconFg: 'text-primary',
        badgeBg: 'bg-primary',
        textBefore: '',
        textBold: `${counts.appointmentsTomorrow} appointment${counts.appointmentsTomorrow === 1 ? '' : 's'} tomorrow`,
        textAfter: '. Scheduled for tomorrow, across the school in view.',
        timeLabel: 'Tomorrow',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (counts.dayNoteToday) {
      list.push({
        id: 'day-note-today',
        group: 'today',
        tier: 'today-tomorrow',
        Icon: StickyNote,
        Badge: Clock,
        iconBg: 'bg-warning-surface',
        iconFg: 'text-warning',
        badgeBg: 'bg-warning',
        textBefore: '',
        textBold: 'Note for today',
        textAfter: `. ${counts.dayNoteToday}`,
        timeLabel: 'Today',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (canValidateRisk && counts.awaitingValidation > 0) {
      list.push({
        id: 'risk-awaiting',
        group: 'today',
        tier: 'awaiting-review',
        Icon: Brain,
        Badge: Clock,
        iconBg: 'bg-warning-surface',
        iconFg: 'text-warning',
        badgeBg: 'bg-warning',
        textBefore: '',
        textBold: `${counts.awaitingValidation} risk assessment${counts.awaitingValidation === 1 ? '' : 's'}`,
        textAfter: ' are awaiting validation. Predicted, not yet reviewed by the dentist.',
        timeLabel: 'Ongoing',
        linkTo: '/ai-analytics',
        linkLabel: 'Go to Risk Classification',
      });
    }
    if (counts.consentPending > 0) {
      list.push({
        id: 'consent-pending',
        group: 'today',
        tier: 'awaiting-review',
        Icon: ClipboardCheck,
        Badge: CheckCircle2,
        iconBg: 'bg-warning-surface',
        iconFg: 'text-warning',
        badgeBg: 'bg-warning',
        textBefore: '',
        textBold: `${counts.consentPending} student${counts.consentPending === 1 ? '' : 's'}`,
        textAfter: ' have consent pending. Latest IPTR consent decision not yet recorded.',
        timeLabel: 'Ongoing',
        linkTo: '/patients',
        linkLabel: 'Go to Students',
      });
    }
    return list.filter((r) => !dismissedIds.has(r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, canValidateRisk, dismissedIds]);

  // Prune stale read/dismissed ids: a row that no longer exists (the RPC
  // visit was recorded, the appointment was marked) never leaves a
  // permanent entry taking up storage.
  useEffect(() => {
    if (loading) return;
    const liveIds = new Set(rows.map((r) => r.id));
    const prunedRead = new Set([...readIds].filter((id) => liveIds.has(id)));
    if (prunedRead.size !== readIds.size) persist('floral.notifications.read', prunedRead, setReadIds);
    const prunedDismissed = new Set([...dismissedIds].filter((id) => liveIds.has(id)));
    if (prunedDismissed.size !== dismissedIds.size) persist('floral.notifications.dismissed', prunedDismissed, setDismissedIds);
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
    { key: 'today-tomorrow', label: 'Today & tomorrow', tone: 'text-primary' },
    { key: 'awaiting-review', label: 'Awaiting review', tone: 'text-warning' },
  ] as const;
  const tierCount = (key: string) => rows.filter((r) => r.tier === key).length;

  const visibleRows = activeTier ? rows.filter((r) => r.tier === activeTier) : rows;
  const todayRows = visibleRows.filter((r) => r.group === 'today');
  const earlierRows = visibleRows.filter((r) => r.group === 'earlier');

  const renderRow = (r: Row) => {
    const isRead = readIds.has(r.id);
    return (
      <li key={r.id} className={`relative flex items-start gap-3 p-3.5 ${isRead ? '' : 'bg-primary-surface/60'}`}>
        <div className="relative shrink-0">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${r.iconBg}`}>
            <r.Icon className={`w-5 h-5 ${r.iconFg}`} />
          </span>
          <span className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card ${r.badgeBg}`}>
            <r.Badge className="w-2.5 h-2.5 text-white" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* One paragraph, full sentences throughout -- the relative time
              is its own trailing sentence, right after the existing period
              (user, 2026-09-29: "the date must be right after the period"),
              not split onto a separate meta line. */}
          <p className={`text-[13.5px] leading-snug ${isRead ? 'text-foreground' : 'font-semibold text-foreground'}`}>
            {r.textBefore}<b className="font-bold">{r.textBold}</b>{r.textAfter}{' '}
            <span className="text-xs font-normal text-muted-foreground">{r.timeLabel}</span>
          </p>
        </div>

        {/* "Go to [module]" sits UNDER the three-dot button -- its own
            always-visible link in this column, not a selectable item inside
            the dropdown (user, 2026-09-29, correcting the previous round:
            "under the 3 dot, not become an option in the 3 dot"). */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="relative" ref={openMenuId === r.id ? menuRef : undefined}>
            <button
              type="button"
              onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
              aria-label="Notification options"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {openMenuId === r.id && (
              <div className="absolute right-0 top-8 z-20 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <button
                  type="button"
                  onClick={() => toggleRead(r.id)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                >
                  {isRead ? <Circle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                  Mark as {isRead ? 'unread' : 'read'}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(r.id)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm whitespace-nowrap text-destructive hover:bg-danger-surface"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  Delete this notification
                </button>
              </div>
            )}
          </div>
          <Link
            to={r.linkTo}
            onClick={() => markRead(r.id)}
            className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline"
          >
            <ArrowRight className="w-3 h-3" /> {r.linkLabel}
          </Link>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        eyebrow="Alerts"
        title="Notifications"
        description="Appointments, RPC visits, risk validation, and consent, across every module."
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
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Compact tier summary -- sized to its own content (`self-start`,
              no shared height with the feed beside it), not the stretched
              full-height panel an earlier round tried (user, 2026-09-29:
              "i didnt say copy the size of the container as well"). Click a
              tier to filter the feed; click it again to clear. */}
          <div className="w-full sm:w-56 shrink-0 self-start bg-card rounded-2xl border border-border shadow-sm p-3 space-y-1">
            {/* "All" clears the tier filter -- first in the list (user,
                2026-09-29, correcting an earlier "last" placement), black
                label, same red-circle count style as every tier below it. */}
            <button
              type="button"
              onClick={() => setActiveTier(null)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                activeTier === null ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
            >
              <span className="text-sm font-bold text-foreground">All</span>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white tabular-nums">{rows.length}</span>
            </button>
            {TIERS.map((t) => {
              const n = tierCount(t.key);
              if (n === 0) return null;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTier(activeTier === t.key ? null : t.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                    activeTier === t.key ? 'bg-muted' : 'hover:bg-muted/60'
                  }`}
                >
                  <span className={`text-sm font-bold ${t.tone}`}>{t.label}</span>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white tabular-nums">{n}</span>
                </button>
              );
            })}
          </div>

          {/* Feed -- wider than the earlier `max-w-2xl` version (user,
              2026-09-29: "make the notifications container wider"); fills
              whatever space the tier panel beside it doesn't take. */}
          <div className="flex-1 min-w-0 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {todayRows.length > 0 && (
              <>
                <div className="px-4 py-2.5 text-sm font-bold text-foreground bg-card border-b border-border">Today</div>
                <ul className="divide-y divide-border">{todayRows.map(renderRow)}</ul>
              </>
            )}
            {earlierRows.length > 0 && (
              <>
                <div className="px-4 py-2.5 text-sm font-bold text-foreground bg-card border-b border-border">Earlier</div>
                <ul className="divide-y divide-border">{earlierRows.map(renderRow)}</ul>
              </>
            )}
            {todayRows.length === 0 && earlierRows.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nothing in this tier.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
