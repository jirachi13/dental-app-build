import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// App-wide action feedback (Sprint 23k / audit X2). One ToastProvider at the
// app root; screens call useToast().success/error/info after mutations so
// every save/archive/create confirms the same way. NOT for field-level
// validation (bare red text) or section banners (Notice.tsx) — this is for
// "the action you just took landed / failed".
type Variant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: Variant;
  message: string;
  /** exit animation in progress (Sprint 23w) — removed ~160ms after set */
  leaving?: boolean;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

const STYLES: Record<Variant, { Icon: typeof CheckCircle2; icon: string }> = {
  success: { Icon: CheckCircle2, icon: 'text-success' },
  error: { Icon: AlertCircle, icon: 'text-destructive' },
  info: { Icon: Info, icon: 'text-primary' },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  // two-step removal so the exit can animate: mark leaving (CSS .toast-leave
  // plays, 150ms), then actually remove. Under prefers-reduced-motion the
  // animation is a no-op and the toast just disappears 160ms later.
  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 160);
  }, []);

  const push = useCallback(
    (variant: Variant, message: string) => {
      const id = nextId.current++;
      // cap at 3 visible so a burst of saves can't wallpaper the screen
      setToasts((prev) => [...prev.slice(-2), { id, variant, message }]);
      // errors linger longer; both well past WCAG minimums for short text
      window.setTimeout(() => dismiss(id), variant === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 && (
        // sits above the page; bottom-right column, newest at the bottom.
        // Shares the corner with UpdateToast (rare enough that stacking is fine).
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map((t) => {
            const { Icon, icon } = STYLES[t.variant];
            return (
              <div
                key={t.id}
                role={t.variant === 'error' ? 'alert' : 'status'}
                className={`${t.leaving ? 'toast-leave' : 'rise'} pointer-events-auto bg-card rounded-xl border border-border shadow-lg px-4 py-3 flex items-center gap-2.5 max-w-sm`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${icon}`} />
                <span className="text-sm text-foreground min-w-0">{t.message}</span>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};
