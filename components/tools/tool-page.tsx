import Link from "next/link";
import type { ReactNode } from "react";
import { appConfig } from "@/lib/app-config";
import { getTool, type ToolId } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";
import { DataHandlingNote, ToolStatusBadge } from "./tool-meta";

interface ToolPageProps {
  toolId: ToolId;
  children: ReactNode;
  /**
   * `fill`: workspace fills the viewport height on desktop (editors).
   * `flow`: page grows with content.
   */
  layout?: "fill" | "flow";
}

/**
 * Shared structure for every tool: compact context + title + one sentence,
 * then the workspace immediately. All header data comes from the registry.
 */
export function ToolPage({ toolId, children, layout = "fill" }: ToolPageProps) {
  const tool = getTool(toolId);
  return (
    <div className={cn("flex flex-col", layout === "fill" && "lg:h-dvh lg:min-h-[620px]")}>
      <header className="shrink-0 px-4 pt-4 pb-3 lg:px-6">
        <nav aria-label="Konum">
          <ol className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <li>
              <Link href={appConfig.basePath} className="rounded-sm hover:text-ink hover:underline">
                {appConfig.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink-muted">
              {tool.name}
            </li>
          </ol>
        </nav>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg leading-7 font-semibold tracking-[-0.01em] text-ink">{tool.name}</h1>
              <ToolStatusBadge status={tool.status} />
            </div>
            <p className="text-sm text-ink-muted">{tool.description}</p>
          </div>
          <DataHandlingNote mode={tool.dataHandling} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 lg:px-6 lg:pb-5">{children}</div>
    </div>
  );
}

/** Row directly above the workspace: primary action on the left, status on the right. */
export function WorkspaceToolbar({ children, status }: { children: ReactNode; status?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 pb-3">
      {children}
      {status ? <div className="ml-auto">{status}</div> : null}
    </div>
  );
}
