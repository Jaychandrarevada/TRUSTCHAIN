/**
 * Toast system — queued (max 3), 5 s auto-dismiss with pause-on-hover,
 * aria-live=polite; danger toasts persist until dismissed (spec §7 Toast).
 */
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils";

type ToastTone = "success" | "info" | "warning" | "danger";
interface Toast { id: number; tone: ToastTone; message: string }

const icons = { success: CheckCircle2, info: Info, warning: TriangleAlert, danger: XCircle };
const tones = {
  success: "border-success-700/30", info: "border-info-700/30",
  warning: "border-warning-700/30", danger: "border-danger-700/40",
};

const ToastContext = createContext<((tone: ToastTone, message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, tone, message }]); // queue max 3
    if (tone !== "danger") {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn("glass-strong flex items-start gap-2 rounded-xl border p-3 text-sm shadow-lg animate-fade-up",
                tones[toast.tone])}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="flex-1">{toast.message}</p>
              <button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"
                className="text-text-secondary hover:text-text-primary">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside <ToastProvider>");
  return push;
}
