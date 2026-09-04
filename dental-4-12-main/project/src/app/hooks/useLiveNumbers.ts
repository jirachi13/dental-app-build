import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';

/**
 * Keeps a report's numbers current WHILE SOMEONE IS LOOKING AT THEM (Sprint 110).
 *
 * Sprint 104 refreshes when you come back to the tab. This is the other half:
 * changes made by someone else, while you are already watching.
 *
 * ⚠ IT DOES NOT POLL THE REPORT. It polls `/stats/last-change`, which is one
 * indexed lookup on AUDIT_TRAIL — every write in the app is audited, so that
 * timestamp is a complete change token. `load()` runs only when the token
 * ADVANCES. A tick therefore costs one tiny request instead of the ten
 * collection reads a report rebuild needs.
 *
 * ⚠ NOT a fake live indicator. Nothing re-renders on a timer: the poll asks the
 * database whether anything changed, and `lastUpdated` is the time of a real
 * fetch. A number that ticked without re-reading would be exactly the
 * placeholder CLAUDE.md forbids.
 *
 * ⚠ Bounded by the interval, not instant. Truly instant needs a held socket,
 * which Vercel's request-scoped functions cannot do — that is a hosting change,
 * not a feature. Say so on screen rather than implying live-to-the-second.
 *
 * @param load     the report's loader. Memoise it (useCallback).
 * @param enabled  false to opt out without breaking hook order.
 */
export function useLiveNumbers(load: () => void | Promise<unknown>, enabled = true) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // The token as of the last time we refetched. A ref, not state: changing it
  // must not re-render, and it must not restart the interval.
  const seenToken = useRef<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      // Pointless while nobody is looking, and it would spend invocations to
      // keep an unwatched tab warm.
      if (document.visibilityState !== 'visible') return;
      try {
        const { at } = await apiClient.get<{ at: string | null }>('/stats/last-change');
        if (cancelled) return;
        const token = at ?? '';
        // First tick only RECORDS the token — the caller has just loaded, so
        // refetching here would double every screen open.
        if (seenToken.current === null) { seenToken.current = token; return; }
        if (token !== seenToken.current) {
          seenToken.current = token;
          await loadRef.current();
          if (!cancelled) setLastUpdated(new Date());
        }
      } catch {
        // A failed poll is not worth surfacing — the next one may succeed, and
        // the focus-refresh (Sprint 104) is still there as a backstop.
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [enabled]);

  return { lastUpdated };
}

/** 20s. Short enough that a number changing under you feels live, long enough
 *  that an open tab costs three tiny requests a minute and nothing else. */
export const POLL_MS = 20 * 1000;
