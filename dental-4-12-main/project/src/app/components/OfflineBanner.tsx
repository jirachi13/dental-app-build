import { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { retryQueue, discardFailedWrite, keepMyChange, discardMyChange } from '../offline/queueProcessor';
import type { QueuedWrite } from '../offline/db';

// "/appointments/6a44ad4..." -> "Appointment"
function describeResource(endpoint: string): string {
  const segment = endpoint.split('/').filter(Boolean)[0] ?? 'Record';
  const singular = segment.endsWith('ies') ? segment.slice(0, -3) + 'y' : segment.replace(/s$/, '');
  return singular
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// "appointment_datetime" -> "Appointment Datetime"
function humanizeField(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function describeChanges(write: QueuedWrite): { field: string; mine: string; current: string }[] {
  const body = (typeof write.body === 'object' && write.body ? write.body : {}) as Record<string, unknown>;
  const current = write.conflictServerRecord ?? {};
  return Object.keys(body)
    .filter((field) => !field.startsWith('_'))
    .map((field) => ({
      field: humanizeField(field),
      mine: formatValue(body[field]),
      current: formatValue(current[field]),
    }));
}

export const OfflineBanner = () => {
  const { isOnline, pendingCount, failed, authBlocked, conflicts } = useOfflineQueue();
  const [showConflicts, setShowConflicts] = useState(false);

  const blocked = authBlocked.length > 0 ? authBlocked : failed;
  const isAuthBlock = authBlocked.length > 0;

  const nothingToShow =
    isOnline && pendingCount === 0 && blocked.length === 0 && conflicts.length === 0;
  if (nothingToShow) return null;

  return (
    <div>
      {!isOnline ? (
        <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>You're offline — changes are being saved locally and will sync automatically once you're back online{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}.</span>
        </div>
      ) : (pendingCount > 0 || blocked.length > 0) ? (
        <div
          className={`text-white text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center ${
            blocked.length > 0 ? (isAuthBlock ? 'bg-amber-600' : 'bg-red-600') : 'bg-blue-600'
          }`}
        >
          {blocked.length > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {isAuthBlock
                  ? `Your session expired — sign in again to sync ${blocked.length} change${blocked.length > 1 ? 's' : ''}.`
                  : `1 change couldn't be saved: ${blocked[0].errorMessage ?? 'the server rejected it.'}`}
                {pendingCount > 0 && ` ${pendingCount} other change${pendingCount > 1 ? 's are' : ' is'} waiting behind it.`}
              </span>
              <button onClick={() => retryQueue()} className="underline hover:no-underline">
                Retry
              </button>
              {!isAuthBlock && (
                <button
                  onClick={() => discardFailedWrite(blocked[0].id!)}
                  className="underline hover:no-underline"
                >
                  Discard this change
                </button>
              )}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>Syncing {pendingCount} pending change{pendingCount > 1 ? 's' : ''}…</span>
            </>
          )}
        </div>
      ) : null}

      {conflicts.length > 0 && (
        <div className="bg-orange-100 border-b border-orange-300 text-orange-800 text-sm">
          <div className="px-4 py-2 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{conflicts.length} change{conflicts.length > 1 ? 's' : ''} need review — edited elsewhere while you were offline.</span>
            <button onClick={() => setShowConflicts((v) => !v)} className="underline hover:no-underline">
              {showConflicts ? 'Hide' : 'Review'}
            </button>
          </div>
          {showConflicts && (
            <div className="px-4 pb-3 space-y-2 max-w-2xl mx-auto">
              {conflicts.map((c) => (
                <div key={c.id} className="bg-white border border-orange-200 rounded-lg p-3 text-xs text-gray-700">
                  <p className="font-semibold mb-2">{describeResource(c.endpoint)} was changed by someone else</p>
                  <table className="w-full mb-2">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left font-medium pb-1">Field</th>
                        <th className="text-left font-medium pb-1">Your change</th>
                        <th className="text-left font-medium pb-1">Current value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {describeChanges(c).map((row) => (
                        <tr key={row.field}>
                          <td className="pr-3 py-0.5 text-gray-500">{row.field}</td>
                          <td className="pr-3 py-0.5 font-medium text-blue-700">{row.mine}</td>
                          <td className="py-0.5 font-medium text-orange-700">{row.current}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-2">
                    <button
                      onClick={() => keepMyChange(c.id!)}
                      className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                    >
                      Keep my change
                    </button>
                    <button
                      onClick={() => discardMyChange(c.id!)}
                      className="px-2 py-1 rounded border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                    >
                      Discard my change
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
