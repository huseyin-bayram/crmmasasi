"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface ResultPanelProps {
  id: string;
  title: string;
  /** One-line headline next to the title, e.g. "12 karakter düzeltildi". */
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When true, clicking the header toggles the panel content */
  collapsible?: boolean;
  /** Initial open state when collapsible is true. Defaults to false (collapsed) */
  defaultOpen?: boolean;
}

/**
 * Result / validation / technical standards area.
 * Supports collapsible behavior so users can expand or collapse technical rules on click.
 */
export function ResultPanel({
  id,
  title,
  summary,
  actions,
  children,
  className,
  bodyClassName,
  collapsible = false,
  defaultOpen = false,
}: ResultPanelProps) {
  const [isOpen, setIsOpen] = useState(collapsible ? defaultOpen : true);
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface", className)}
    >
      <header
        className={cn(
          "flex min-h-9 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-surface-muted px-3 py-2",
          isOpen ? "border-b border-line" : "",
          collapsible && "cursor-pointer select-none transition-colors hover:bg-black/[0.03]"
        )}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        role={collapsible ? "button" : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        aria-controls={collapsible ? contentId : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsOpen(!isOpen);
                }
              }
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          {collapsible ? (
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-ink-subtle transition-transform duration-150",
                isOpen ? "rotate-0 text-brand-700" : "-rotate-90"
              )}
            />
          ) : null}
          <h2 id={headingId} className="text-ui font-semibold text-ink">
            {title}
          </h2>
        </div>

        {summary ? <div className="min-w-0 text-ui text-ink-muted">{summary}</div> : null}

        {actions ? (
          <div
            className="ml-auto flex items-center gap-1"
            onClick={(e) => {
              // Prevent header toggle when clicking action buttons inside the header
              if (collapsible) e.stopPropagation();
            }}
          >
            {actions}
          </div>
        ) : collapsible ? (
          <div className="ml-auto text-xs font-medium text-ink-subtle">
            {isOpen ? "Gizle" : "Detayları Göster"}
          </div>
        ) : null}
      </header>

      {isOpen ? (
        <div id={contentId} className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
