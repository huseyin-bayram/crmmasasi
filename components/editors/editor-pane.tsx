import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EditorPaneProps {
  /** Used to derive the heading id that labels the editor inside. */
  id: string;
  label: string;
  /** Small contextual info next to the label (file name, counts). */
  meta?: ReactNode;
  /** Actions that affect this pane only (Kopyala, Temizle, Dosya yükle). */
  actions?: ReactNode;
  footer?: ReactNode;
  invalid?: boolean;
  children: ReactNode;
  className?: string;
}

export function paneHeadingId(id: string): string {
  return `${id}-label`;
}

/**
 * Frame for an input or output editor. Actions sit in the pane header,
 * directly next to the content they affect.
 */
export function EditorPane({
  id,
  label,
  meta,
  actions,
  footer,
  invalid = false,
  children,
  className,
}: EditorPaneProps) {
  return (
    <section
      aria-labelledby={paneHeadingId(id)}
      className={cn(
        "flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-md border bg-surface",
        invalid
          ? "border-danger"
          : "border-line has-[textarea:focus]:border-brand-700 has-[textarea:focus]:ring-1 has-[textarea:focus]:ring-brand-700",
        className,
      )}
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-line bg-surface-muted pr-1.5 pl-3">
        <h2 id={paneHeadingId(id)} className="text-ui font-semibold whitespace-nowrap text-ink">
          {label}
        </h2>
        {meta ? <div className="min-w-0 truncate text-xs text-ink-subtle">{meta}</div> : null}
        {actions ? <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
      {footer ? (
        <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-line px-3 text-xs text-ink-subtle tabular-nums">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
