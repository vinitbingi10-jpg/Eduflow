import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn.js";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, ring: "border-ok-500/30", bar: "bg-ok-500", text: "text-ok-600" },
  warning: { icon: AlertTriangle, ring: "border-warn-500/30", bar: "bg-warn-500", text: "text-warn-600" },
  error: { icon: XCircle, ring: "border-danger-500/30", bar: "bg-danger-500", text: "text-danger-600" },
  info: { icon: Info, ring: "border-info-500/30", bar: "bg-info-500", text: "text-info-600" },
  ai: { icon: Sparkles, ring: "border-brand-500/30", bar: "bg-brand-500", text: "text-brand-600" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item = {
        id,
        message,
        tone: options.tone ?? "info",
        description: options.description,
        duration: options.duration ?? 3600,
      };
      setToasts((list) => [...list.slice(-3), item]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), item.duration)
      );
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="print-hide pointer-events-none fixed bottom-14 right-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((item) => {
          const tone = TONES[item.tone] ?? TONES.info;
          const Icon = tone.icon;
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-md border bg-white px-3.5 py-3 shadow-pop animate-slide-up",
                tone.ring
              )}
            >
              <span className={cn("absolute inset-y-0 left-0 w-[3px]", tone.bar)} />
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.text)} strokeWidth={2.2} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-ink-900">{item.message}</p>
                {item.description && (
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
