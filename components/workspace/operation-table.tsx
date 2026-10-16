"use client";

import React from "react";
import type { CampaignOperation } from "@/lib/excel-workspace";
import { formatDateOnly } from "@/lib/excel-workspace";
import { useWorkspace } from "./workspace-provider";
import { StatusBadge, ChannelBadge } from "./status-badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface OperationTableProps {
  operations: CampaignOperation[];
  emptyMessage?: string;
  showOwner?: boolean;
}

export function OperationTable({
  operations,
  emptyMessage = "Görüntülenecek operasyon bulunamadı.",
  showOwner = false,
}: OperationTableProps) {
  const { selectOperation, selectedOperation } = useWorkspace();

  if (operations.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-ink-subtle bg-surface rounded border border-line">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded border border-line bg-surface overscroll-x-contain touch-pan-x">
      <table className="w-full min-w-[720px] text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-line bg-surface-muted text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
            <th className="py-2 px-3 w-28">CMS Kodu</th>
            <th className="py-2 px-3 min-w-[200px]">Kampanya Adı</th>
            <th className="py-2 px-2.5 w-24">Kanal</th>
            <th className="py-2 px-2.5 w-24">Başlangıç</th>
            <th className="py-2 px-2.5 w-24">Bitiş</th>
            <th className="py-2 px-3 w-36">Talep Birimi</th>
            {showOwner && <th className="py-2 px-3 w-32">Sorumlu</th>}
            <th className="py-2 px-3 w-32">Durum</th>
            <th className="py-2 px-3 min-w-[160px]">Not</th>
            <th className="py-2 px-2 w-8" aria-label="Aksiyonlar"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {operations.map((op) => {
            const isSelected = selectedOperation?.rowId === op.rowId;
            return (
              <tr
                key={op.rowId}
                tabIndex={0}
                onClick={() => selectOperation(op)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectOperation(op);
                  }
                }}
                className={cn(
                  "cursor-pointer transition-colors group focus:outline-hidden focus:bg-brand-50/60",
                  isSelected
                    ? "bg-brand-50/80 font-medium"
                    : "hover:bg-canvas text-ink",
                )}
              >
                <td className="py-2 px-3 font-mono text-[11px] font-bold text-ink-muted truncate">
                  {op.cmsCode || "—"}
                </td>
                <td className="py-2 px-3 font-medium text-ink truncate max-w-[280px]" title={op.campaignName}>
                  {op.campaignName || "—"}
                </td>
                <td className="py-2 px-2.5">
                  <ChannelBadge channel={op.channel} />
                </td>
                <td className="py-2 px-2.5 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                  {formatDateOnly(op.startDate)}
                </td>
                <td className="py-2 px-2.5 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                  {formatDateOnly(op.endDate)}
                </td>
                <td className="py-2 px-3 text-ink-muted truncate max-w-[140px]" title={op.requestingUnit}>
                  {op.requestingUnit || "—"}
                </td>
                {showOwner && (
                  <td className="py-2 px-3 text-ink-muted truncate max-w-[130px]" title={op.owner}>
                    {op.owner || "—"}
                  </td>
                )}
                <td className="py-2 px-3">
                  <StatusBadge
                    status={op.derivedStatus}
                    label={op.statusExplanation.label}
                  />
                </td>
                <td
                  className="py-2 px-3 text-ink-subtle truncate max-w-[220px]"
                  title={op.note}
                >
                  {op.note || "—"}
                </td>
                <td className="py-2 px-2 text-right">
                  <ChevronRight className="size-3.5 text-ink-subtle group-hover:text-ink transition-colors" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
