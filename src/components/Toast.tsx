import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** ms; padrão 5000 (SPEC §5.2: desfazer por 5s). */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const seq = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    seq.current += 1;
    setToast({ ...options, id: seq.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((t) => (t?.id === toast.id ? null : t));
    }, toast.duration ?? 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-30 mx-auto flex max-w-[480px] justify-center px-4"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-14 w-full flap items-center gap-3 rounded-[4px] bg-tile py-1 pr-1 pl-4 text-base font-semibold text-on-tile"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                className="min-h-12 rounded-[3px] bg-sign px-4 font-bold text-on-sign"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
