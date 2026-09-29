import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle, Bell, Calendar, Brain, StickyNote, ClipboardCheck, Clock,
  MoreHorizontal, CheckCircle2, Circle, Trash2, ArrowRight, MapPin, FileText,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications, NOTIFIED_ROLES } from '../hooks/useNotifications';
import { useRotationDentist, useRotations, dayStart, addDays } from '../hooks/useRotations';
import { useSchools } from '../hooks/useSchools';
import { toLocalDateString } from '../utils/localDate';
import { getQueuedStudentIds } from '../utils/queueStorage';
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

  // School Rotation and the Treatment/Charting Queue have no server aggregate
  // of their own -- Rotation is small enough to read the same client hooks
  // the Rotation screen itself uses, and the queue is client-only state
  // (localStorage, see utils/queueStorage) that never touches the server at
  // all. Both are read directly here rather than added to
  // /stats/notifications, which stays about what the DB can aggregate.
  const { dentist } = useRotationDentist(enabled);
  const todayDate = useMemo(() => dayStart(new Date()), []);
  const tomorrowDate = useMemo(() => addDays(todayDate, 1), [todayDate]);
  const { byDay: rotationByDay } = useRotations(todayDate, tomorrowDate, dentist?._id);
  const { schools } = useSchools();
  const schoolNameById = (id: string) => schools.find((s) => s._id === id)?.school_name ?? '';
  const [queuedCount] = useState(() => getQueuedStudentIds().length);

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
        textBefore: 'You have a missed appointment with ',
        textBold: a.studentName,
        textAfter: `. It was scheduled for ${dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}, but was never marked.`,
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
        textBefore: 'You have ',
        textBold: `${counts.overdueRpc} overdue RPC visit${counts.overdueRpc === 1 ? '' : 's'}`,
        textAfter: '. Visit 1 was recorded, but Visit 2 is still due and has passed the interval.',
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
        textBefore: 'You have ',
        textBold: `${counts.appointmentsToday} appointment${counts.appointmentsToday === 1 ? '' : 's'} today`,
        textAfter: '. They are scheduled across the school in view.',
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
        textBefore: 'You have ',
        textBold: `${counts.appointmentsTomorrow} appointment${counts.appointmentsTomorrow === 1 ? '' : 's'} tomorrow`,
        textAfter: '. They are scheduled across the school in view.',
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
        textBefore: 'You have a note for today',
        textBold: '',
        textAfter: `: ${counts.dayNoteToday}`,
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
        textBefore: 'You have ',
        textBold: `${counts.awaitingValidation} risk assessment${counts.awaitingValidation === 1 ? '' : 's'}`,
        textAfter: ' awaiting validation. They were predicted by the system but have not yet been reviewed by the dentist.',
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
        textBefore: 'You have ',
        textBold: `${counts.consentPending} student${counts.consentPending === 1 ? '' : 's'}`,
        textAfter: ' with consent pending. Their latest IPTR consent decision has not yet been recorded.',
        timeLabel: 'Ongoing',
        linkTo: '/patients',
        linkLabel: 'Go to Students',
      });
    }
    const todayKey = toLocalDateString(todayDate);
    const tomorrowKey = toLocalDateString(tomorrowDate);
    const rotToday = rotationByDay.get(todayKey);
    const rotTomorrow = rotationByDay.get(tomorrowKey);
    if (rotToday) {
      list.push({
        id: 'rotation-today',
        group: 'today',
        tier: 'today-tomorrow',
        Icon: MapPin,
        Badge: Clock,
        iconBg: 'bg-primary-surface',
        iconFg: 'text-primary',
        badgeBg: 'bg-primary',
        textBefore: 'You are rotating to ',
        textBold: schoolNameById(rotToday.school_id),
        textAfter: ' today.',
        timeLabel: 'Today',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (rotTomorrow) {
      list.push({
        id: 'rotation-tomorrow',
        group: 'today',
        tier: 'today-tomorrow',
        Icon: MapPin,
        Badge: Clock,
        iconBg: 'bg-primary-surface',
        iconFg: 'text-primary',
        badgeBg: 'bg-primary',
        textBefore: 'You are rotating to ',
        textBold: schoolNameById(rotTomorrow.school_id),
        textAfter: ' tomorrow.',
        timeLabel: 'Tomorrow',
        linkTo: '/appointments',
        linkLabel: 'Go to Appointments',
      });
    }
    if (queuedCount > 0) {
      list.push({
        id: 'queue-count',
        group: 'today',
        tier: 'needs-action',
        Icon: ListChecks,
        Badge: Clock,
        iconBg: 'bg-danger-surface',
        iconFg: 'text-destructive',
        badgeBg: 'bg-destructive',
        textBefore: 'You have ',
        textBold: `${queuedCount} student${queuedCount === 1 ? '' : 's'} queued`,
        textAfter: ' for charting or treatment.',
        timeLabel: 'Ongoing',
        linkTo: '/dental-charts',
        linkLabel: 'Go to Dental Charts',
      });
    }
    // Calendar reminder, not a data-backed count -- there is no server
    // record of whether this month's report was generated (CLAUDE.md:
    // nothing fabricated), so this names only what IS real: the date. The id
    // carries the year/month, so it naturally reads as a new notification
    // each month instead of staying permanently "read".
    const now = new Date();
    if (now.getDate() <= 5) {
      list.push({
        id: `reports-reminder-${now.getFullYear()}-${now.getMonth()}`,
        group: 'today',
        tier: 'today-tomorrow',
        Icon: FileText,
        Badge: Clock,
        iconBg: 'bg-primary-surface',
        iconFg: 'text-primary',
        badgeBg: 'bg-primary',
        textBefore: '',
        textBold: 'A new month has started',
        textAfter: '. This is a good time to generate the School Oral Health Status Report and the Consolidated Report for the City Health Office.',
        timeLabel: 'This month',
        linkTo: '/reports',
        linkLabel: 'Go to Reports',
      });
    }
    return list.filter((r) => !dismissedIds.has(r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, canValidateRisk, dismissedIds, rotationByDay, todayDate, tomorrowDate, schools, queuedCount]);

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
    // Three real grid columns, not one flex row with a uniform gap (user,
    // 2026-09-29: "you put space with the icon... when you are supposed to
    // make space between the text and the icons in the right"): icon + text
    // stay close together (their own tight gap-3) in column 1, column 2 is
    // nothing but empty space (0.9fr against content's 3fr -- 10% narrower
    // than the 1fr version, user, 2026-09-29: "too much space... smaller by
    // 10 percent"), and column 3 (three-dot + "Go to") sits flush at the
    // true right edge as its own group.
    return (
      <li key={r.id} className={`relative grid grid-cols-[3fr_0.9fr_auto] items-start gap-0 p-3.5 ${isRead ? '' : 'bg-primary-surface/60'}`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative shrink-0">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${r.iconBg}`}>
              <r.Icon className={`w-5 h-5 ${r.iconFg}`} />
            </span>
            <span className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card ${r.badgeBg}`}>
              <r.Badge className="w-2.5 h-2.5 text-white" />
            </span>
          </div>

          {/* Only the bolded word/name is bold -- the surrounding sentence
              stays regular weight whether read or unread (user, 2026-09-29:
              "only the important words"); unread is carried by the row's
              tint alone. */}
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] leading-snug text-foreground">
              {r.textBefore}<b className="font-bold">{r.textBold}</b>{r.textAfter}{' '}
              <span className="text-xs font-normal text-muted-foreground">{r.timeLabel}</span>
            </p>
          </div>
        </div>

        {/* Column 2: deliberately empty -- the spacer itself. */}
        <div aria-hidden="true" />

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
              <div className="absolute right-0 top-8 z-20 w-max overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <button
                  type="button"
                  onClick={() => toggleRead(r.id)}
                  className="flex w-full items-center gap-2.5 whitespace-nowrap px-3.5 py-2.5 text-left text-sm text-foreground hover:bg-muted"
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
