import { getQueue, removeFromQueue, markFailed, resetToPending, type QueuedWrite } from './db';
import { notifyQueueChange } from './queueEvents';

let processing = false;

// A raw request, deliberately NOT going through apiClient — apiClient queues
// failed writes, and reusing it here would risk re-queueing a sync attempt
// that just failed, defeating "stop queue if sync fails, never skip."
async function sendDirect(write: QueuedWrite): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`/api${write.endpoint}`, {
    method: write.method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(write.body),
  });

  if (res.status === 401) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).then((r) => r.ok).catch(() => false);
    if (refreshed) {
      const retry = await fetch(`/api${write.endpoint}`, {
        method: write.method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(write.body),
      });
      return { ok: retry.ok, status: retry.status };
    }
  }

  return { ok: res.ok, status: res.status };
}

// FIFO, strictly sequential: process the oldest queued write first, and if
// it fails, stop entirely rather than skip ahead — per CLAUDE.md's PWA/
// OFFLINE spec ("Stop queue if sync fails, never skip").
export async function processQueue(): Promise<void> {
  if (processing || !navigator.onLine) return;
  processing = true;
  try {
    const queue = await getQueue();
    for (const write of queue) {
      // A failed item genuinely blocks the queue — "never skip" means we
      // stop here, not silently process items behind it. Manual retry
      // (see retryQueue()) is the only way past this.
      if (write.status === 'failed') break;
      try {
        const result = await sendDirect(write);
        if (result.ok) {
          await removeFromQueue(write.id!);
          notifyQueueChange();
        } else {
          // Server actively rejected it (e.g. validation error) — not a
          // network problem, so retrying immediately won't help. Mark it
          // failed and stop; later items may depend on this one's data.
          await markFailed(write.id!, `Server rejected with status ${result.status}`);
          notifyQueueChange();
          break;
        }
      } catch {
        // Network failed mid-sync (went offline again) — stop, leave this
        // item pending, it'll retry on the next online event.
        break;
      }
    }
  } finally {
    processing = false;
  }
}

export function initQueueProcessor(): void {
  window.addEventListener('online', () => { processQueue(); });
  if (navigator.onLine) processQueue();
}

// Manual retry (offline banner's "Retry" button): reset the oldest failed
// item back to pending and resume normal FIFO processing from there.
export async function retryQueue(): Promise<void> {
  const queue = await getQueue();
  const firstFailed = queue.find((w) => w.status === 'failed');
  if (firstFailed?.id !== undefined) {
    await resetToPending(firstFailed.id);
    notifyQueueChange();
  }
  await processQueue();
}
