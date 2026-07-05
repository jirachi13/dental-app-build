import { X, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// "New version available" toast. Pairs with registerType: 'prompt' in
// vite.config.ts and the SKIP_WAITING listener in sw.ts — after a deploy the
// new service worker waits until the user clicks Refresh, instead of open
// tabs silently running stale assets until a hard refresh.
export const UpdateToast = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-4 flex items-center gap-3 max-w-sm">
      <div className="text-sm text-gray-700">A new version of FLORAL is available.</div>
      <button
        onClick={() => updateServiceWorker(true)}
        className="flex items-center gap-1.5 bg-[#1E40AF] hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Refresh
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss update notification"
        className="text-gray-500 hover:text-gray-600 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
