import type { ButtonHTMLAttributes, Ref } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  ref?: Ref<HTMLButtonElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 disabled:bg-line-strong",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-canvas active:bg-line disabled:text-ink-subtle disabled:hover:bg-surface",
  ghost:
    "text-ink-muted hover:bg-canvas hover:text-ink active:bg-line disabled:text-ink-subtle disabled:hover:bg-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 px-2 text-ui",
  md: "h-8 gap-2 px-3 text-sm",
};

/**
 * Button hierarchy:
 *  - primary:   the one main action of a workspace (Dönüştür, Düzelt, Kontrol et)
 *  - secondary: important but supporting actions (Kopyala, Dosya yükle)
 *  - ghost:     low-emphasis actions (Temizle)
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  className,
  children,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded font-medium transition-colors select-none disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={2} /> : null}
      {children}
    </button>
  );
}
