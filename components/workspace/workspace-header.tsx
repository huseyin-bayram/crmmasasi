"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "./workspace-provider";
import {
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  User,
  LayoutDashboard,
  CheckSquare,
  Users,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";

export function WorkspaceHeader() {
  const pathname = usePathname();
  const { state, closeWorkbook, selectedOwner, setIsQualityModalOpen } = useWorkspace();

  if (!state) {
    return (
      <div className="shrink-0 border-b border-line bg-surface px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <FileSpreadsheet className="size-4 text-ink-subtle" />
          <span>Henüz bir Excel çalışma kitabı yüklenmedi.</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
          <ShieldCheck className="size-3.5" />
          <span>Zero Campaign Data Egress</span>
        </div>
      </div>
    );
  }

  const issuesCount = state.qualityIssues.length;
  const errorCount = state.qualityIssues.filter((i) => i.severity === "error").length;

  return (
    <header className="shrink-0 border-b border-line bg-surface px-3 py-2 sm:px-4 sm:py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
      {/* File & Data Info */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 font-medium text-ink truncate">
          <FileSpreadsheet className="size-4 text-emerald-700 shrink-0" />
          <span className="truncate max-w-[140px] sm:max-w-[200px]" title={state.fileName || "Excel"}>
            {state.fileName || "Kampanya_Plani.xlsx"}
          </span>
        </div>

        <span className="text-line-strong">•</span>

        <span className="text-ink-muted shrink-0 font-medium">
          {state.validRowCount} kayıt
        </span>

        <span className="text-line-strong">•</span>

        {/* Clickable Quality Pill */}
        <button
          type="button"
          onClick={() => setIsQualityModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors shrink-0",
            issuesCount === 0
              ? "bg-canvas text-ink-muted border-line hover:bg-surface-muted"
              : errorCount > 0
              ? "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
              : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100",
          )}
          title="Veri kalitesi detaylarını görüntüle"
        >
          <AlertTriangle className="size-3" />
          <span>
            {issuesCount === 0 ? "Sorunsuz" : `${issuesCount} uyarı`}
          </span>
        </button>

        {selectedOwner && (
          <>
            <span className="text-line-strong hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1 text-ink-subtle shrink-0">
              <User className="size-3 text-ink-muted" />
              <span>Sorumlu:</span>
              <strong className="text-ink">{selectedOwner}</strong>
            </div>
          </>
        )}
      </div>

      {/* Nav shortcuts & Close Excel Action */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 border-line/60 pt-1.5 sm:pt-0">
        <nav className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 sm:border-r sm:border-line sm:pr-2 sm:mr-1">
          <Link
            href="/workspace"
            className={cn(
              "px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors",
              pathname === "/workspace"
                ? "bg-brand-50 text-brand-900 font-semibold"
                : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            Genel Bakış
          </Link>
          <Link
            href="/workspace/my-work"
            className={cn(
              "px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors",
              pathname === "/workspace/my-work"
                ? "bg-brand-50 text-brand-900 font-semibold"
                : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            Benim İşlerim
          </Link>
          <Link
            href="/workspace/daily-brief"
            className={cn(
              "px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors",
              pathname === "/workspace/daily-brief"
                ? "bg-brand-50 text-brand-900 font-semibold"
                : "text-ink-muted hover:bg-canvas hover:text-ink",
            )}
          >
            Günlük Toplantı Takip
          </Link>
        </nav>

        {/* Excel'i Kapat Button */}
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Açık olan Excel çalışma kitabını kapatmak ve tüm kampanya verilerini bellekten temizlemek istediğinize emin misiniz?",
              )
            ) {
              closeWorkbook();
            }
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-line hover:border-rose-300 hover:bg-rose-50 text-ink-muted hover:text-rose-700 text-xs font-medium whitespace-nowrap transition-colors shrink-0"
          title="Çalışma kitabını bellekten tamamen siler"
        >
          <XCircle className="size-3.5" />
          <span>Excel&apos;i Kapat</span>
        </button>
      </div>
    </header>
  );
}
