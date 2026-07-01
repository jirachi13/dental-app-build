import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { retryQueue } from '../offline/queueProcessor';

export const OfflineBanner = () => {
  const { isOnline, pendingCount, failedCount } = useOfflineQueue();

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>You're offline — changes are being saved locally and will sync automatically once you're back online{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}.</span>
      </div>
    );
  }

  // Back online but the queue hasn't finished draining yet, or has a failed item.
  return (
    <div className={`text-white text-sm px-4 py-2 flex items-center justify-center gap-2 ${failedCount > 0 ? 'bg-red-600' : 'bg-blue-600'}`}>
      {failedCount > 0 ? (
        <span>{failedCount} change{failedCount > 1 ? 's' : ''} failed to sync — check with a system admin. Other pending changes are paused until this is resolved.</span>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingCount} pending change{pendingCount > 1 ? 's' : ''}…</span>
        </>
      )}
      {failedCount > 0 && (
        <button onClick={() => retryQueue()} className="underline ml-2 hover:no-underline">Retry</button>
      )}
    </div>
  );
};
