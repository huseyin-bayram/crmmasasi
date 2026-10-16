import { Circle, CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import type { ToolRunState } from "@/lib/tools/engine";
import { cn } from "@/lib/cn";

const stateConfig: Record<
  ToolRunState,
  { label: string; icon: typeof Info; className: string; spin?: boolean }
> = {
  idle: { label: "Hazır", icon: Circle, className: "text-ink-subtle" },
  processing: { label: "İşleniyor", icon: LoaderCircle, className: "text-info", spin: true },
  success: { label: "Tamamlandı", icon: CircleCheck, className: "text-success" },
  warning: { label: "Uyarılarla tamamlandı", icon: TriangleAlert, className: "text-warning" },
  error: { label: "Hata", icon: CircleX, className: "text-danger" },
  info: { label: "İşlem yapılmadı", icon: Info, className: "text-info" },
};

interface StatusIndicatorProps {
  state: ToolRunState;
  /** Overrides the default label for the state. */
  label?: string;
  className?: string;
}

/**
 * Always-visible system status of a tool workspace (icon + text, never
 * color alone). Announced politely to screen readers when it changes.
 */
export function StatusIndicator({ state, label, className }: StatusIndicatorProps) {
  const config = stateConfig[state];
  const Icon = config.icon;
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-1.5 text-ui font-medium", config.className, className)}
    >
      <Icon aria-hidden="true" className={cn("size-3.5", config.spin && "animate-spin")} strokeWidth={2.25} />
      <span className="sr-only">Durum:</span>
      <span className={state === "idle" ? "text-ink-muted" : undefined}>{label ?? config.label}</span>
    </p>
  );
}
