import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-canvas text-ink-muted",
  brand: "border-brand-100 bg-brand-50 text-brand-900",
  success: "border-success-line bg-success-bg text-success",
  warning: "border-warning-line bg-warning-bg text-warning",
  danger: "border-danger-line bg-danger-bg text-danger",
  info: "border-info-line bg-info-bg text-info",
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  title?: string;
}

/** Static status label. Never interactive, never color-only (always has text). */
export function Badge({ tone = "neutral", icon: Icon, children, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-[3px] border px-1.5 text-[11px] leading-none font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3" strokeWidth={2.25} /> : null}
      {children}
    </span>
  );
}
