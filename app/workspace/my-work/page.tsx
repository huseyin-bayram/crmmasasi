"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { OperationTable } from "@/components/workspace/operation-table";
import { ExcelUploader } from "@/components/workspace/excel-uploader";
import { isBeforeDay, getTodayDateOnly, normalizeTurkishText } from "@/lib/excel-workspace";
import {
  User,
  Search,
  Filter,
  Layers,
  Clock,
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

type GroupKey =
  | "all"
  | "today"
  | "delayed"
  | "blocked"
  | "active"
  | "upcoming"
  | "completed"
  | "cancelled";

export default function MyWorkPage() {
  const { state, selectedOwner, setSelectedOwner, today } = useWorkspace();
  const [activeTab, setActiveTab] = useState<GroupKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Filter by selected owner first
  const ownerOperations = useMemo(() => {
    if (!state) return [];
    if (!selectedOwner) return state.operations;
    const lower = normalizeTurkishText(selectedOwner);
    return state.operations.filter(
      (op) => normalizeTurkishText(op.owner) === lower,
    );
  }, [state, selectedOwner]);

  // Group operations by operational state
  const grouped = useMemo(() => {
    const todayList = ownerOperations.filter((o) => o.derivedStatus === "action_today");
    const delayedList = ownerOperations.filter((o) => o.derivedStatus === "delayed");
    const blockedList = ownerOperations.filter((o) => o.derivedStatus === "blocked");
    const upcomingList = ownerOperations.filter((o) => o.derivedStatus === "upcoming");
    const completedList = ownerOperations.filter((o) => o.derivedStatus === "completed");
    const cancelledList = ownerOperations.filter((o) => o.derivedStatus === "cancelled");

    const activeList = ownerOperations.filter(
      (o) =>
        o.startDate &&
        isBeforeDay(o.startDate, today) &&
        o.endDate &&
        !isBeforeDay(o.endDate, today) &&
        o.derivedStatus !== "completed" &&
        o.derivedStatus !== "cancelled",
    );

    return {
      all: ownerOperations,
      today: todayList,
      delayed: delayedList,
      blocked: blockedList,
      active: activeList,
      upcoming: upcomingList,
      completed: completedList,
      cancelled: cancelledList,
    };
  }, [ownerOperations, today]);

  // Filter based on active tab, search, channel, and status
  const filteredOperations = useMemo(() => {
    let list = grouped[activeTab] || [];

    // Search: CMS Kodu, Kampanya Adı, Statü veya Sorumlu
    if (searchQuery.trim()) {
      const q = normalizeTurkishText(searchQuery);
      list = list.filter(
        (o) =>
          normalizeTurkishText(o.cmsCode).includes(q) ||
          normalizeTurkishText(o.campaignName).includes(q) ||
          normalizeTurkishText(o.sourceStatus).includes(q) ||
          normalizeTurkishText(o.statusExplanation.label).includes(q) ||
          normalizeTurkishText(o.owner).includes(q),
      );
    }

    // Channel filter
    if (selectedChannel !== "all") {
      list = list.filter((o) => o.channel === selectedChannel);
    }

    // Status filter
    if (selectedStatus !== "all") {
      list = list.filter((o) => o.derivedStatus === selectedStatus);
    }

    return list;
  }, [grouped, activeTab, searchQuery, selectedChannel, selectedStatus]);

  if (!state) {
    return (
      <div className="py-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-ink">Benim İşlerim</h1>
          <p className="text-xs text-ink-muted mt-1">
            İşlerinizi ve kampanya durumlarını incelemek için önce Excel dosyasını seçin.
          </p>
        </div>
        <ExcelUploader />
      </div>
    );
  }

  const tabs: { key: GroupKey; label: string; count: number; tone: string }[] = [
    { key: "all", label: "Tümü", count: grouped.all.length, tone: "text-ink" },
    { key: "today", label: "Bugün", count: grouped.today.length, tone: "text-amber-700 font-semibold" },
    { key: "delayed", label: "Geciken", count: grouped.delayed.length, tone: "text-rose-700 font-semibold" },
    { key: "blocked", label: "Blokeli", count: grouped.blocked.length, tone: "text-red-700 font-semibold" },
    { key: "active", label: "Devam Eden", count: grouped.active.length, tone: "text-blue-700" },
    { key: "upcoming", label: "Yaklaşan", count: grouped.upcoming.length, tone: "text-sky-700" },
    { key: "completed", label: "Tamamlanan", count: grouped.completed.length, tone: "text-emerald-700" },
    { key: "cancelled", label: "İptal", count: grouped.cancelled.length, tone: "text-ink-subtle" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar: Sorumlu Seçici & Ekip Özeti */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface">
        <div className="flex items-center gap-2">
          <label
            htmlFor="my-work-owner"
            className="text-xs font-semibold text-ink flex items-center gap-1.5 shrink-0"
          >
            <User className="size-4 text-brand-700" /> Sorumlu:
          </label>
          <select
            id="my-work-owner"
            value={selectedOwner || ""}
            onChange={(e) => setSelectedOwner(e.target.value || null)}
            className="rounded border border-line bg-canvas px-3 py-1.5 text-xs text-ink font-semibold focus:outline-hidden focus:border-brand-700"
          >
            <option value="">Tüm Ekip ({state.operations.length} operasyon)</option>
            {state.availableOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-ink-muted flex items-center gap-2">
          <span>
            {selectedOwner ? (
              <>
                <strong className="text-ink">{selectedOwner}</strong> için{" "}
                <span className="font-semibold text-brand-900">{ownerOperations.length}</span> kayıt
              </>
            ) : (
              `Toplam ${ownerOperations.length} kayıt listeleniyor`
            )}
          </span>
          {selectedOwner && (
            <button
              type="button"
              onClick={() => setSelectedOwner(null)}
              className="text-[11px] text-ink-subtle hover:text-ink underline ml-1"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar: Search, Channel, Status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-surface p-2.5 rounded border border-line">
        {/* Search */}
        <div className="relative w-full sm:flex-1 min-w-0">
          <Search className="size-3.5 text-ink-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="CMS Kodu veya Kampanya Adı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 sm:py-1 text-xs rounded border border-line bg-canvas text-ink placeholder:text-ink-subtle focus:outline-hidden focus:border-brand-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Channel Filter */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <label htmlFor="channel-filter" className="text-[11px] text-ink-muted font-medium shrink-0">
              Kanal:
            </label>
            <select
              id="channel-filter"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full sm:w-auto rounded border border-line bg-canvas px-2 py-1 text-xs text-ink focus:outline-hidden focus:border-brand-700"
            >
              <option value="all">Tüm Kanallar</option>
              {state.availableChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <label htmlFor="status-filter" className="text-[11px] text-ink-muted font-medium shrink-0">
              Durum:
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto rounded border border-line bg-canvas px-2 py-1 text-xs text-ink focus:outline-hidden focus:border-brand-700"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="action_today">Bugün Aksiyon</option>
              <option value="delayed">Gecikmiş</option>
              <option value="blocked">Blokeli</option>
              <option value="upcoming">Yaklaşan</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>

          {/* Reset active filters if any applied */}
          {(searchQuery || selectedChannel !== "all" || selectedStatus !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedChannel("all");
                setSelectedStatus("all");
              }}
              className="text-[11px] text-ink-muted hover:text-ink px-2 py-1 rounded border border-line hover:bg-canvas transition-colors ml-auto sm:ml-0"
            >
              Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Groups */}
      <div className="border-b border-line flex items-center gap-1 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-all whitespace-nowrap",
                isActive
                  ? "border-brand-700 text-brand-900 bg-surface font-semibold"
                  : "border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                  isActive
                    ? "bg-brand-100 text-brand-900"
                    : "bg-canvas text-ink-subtle",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compact Operations Table */}
      <OperationTable
        operations={filteredOperations}
        emptyMessage={
          searchQuery || selectedChannel !== "all" || selectedStatus !== "all"
            ? "Filtre kriterlerinize uygun operasyon kaydı bulunamadı."
            : activeTab === "all"
            ? "Bu sorumluya ait kayıt bulunamadı."
            : `Bu grupta (${tabs.find((t) => t.key === activeTab)?.label}) kayıt bulunmuyor.`
        }
        showOwner={!selectedOwner}
      />
    </div>
  );
}
