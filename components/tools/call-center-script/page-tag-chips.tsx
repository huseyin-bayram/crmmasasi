"use client";

import { CheckCircle2, AlertTriangle, XCircle, Plus } from "lucide-react";
import type { PageTagAnalysis } from "@/lib/call-center-script";
import { EVAM_PAGE_TAGS } from "@/lib/call-center-script/constants";
import { cn } from "@/lib/cn";

interface PageTagChipsProps {
  analysis: PageTagAnalysis;
  onInsertTag: (tag: string) => void;
  readOnly?: boolean;
}

export function PageTagChips({ analysis, onInsertTag, readOnly = false }: PageTagChipsProps) {
  const tags = [
    {
      key: "page1",
      tag: EVAM_PAGE_TAGS.page1,
      label: "Page1",
      info: analysis.page1,
    },
    {
      key: "page2",
      tag: EVAM_PAGE_TAGS.page2,
      label: "Page2",
      info: analysis.page2,
    },
    {
      key: "approvePage",
      tag: EVAM_PAGE_TAGS.approvePage,
      label: "ApprovePage",
      info: analysis.approvePage,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-ink-muted mr-1">Zorunlu Etiketler:</span>
      {tags.map(({ key, tag, label, info }) => {
        const isOk = info.count === 1;
        const isMissing = info.count === 0;
        const isMultiple = info.count > 1;

        return (
          <button
            key={key}
            type="button"
            disabled={readOnly}
            onClick={() => onInsertTag(tag)}
            title={
              isOk
                ? `${tag} mevcut (${info.count} adet). İmleç konumuna eklemek için tıklayın.`
                : isMissing
                ? `${tag} eksik! İmleç konumuna eklemek için tıklayın.`
                : `${tag} fazla (${info.count} adet)! Tek olması gerekir.`
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors border",
              isOk &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
              isMissing &&
                "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
              isMultiple &&
                "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20",
              readOnly && "cursor-default opacity-80",
            )}
          >
            {isOk ? (
              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
            ) : isMissing ? (
              <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
            ) : (
              <XCircle className="size-3 text-rose-600 dark:text-rose-400" />
            )}
            <span>{label}</span>
            <span
              className={cn(
                "px-1 py-0.2 rounded text-[10px] tabular-nums font-semibold",
                isOk && "bg-emerald-500/20",
                isMissing && "bg-amber-500/20",
                isMultiple && "bg-rose-500/20",
              )}
            >
              {info.count}
            </span>
            {!readOnly && (
              <Plus className="size-2.5 opacity-60 hover:opacity-100 ml-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
