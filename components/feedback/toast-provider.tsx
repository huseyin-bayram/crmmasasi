"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";
import type { FeedbackTone } from "@/lib/tools/engine";
import { cn } from "@/lib/cn";

interface ToastInput {
  tone: FeedbackTone;
  message: string;
  durationMs?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

type Notify = (toast: ToastInput) => void;

const ToastContext = createContext<Notify>(() => {});

/**
 * Lightweight, non-blocking confirmations (e.g. "Panoya kopyalandı.").
 * Errors that need action are shown inline next to their source instead;
 * toasts are only for transient confirmations.
 */
export function useToast(): Notify {
  return useContext(ToastContext);
}

const toneStyles: Record<FeedbackTone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: "text-success" },
  warning: { icon: TriangleAlert, className: "text-warning" },
  error: { icon: CircleX, className: "text-danger" },
  info: { icon: Info, className: "text-info" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback<Notify>(
    ({ tone, message, durationMs }) => {
      nextId.current += 1;
      const id = nextId.current;
      // Keep at most 3 visible; replace identical consecutive messages.
      setToasts((current) => [
        ...current.filter((t) => t.message !== message).slice(-2),
        { id, tone, message },
      ]);
      const timeout = durationMs ?? (tone === "error" || tone === "warning" ? 8000 : 4000);
      timers.current.set(id, setTimeout(() => dismiss(id), timeout));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext value={notify}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => {
          const { icon: Icon, className } = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-2 rounded-md border border-line bg-surface py-2 pr-1.5 pl-3 text-ui text-ink shadow-[0_2px_8px_rgba(16,24,40,0.08)]"
            >
              <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", className)} />
              <p className="flex-1 py-px">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-0.5 text-ink-subtle hover:bg-canvas hover:text-ink"
                aria-label="Bildirimi kapat"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
