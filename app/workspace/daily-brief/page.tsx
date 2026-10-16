"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { OperationTable } from "@/components/workspace/operation-table";
import { ExcelUploader } from "@/components/workspace/excel-uploader";
import { StatusBadge, ChannelBadge } from "@/components/workspace/status-badge";
import {
  getTodayDateOnly,
  isAfterDay,
  isBeforeDay,
  daysDiff,
  formatDateOnly,
  normalizeTurkishText,
} from "@/lib/excel-workspace";
import {
  CalendarCheck,
  Clock,
  AlertTriangle,
  Ban,
  Calendar,
  User,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/cn";

export default function DailyBriefPage() {
  const { state, selectedOperation, selectOperation, today } = useWorkspace();
  const [filterOwner, setFilterOwner] = useState<string>("all");

  // Filter operations by owner if chosen
  const operations = useMemo(() => {
    if (!state) return [];
    if (filterOwner === "all") return state.operations;
    const lower = normalizeTurkishText(filterOwner);
    return state.operations.filter(
      (op) => normalizeTurkishText(op.owner) === lower,
    );
  }, [state, filterOwner]);

  // 1. Bugün: Bugün aksiyon gerektirenler
  const todayItems = useMemo(() => {
    return operations.filter((op) => op.derivedStatus === "action_today");
  }, [operations]);

  // 2. Gecikenler: Planlanan başlangıç tarihi geçmiş, tamamlanmamış
  const delayedItems = useMemo(() => {
    return operations.filter((op) => op.derivedStatus === "delayed");
  }, [operations]);

  // 3. Blokeliler: Not / durum kurallarına göre blokeli işler
  const blockedItems = useMemo(() => {
    return operations.filter((op) => op.derivedStatus === "blocked");
  }, [operations]);

  // 4. Yaklaşanlar: Önümüzdeki 3 gün içinde başlayacak operasyonlar (1, 2 veya 3 gün sonra)
  const upcomingItems = useMemo(() => {
    return operations.filter((op) => {
      if (!op.startDate) return false;
      if (op.derivedStatus === "completed" || op.derivedStatus === "cancelled") return false;
      if (!isAfterDay(op.startDate, today)) return false;
      const diff = daysDiff(today, op.startDate);
      return diff >= 1 && diff <= 3;
    });
  }, [operations, today]);

  if (!state) {
    return (
      <div className="py-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-ink">Günlük Toplantı Takip</h1>
          <p className="text-xs text-ink-muted mt-1">
            Toplantı akışını görüntülemek için önce ortak kampanya Excel dosyasını seçin.
          </p>
        </div>
        <ExcelUploader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standup Header & Owner Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-line bg-surface">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-brand-700" />
            <h1 className="text-base font-bold text-ink">Günlük Toplantı Takip (Daily Standup)</h1>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Bugün: <strong className="text-ink">{formatDateOnly(today)}</strong> • Ekip operasyonel durumu
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="standup-owner" className="text-xs font-semibold text-ink-muted flex items-center gap-1 shrink-0">
            <User className="size-3.5" /> Sorumlu:
          </label>
          <select
            id="standup-owner"
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="w-full sm:w-auto rounded border border-line bg-canvas px-3 py-1.5 text-xs text-ink font-semibold focus:outline-hidden focus:border-brand-700"
          >
            <option value="all">Tüm Ekip ({state.operations.length} operasyon)</option>
            {state.availableOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. BÖLÜM: BUGÜN */}
      <section className="space-y-2">
        <div className="flex items-center justify-between border-b border-line pb-1.5">
          <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-4 text-amber-700" />
            <span>Bugün Aksiyon Gerektirenler ({todayItems.length})</span>
          </h2>
          <span className="text-[11px] text-ink-subtle">
            Başlangıç tarihi bugüne eşit olan işler
          </span>
        </div>
        <OperationTable
          operations={todayItems}
          emptyMessage="Bugün aksiyon gerektiren herhangi bir kampanya operasyonu bulunmuyor."
          showOwner={filterOwner === "all"}
        />
      </section>

      {/* 2. BÖLÜM: GECİKENLER */}
      <section className="space-y-2">
        <div className="flex items-center justify-between border-b border-line pb-1.5">
          <h2 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-rose-700" />
            <span>Gecikenler ({delayedItems.length})</span>
          </h2>
          <span className="text-[11px] text-ink-subtle">
            Planlanan başlangıç tarihi geçmiş fakat tamamlanmamış işler
          </span>
        </div>
        <OperationTable
          operations={delayedItems}
          emptyMessage="Gecikmede olan açık kampanya operasyonu bulunmuyor."
          showOwner={filterOwner === "all"}
        />
      </section>

      {/* 3. BÖLÜM: BLOKELİLER */}
      <section className="space-y-2">
        <div className="flex items-center justify-between border-b border-line pb-1.5">
          <h2 className="text-xs font-bold text-red-950 uppercase tracking-wider flex items-center gap-1.5">
            <Ban className="size-4 text-red-700" />
            <span>Blokeliler ({blockedItems.length})</span>
          </h2>
          <span className="text-[11px] text-ink-subtle">
            PEGA, görsel veya onay bekleyen engelli operasyonlar
          </span>
        </div>

        {blockedItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-subtle bg-surface rounded border border-line">
            Şu anda blokeli olarak işaretlenmiş operasyon bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {blockedItems.map((op) => (
              <div
                key={op.rowId}
                tabIndex={0}
                onClick={() => selectOperation(op)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectOperation(op);
                  }
                }}
                className="p-3 rounded border border-red-200 bg-surface hover:bg-red-50/40 cursor-pointer transition-colors space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-ink-muted bg-canvas border border-line px-1.5 py-0.2 rounded">
                      {op.cmsCode || "—"}
                    </span>
                    <ChannelBadge channel={op.channel} />
                    <span className="text-xs text-ink truncate font-semibold">
                      {op.owner || "Sorumlu Belirtilmemiş"}
                    </span>
                  </div>
                  <ChevronRight className="size-4 text-ink-subtle group-hover:text-red-700 shrink-0 mt-0.5 transition-colors" />
                </div>

                <div className="text-xs font-medium text-ink truncate" title={op.campaignName}>
                  {op.campaignName}
                </div>

                {/* Engel Nedeni (Explicit Block Reason) */}
                <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-950 flex items-start gap-1.5">
                  <ShieldAlert className="size-3.5 text-red-700 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <strong className="font-semibold">Engel Nedeni:</strong>{" "}
                    <span>{op.statusExplanation.reason}</span>
                    {op.note && op.note !== op.statusExplanation.reason && (
                      <div className="text-[11px] text-red-900/80 mt-0.5 truncate">
                        Not: {op.note}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. BÖLÜM: YAKLAŞANLAR (ÖNÜMÜZDEKİ 3 GÜN) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between border-b border-line pb-1.5">
          <h2 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="size-4 text-sky-700" />
            <span>Yaklaşanlar — Önümüzdeki 3 Gün ({upcomingItems.length})</span>
          </h2>
          <span className="text-[11px] text-ink-subtle">
            Önümüzdeki 72 saat içinde başlangıç tarihi gelen işler
          </span>
        </div>
        <OperationTable
          operations={upcomingItems}
          emptyMessage="Önümüzdeki 3 gün içinde başlayacak operasyon bulunmuyor."
          showOwner={filterOwner === "all"}
        />
      </section>
    </div>
  );
}
