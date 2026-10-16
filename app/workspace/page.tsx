"use client";

import React from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { ExcelUploader } from "@/components/workspace/excel-uploader";
import { OperationTable } from "@/components/workspace/operation-table";
import { isBeforeDay, isSameDay, getTodayDateOnly, normalizeTurkishText } from "@/lib/excel-workspace";
import {
  FileSpreadsheet,
  User,
  ArrowRight,
  AlertTriangle,
  Clock,
  Ban,
  CalendarCheck,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

export default function WorkspacePage() {
  const { state, selectedOwner, setSelectedOwner, setIsQualityModalOpen, today } = useWorkspace();

  if (!state) {
    return (
      <div className="py-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-ink">CRM Kampanya Çalışma Alanı</h1>
          <p className="text-xs text-ink-muted mt-1">
            Ortak Excel dosyasını seçerek günlük operasyonlarınızı, geciken işleri ve günlük toplantı takip akışını görüntüleyin.
          </p>
        </div>
        <ExcelUploader />
      </div>
    );
  }

  // Calculate high-level status breakdown across the entire workbook
  const ops = state.operations;
  const todayOps = ops.filter((o) => o.derivedStatus === "action_today");
  const delayedOps = ops.filter((o) => o.derivedStatus === "delayed");
  const blockedOps = ops.filter((o) => o.derivedStatus === "blocked");
  const upcomingOps = ops.filter((o) => o.derivedStatus === "upcoming");
  const completedOps = ops.filter((o) => o.derivedStatus === "completed");
  const cancelledOps = ops.filter((o) => o.derivedStatus === "cancelled");
  const activeOps = ops.filter(
    (o) =>
      o.startDate &&
      isBeforeDay(o.startDate, today) &&
      o.endDate &&
      !isBeforeDay(o.endDate, today) &&
      o.derivedStatus !== "completed" &&
      o.derivedStatus !== "cancelled",
  );

  // Filtered by selected owner for quick preview
  const ownerOps = selectedOwner
    ? ops.filter((o) => normalizeTurkishText(o.owner) === normalizeTurkishText(selectedOwner))
    : ops;

  const urgentItems = ownerOps
    .filter((o) => o.derivedStatus === "action_today" || o.derivedStatus === "blocked" || o.derivedStatus === "delayed")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* File & Profile Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-line bg-surface">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
            <FileSpreadsheet className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-ink truncate" title={state.fileName || "Excel"}>
              {state.fileName || "Kampanya_Plani.xlsx"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted mt-1">
              <span>{state.validRowCount} aktif operasyon</span>
              <span className="text-line-strong">•</span>
              <span>{state.requests.size} CMS talebi</span>
              <span className="text-line-strong">•</span>
              <button
                type="button"
                onClick={() => setIsQualityModalOpen(true)}
                className="text-amber-800 hover:underline font-medium"
              >
                {state.qualityIssues.length} veri uyarısı
              </button>
            </div>
          </div>
        </div>

        {/* Owner Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto self-start sm:self-center">
          <label htmlFor="owner-select" className="text-xs text-ink-muted font-medium whitespace-nowrap flex items-center gap-1 shrink-0">
            <User className="size-3.5" /> Sorumlu:
          </label>
          <select
            id="owner-select"
            value={selectedOwner || ""}
            onChange={(e) => setSelectedOwner(e.target.value || null)}
            className="w-full sm:w-auto rounded border border-line bg-canvas px-2.5 py-1 text-xs text-ink font-medium focus:outline-hidden focus:border-brand-700"
          >
            <option value="">Tüm Ekip ({state.availableOwners.length} kişi)</option>
            {state.availableOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Summary Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="rounded border border-amber-300 bg-amber-50/80 p-2.5">
          <span className="text-[11px] font-semibold text-amber-900 block flex items-center gap-1">
            <Clock className="size-3 text-amber-700" /> Bugün
          </span>
          <span className="text-lg font-bold text-amber-950 mt-1 block font-mono">
            {todayOps.length}
          </span>
        </div>

        <div className="rounded border border-rose-300 bg-rose-50/80 p-2.5">
          <span className="text-[11px] font-semibold text-rose-900 block flex items-center gap-1">
            <AlertTriangle className="size-3 text-rose-700" /> Geciken
          </span>
          <span className="text-lg font-bold text-rose-950 mt-1 block font-mono">
            {delayedOps.length}
          </span>
        </div>

        <div className="rounded border border-red-300 bg-red-50/80 p-2.5">
          <span className="text-[11px] font-semibold text-red-900 block flex items-center gap-1">
            <Ban className="size-3 text-red-700" /> Blokeli
          </span>
          <span className="text-lg font-bold text-red-950 mt-1 block font-mono">
            {blockedOps.length}
          </span>
        </div>

        <div className="rounded border border-blue-200 bg-blue-50/80 p-2.5">
          <span className="text-[11px] font-semibold text-blue-900 block flex items-center gap-1">
            <Layers className="size-3 text-blue-700" /> Devam Eden
          </span>
          <span className="text-lg font-bold text-blue-950 mt-1 block font-mono">
            {activeOps.length}
          </span>
        </div>

        <div className="rounded border border-sky-200 bg-sky-50/80 p-2.5">
          <span className="text-[11px] font-semibold text-sky-900 block flex items-center gap-1">
            <Calendar className="size-3 text-sky-700" /> Yaklaşan
          </span>
          <span className="text-lg font-bold text-sky-950 mt-1 block font-mono">
            {upcomingOps.length}
          </span>
        </div>

        <div className="rounded border border-emerald-200 bg-emerald-50/80 p-2.5">
          <span className="text-[11px] font-semibold text-emerald-900 block flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-700" /> Tamamlanan
          </span>
          <span className="text-lg font-bold text-emerald-950 mt-1 block font-mono">
            {completedOps.length}
          </span>
        </div>

        <div className="rounded border border-line bg-canvas p-2.5">
          <span className="text-[11px] font-medium text-ink-subtle block">
            İptal
          </span>
          <span className="text-lg font-bold text-ink-muted mt-1 block font-mono">
            {cancelledOps.length}
          </span>
        </div>
      </div>

      {/* Main Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/workspace/my-work"
          className="p-4 rounded-lg border border-line bg-surface hover:border-brand-700 hover:shadow-xs transition-all group flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-800 uppercase tracking-wider">
              <User className="size-3.5" />
              <span>Ana Çalışma Ekranı</span>
            </div>
            <h3 className="text-sm font-semibold text-ink mt-1">Benim İşlerim</h3>
            <p className="text-xs text-ink-muted mt-1">
              {selectedOwner
                ? `${selectedOwner} sorumluluğundaki ${ownerOps.length} adet kampanya operasyonunu yönetin.`
                : "Sorumlu bazında filtrelenmiş operasyon listesini ve detaylarını görüntüleyin."}
            </p>
          </div>
          <ArrowRight className="size-4 text-ink-muted group-hover:text-brand-800 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
        </Link>

        <Link
          href="/workspace/daily-brief"
          className="p-4 rounded-lg border border-line bg-surface hover:border-brand-700 hover:shadow-xs transition-all group flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-800 uppercase tracking-wider">
              <CalendarCheck className="size-3.5" />
              <span>Toplantı Modu</span>
            </div>
            <h3 className="text-sm font-semibold text-ink mt-1">Günlük Toplantı Takip</h3>
            <p className="text-xs text-ink-muted mt-1">
              Bugün aksiyon bekleyen, geciken, blokeli ve önümüzdeki 3 gün başlayacak işleri sade bir akışla inceleyin.
            </p>
          </div>
          <ArrowRight className="size-4 text-ink-muted group-hover:text-brand-800 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
        </Link>
      </div>

      {/* Priority Action Items Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Öncelikli Aksiyonlar ({urgentItems.length})
          </h2>
          <Link
            href="/workspace/my-work"
            className="text-xs text-brand-700 hover:text-brand-900 font-medium"
          >
            Tümünü Görüntüle →
          </Link>
        </div>
        <OperationTable
          operations={urgentItems}
          emptyMessage="Bugün aksiyon bekleyen veya geciken acil bir operasyon bulunmuyor."
          showOwner={!selectedOwner}
        />
      </div>
    </div>
  );
}
