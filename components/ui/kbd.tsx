import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface KbdProps {
  children: ReactNode;
  /** Use on dark/brand backgrounds such as the primary button. */
  inverted?: boolean;
  className?: string;
}

export function Kbd({ children, inverted = false, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] items-center rounded-[3px] border px-1 font-sans text-[11px] leading-none font-medium",
        inverted
          ? "border-white/35 text-white/90"
          : "border-line-strong bg-surface text-ink-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
