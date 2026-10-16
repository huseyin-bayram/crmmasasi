import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategory } from "@/lib/tools/categories";
import { getToolGroups } from "@/lib/tools/navigation";
import { ToolIcon } from "./tool-icon";
import { ToolStatusBadge } from "./tool-meta";

/**
 * Compact, scannable list of tools generated from the registry.
 * Each row is a single link target (whole row clickable, one tab stop).
 */
export function ToolLauncher() {
  const groups = getToolGroups();
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`launcher-${group.id}`}>
          <h2
            id={`launcher-${group.id}`}
            className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase"
          >
            {group.label}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            {group.tools.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={tool.path}
                  className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-canvas focus-visible:-outline-offset-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-muted text-brand-700 group-hover:border-brand-100 group-hover:bg-brand-50">
                    <ToolIcon name={tool.icon} className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{tool.name}</span>
                      <ToolStatusBadge status={tool.status} />
                    </span>
                    <span className="mt-0.5 block text-ui text-ink-muted">{tool.description}</span>
                  </span>
                  <span className="hidden w-24 shrink-0 text-xs text-ink-subtle sm:block">
                    {getCategory(tool.category).label}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
