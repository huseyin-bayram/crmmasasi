"use client";

import React, { useState, useMemo } from "react";
import { useOngoingRealtime } from "./context";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  DeploymentStatus,
  GovernanceSeverity,
  LifecycleStatus,
  ScenarioRecord,
  ScenarioType,
} from "@/lib/ongoing-realtime/types";

export function TabAllScenarios() {
  const {
    workbookState,
    filteredScenarios,
    filters,
    setFilter,
    resetFilters,
    setSelectedScenario,
  } = useOngoingRealtime();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const availableProducts = workbookState?.availableProducts || [];
  const availableBUs = workbookState?.availableBusinessUnits || [];

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Pagination calculation
  const totalItems = filteredScenarios.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const paginatedScenarios = useMemo(() => {
    if (pageSize === -1) return filteredScenarios;
    const start = (currentPage - 1) * pageSize;
    return filteredScenarios.slice(start, start + pageSize);
  }, [filteredScenarios, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredScenarios.length) return;

    const headers = [
      "Tip",
      "Senaryo Adı",
      "Tespit Edilen ID",
      "Kampanya Adı",
      "Statü",
      "Yaşam Döngüsü",
      "Başlangıç Tarihi",
      "Bitiş Tarihi",
      "Kalan Gün",
      "Periyot / Cadence",
      "Tetiklenme Saati",
      "Segment / Event",
      "Ürün",
      "İş Birimi",
      "Açıklama",
      "Kritik Uyarı Sayısı",
    ];

    const rows = filteredScenarios.map((s) => [
      s.scenarioType,
      `"${s.scenarioName.replace(/"/g, '""')}"`,
      s.detectedCampaignId || "",
      `"${s.campaignName.replace(/"/g, '""')}"`,
      s.deploymentStatus,
      s.lifecycleStatus,
      s.startDateFormatted,
      s.endDateFormatted,
      s.daysUntilExpiry ?? "",
      `"${s.cadence} (${s.periodRaw})"`,
      `"${s.executionTime}"`,
      `"${s.segmentOrEvent.replace(/"/g, '""')}"`,
      `"${s.product.replace(/"/g, '""')}"`,
      `"${s.businessUnit.replace(/"/g, '""')}"`,
      `"${(s.description || "").replace(/"/g, '""')}"`,
      s.criticalCount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ongoing_realtime_senaryolar_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    filters.scenarioType !== "ALL" ||
    filters.deploymentStatus !== "ALL" ||
    filters.lifecycleStatus !== "ALL" ||
    filters.product !== "ALL" ||
    filters.businessUnit !== "ALL" ||
    filters.period !== "ALL" ||
    filters.triggerOrEvent !== "ALL" ||
    filters.governanceSeverity !== "ALL" ||
    filters.quickFilter !== "ALL";

  if (!workbookState) return null;

  return (
    <div className="space-y-4">
      {/* 1. Filter Bar & Search */}
      <div className="rounded-xl border border-line bg-surface p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => {
                setFilter({ searchQuery: e.target.value });
                setCurrentPage(1);
              }}
              placeholder="Senaryo adı, kampanya başlığı, 5 haneli ID, ürün, birim, event veya açıklama ara..."
              className="w-full h-9 pl-9 pr-8 text-xs rounded-lg border border-line bg-surface focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all placeholder:text-ink-subtle"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => setFilter({ searchQuery: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons: Export & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 px-3 rounded-lg border border-line bg-surface hover:bg-slate-100 text-xs font-medium text-ink transition-colors inline-flex items-center gap-1.5"
              >
                <X className="size-3.5" />
                <span>Filtreleri Temizle</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3 rounded-lg border border-line bg-surface hover:bg-slate-100 text-xs font-medium text-ink transition-colors inline-flex items-center gap-1.5"
              title="Filtrelenmiş tabloyu CSV olarak indir"
            >
              <Download className="size-3.5 text-ink-muted" />
              <span>Dışa Aktar (CSV)</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Scenario Type */}
          <div>
            <label className="block text-[11px] font-medium text-ink-subtle mb-1">Senaryo Tipi</label>
            <select
              value={filters.scenarioType}
              onChange={(e) => {
                setFilter({ scenarioType: e.target.value as "ALL" | "Ongoing" | "Real-time" });
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded-md border border-line bg-surface text-ink text-xs focus:ring-1 focus:ring-brand"
            >
              <option value="ALL">Tüm Tipler</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Real-time">Real-time</option>
            </select>
          </div>

          {/* Deployment Status */}
          <div>
            <label className="block text-[11px] font-medium text-ink-subtle mb-1">Statü</label>
            <select
              value={filters.deploymentStatus}
              onChange={(e) => {
                setFilter({ deploymentStatus: e.target.value as DeploymentStatus | "ALL" });
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded-md border border-line bg-surface text-ink text-xs focus:ring-1 focus:ring-brand"
            >
              <option value="ALL">Tüm Statüler</option>
              <option value="Deployed">Deployed (Canlı)</option>
              <option value="Undeployed">Undeployed (Taslak/Pasif)</option>
              <option value="Missing">Missing (Eksik)</option>
            </select>
          </div>

          {/* Lifecycle Status */}
          <div>
            <label className="block text-[11px] font-medium text-ink-subtle mb-1">Yaşam Döngüsü</label>
            <select
              value={filters.lifecycleStatus}
              onChange={(e) => {
                setFilter({ lifecycleStatus: e.target.value as LifecycleStatus | "ALL" });
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded-md border border-line bg-surface text-ink text-xs focus:ring-1 focus:ring-brand"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="Active">Active (Aktif)</option>
              <option value="Expiring <= 30">Bitişe ≤ 30 Gün</option>
              <option value="Expiring 31-90">Bitişe 31-90 Gün</option>
              <option value="Expired">Expired (Süresi Dolan)</option>
              <option value="Not Started">Not Started (Başlamamış)</option>
              <option value="Long-running">Long-running (Kalıcı)</option>
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-[11px] font-medium text-ink-subtle mb-1">Ürün Grubu</label>
            <select
              value={filters.product}
              onChange={(e) => {
                setFilter({ product: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded-md border border-line bg-surface text-ink text-xs focus:ring-1 focus:ring-brand truncate"
            >
              <option value="ALL">Tüm Ürünler ({availableProducts.length})</option>
              {availableProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Business Unit */}
          <div>
            <label className="block text-[11px] font-medium text-ink-subtle mb-1">İş Birimi</label>
            <select
              value={filters.businessUnit}
              onChange={(e) => {
                setFilter({ businessUnit: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded-md border border-line bg-surface text-ink text-xs focus:ring-1 focus:ring-brand truncate"
            >
              <option value="ALL">Tüm Birimler ({availableBUs.length})</option>
              {availableBUs.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Governance Severity */}
          <div>
            <label className="block text-[11px] font-medium text-ink-subtle mb-1">Governance</label>
            <select
              value={filters.governanceSeverity}
              onChange={(e) => {
                setFilter({ governanceSeverity: e.target.value as GovernanceSeverity | "ALL" });
                setCurrentPage(1);
              }}
              className="w-full h-8 px-2 rounded-md border border-line bg-surface text-ink text-xs focus:ring-1 focus:ring-brand"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="CRITICAL">Yalnızca Kritik</option>
              <option value="REVIEW">Yalnızca İnceleme</option>
              <option value="PLANNING">Yalnızca Planlama</option>
              <option value="INFO">Yalnızca Bilgi</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Active Pill Banner */}
        {filters.quickFilter !== "ALL" && (
          <div className="flex items-center gap-2 pt-2 border-t border-line/60 text-xs">
            <span className="text-ink-subtle">Hızlı Filtre Aktif:</span>
            <span className="font-semibold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
              {filters.quickFilter}
              <button
                type="button"
                onClick={() => setFilter({ quickFilter: "ALL" })}
                className="hover:text-ink text-ink-subtle ml-1"
              >
                &times;
              </button>
            </span>
          </div>
        )}
      </div>

      {/* 2. Scenarios High-Density Data Table */}
      <div className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
        {/* Table summary row */}
        <div className="px-4 py-2.5 bg-surface-muted border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-muted">
          <div>
            Toplam <span className="font-semibold text-ink">{workbookState.scenarios.length}</span> senaryo
            içerisinden{" "}
            <span className="font-semibold text-ink">{filteredScenarios.length}</span> kayıt
            listeleniyor.
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink-subtle">Sayfa Başına:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 px-1.5 rounded border border-line bg-surface text-xs text-ink focus:ring-1 focus:ring-brand"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>Tümü</option>
            </select>
          </div>
        </div>

        {/* Table element */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-muted/60 text-ink-subtle font-medium text-[11px]">
                <th className="py-2.5 px-3 w-20">Tip</th>
                <th className="py-2.5 px-3 min-w-[220px]">Senaryo Adı (Teknik Kod)</th>
                <th className="py-2.5 px-3 min-w-[200px]">Kampanya Adı (Kapsam)</th>
                <th className="py-2.5 px-2.5 w-24">Statü</th>
                <th className="py-2.5 px-2.5 w-28">Yaşam Döngüsü</th>
                <th className="py-2.5 px-3 w-36">Tarihler</th>
                <th className="py-2.5 px-3 min-w-[150px]">Periyot / Event</th>
                <th className="py-2.5 px-3 w-32">Ürün / Birim</th>
                <th className="py-2.5 px-2.5 w-24 text-center">Uyarılar</th>
                <th className="py-2.5 pr-3 pl-1 text-right w-16">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {paginatedScenarios.length > 0 ? (
                paginatedScenarios.map((sc) => {
                  const hasCritical = sc.criticalCount > 0;
                  const hasReview = sc.reviewCount > 0;

                  return (
                    <tr
                      key={sc.id}
                      onClick={() => setSelectedScenario(sc)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Scenario Type */}
                      <td className="py-2.5 px-3 align-top">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border inline-block ${
                            sc.scenarioType === "Ongoing"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}
                        >
                          {sc.scenarioType}
                        </span>
                      </td>

                      {/* Scenario Name */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-start gap-1.5">
                          <span
                            className="font-mono text-xs font-semibold text-ink group-hover:text-brand-900 break-all select-all"
                            title={sc.scenarioName}
                          >
                            {sc.scenarioName}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(sc.scenarioName, sc.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-ink-subtle hover:text-ink shrink-0 mt-0.5"
                            title="Senaryo adını kopyala"
                          >
                            {copiedId === sc.id ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>

                        {/* Badges for detected ID, version, or upstream */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {sc.detectedCampaignId && (
                            <span className="text-[10px] font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200 px-1 rounded">
                              ID: {sc.detectedCampaignId}
                            </span>
                          )}
                          {sc.detectedVersion && (
                            <span className="text-[10px] font-mono font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-1 rounded">
                              {sc.detectedVersion}
                            </span>
                          )}
                          {sc.upstreamScenarioName && (
                            <span className="text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-1 rounded truncate max-w-[140px]">
                              Kaynak: {sc.upstreamScenarioName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Campaign Name */}
                      <td className="py-2.5 px-3 align-top text-ink-muted">
                        <span className="line-clamp-2" title={sc.campaignName}>
                          {sc.campaignName || "-"}
                        </span>
                      </td>

                      {/* Deployment Status */}
                      <td className="py-2.5 px-2.5 align-top">
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border inline-block ${
                            sc.deploymentStatus === "Deployed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : sc.deploymentStatus === "Undeployed"
                              ? "bg-slate-100 text-slate-700 border-slate-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {sc.deploymentStatus}
                        </span>
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-2.5 px-2.5 align-top text-[11px]">
                        <span
                          className={`font-medium ${
                            sc.lifecycleStatus === "Expired"
                              ? "text-rose-700 font-semibold"
                              : sc.lifecycleStatus === "Expiring <= 30"
                              ? "text-amber-700 font-semibold"
                              : sc.lifecycleStatus === "Active"
                              ? "text-emerald-700"
                              : "text-ink-muted"
                          }`}
                        >
                          {sc.lifecycleStatus}
                        </span>
                        {sc.daysUntilExpiry !== null && (
                          <span className="block text-[10px] text-ink-subtle">
                            {sc.daysUntilExpiry < 0
                              ? `${Math.abs(sc.daysUntilExpiry)} gün önce doldu`
                              : `${sc.daysUntilExpiry} gün kaldı`}
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-2.5 px-3 align-top font-mono text-[11px] text-ink-muted whitespace-nowrap">
                        <div>{sc.startDateFormatted || "-"}</div>
                        <div className="text-ink-subtle text-[10px]">
                          &rarr; {sc.endDateFormatted || "-"}
                        </div>
                      </td>

                      {/* Period / Event */}
                      <td className="py-2.5 px-3 align-top text-[11px]">
                        {sc.scenarioType === "Ongoing" ? (
                          <div>
                            <span className="font-medium text-ink block">{sc.cadence}</span>
                            <span className="text-[10px] font-mono text-ink-subtle block truncate max-w-[160px]" title={sc.executionTime || sc.periodRaw}>
                              {sc.executionTime || sc.periodRaw || "-"}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono font-medium text-purple-900 block truncate max-w-[160px]" title={sc.segmentOrEvent}>
                              {sc.segmentOrEvent || "-"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Product & Business Unit */}
                      <td className="py-2.5 px-3 align-top text-[11px]">
                        <div className="font-medium text-ink truncate max-w-[120px]" title={sc.product}>
                          {sc.product || "-"}
                        </div>
                        <div className="text-[10px] text-ink-subtle truncate max-w-[120px]" title={sc.businessUnit}>
                          {sc.businessUnit || "-"}
                        </div>
                      </td>

                      {/* Governance Flags Count */}
                      <td className="py-2.5 px-2.5 align-top text-center">
                        {hasCritical ? (
                          <span
                            className="inline-flex items-center justify-center size-5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300"
                            title={`${sc.criticalCount} kritik sorun`}
                          >
                            {sc.criticalCount}
                          </span>
                        ) : hasReview ? (
                          <span
                            className="inline-flex items-center justify-center size-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300"
                            title={`${sc.reviewCount} inceleme notu`}
                          >
                            {sc.reviewCount}
                          </span>
                        ) : sc.flags.length > 0 ? (
                          <span
                            className="inline-flex items-center justify-center size-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium border border-line"
                            title={`${sc.flags.length} bildirim`}
                          >
                            {sc.flags.length}
                          </span>
                        ) : (
                          <span className="text-ink-subtle/40">-</span>
                        )}
                      </td>

                      {/* Detail button */}
                      <td className="py-2.5 pr-3 pl-1 align-top text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedScenario(sc);
                          }}
                          className="text-[11px] font-medium text-brand-700 hover:text-brand-900 hover:underline"
                        >
                          İncele
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-ink-subtle text-xs">
                    Filtre kriterlerine uygun senaryo bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Pagination Controls */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="px-4 py-3 bg-surface-muted border-t border-line flex items-center justify-between text-xs">
            <span className="text-ink-muted">
              Sayfa <strong className="text-ink">{currentPage}</strong> / {totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded border border-line bg-surface text-ink hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &larr; Önceki
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded border border-line bg-surface text-ink hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sonraki &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
