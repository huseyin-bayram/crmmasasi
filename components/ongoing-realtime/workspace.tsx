"use client";

import React, { useRef, useState } from "react";
import { useOngoingRealtime } from "./context";
import { TabOverview } from "./tab-overview";
import { TabOngoing } from "./tab-ongoing";
import { TabRealtime } from "./tab-realtime";
import { TabControlCenter } from "./tab-control-center";
import { TabAllScenarios } from "./tab-all-scenarios";
import { ScenarioDetailDrawer } from "./scenario-detail-drawer";
import {
  FileSpreadsheet,
  Upload,
  PlayCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Clock,
  LayoutDashboard,
  Layers,
  Sparkles,
} from "lucide-react";
import { ActiveTab } from "@/lib/ongoing-realtime/types";

export function OngoingRealtimeWorkspace() {
  const {
    workbookState,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    loadFile,
    loadSample,
    closeExcel,
  } = useOngoingRealtime();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        loadFile(buffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        loadFile(buffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const tabs: { id: ActiveTab; label: string; badge?: number | string; badgeColor?: string }[] = [
    { id: "overview", label: "Genel Bakış" },
    {
      id: "ongoing",
      label: "Ongoing",
      badge: workbookState?.summary.ongoingCount,
      badgeColor: "bg-sky-100 text-sky-800",
    },
    {
      id: "realtime",
      label: "Real-time",
      badge: workbookState?.summary.realtimeCount,
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      id: "control-center",
      label: "Kontrol Merkezi",
      badge: workbookState?.summary.criticalIssuesCount
        ? `${workbookState.summary.criticalIssuesCount} Kritik`
        : undefined,
      badgeColor: "bg-rose-100 text-rose-800 font-bold",
    },
    {
      id: "all-scenarios",
      label: "Tüm Senaryolar",
      badge: workbookState?.scenarios.length,
      badgeColor: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-canvas">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm,.xlsb"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Header & Toolbar */}
      <header className="border-b border-line bg-surface px-4 py-3 sm:px-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                Ongoing &amp; Real-time
              </span>
              <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                <ShieldCheck className="size-3 text-emerald-600" />
                <span>Zero Campaign Data Egress</span>
              </div>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
              Senaryo Portföyü ve Mimari Yönetimi
            </h1>
            <p className="text-xs text-ink-subtle">
              Deployment sağlığı, yaşam döngüsü, trigger mimarisi ve kural tabanlı yönetişim
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand hover:bg-brand-700 text-ink font-semibold hover:text-white text-xs transition-colors shadow-2xs cursor-pointer"
            >
              <Upload className="size-3.5" />
              <span>Excel Yükle</span>
            </button>

            <button
              type="button"
              onClick={loadSample}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface hover:bg-slate-100 text-ink font-medium text-xs transition-colors cursor-pointer"
            >
              <PlayCircle className="size-3.5 text-brand-700" />
              <span>Örnek Yükle</span>
            </button>

            {workbookState && (
              <button
                type="button"
                onClick={closeExcel}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-ink-muted text-xs transition-colors cursor-pointer"
                title="Excel verilerini bellekten tamamen sil"
              >
                <XCircle className="size-3.5" />
                <span>Excel&apos;i Kapat</span>
              </button>
            )}
          </div>
        </div>

        {/* Workbook metadata strip when loaded */}
        {workbookState && (
          <div className="mt-3 pt-2.5 border-t border-line/60 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <span className="font-semibold text-ink">{workbookState.fileName}</span>
              <span className="text-ink-subtle">•</span>
              <span>
                {workbookState.scenarios.length} senaryo ({workbookState.summary.ongoingCount} Ongoing,{" "}
                {workbookState.summary.realtimeCount} Real-time)
              </span>
            </div>

            <div className="text-[11px] text-ink-subtle">
              Yüklenme: {workbookState.loadedAt.toLocaleTimeString("tr-TR")}
            </div>
          </div>
        )}
      </header>

      {/* Navigation Tabs (Only shown when workbook loaded) */}
      {workbookState && (
        <div className="border-b border-line bg-surface px-4 sm:px-6">
          <nav aria-label="Modül Sekmeleri" className="flex space-x-1 sm:space-x-3 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-brand-700 text-brand-900 bg-brand-50/60 font-semibold"
                      : "border-transparent text-ink-muted hover:text-ink hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        tab.badgeColor || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {/* Loading overlay / spinner */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="inline-block size-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
            <p className="text-sm font-medium text-ink">Excel çalışma kitabı çözümleniyor...</p>
            <p className="text-xs text-ink-subtle">
              Tüm kitle bağımlılıkları ve yaşam döngüsü kuralları istemci tarafında hesaplanıyor.
            </p>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-900">Dosya Yüklenemedi</h4>
              <p className="text-xs text-rose-800 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State: Dropzone and Introduction */}
        {!workbookState && !isLoading && (
          <div className="space-y-6 max-w-4xl mx-auto py-6">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-brand-700 bg-brand-50/50 scale-[1.01]"
                  : "border-line-strong hover:border-brand-700 bg-surface hover:bg-slate-50/50 shadow-xs"
              }`}
            >
              <div className="size-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-700 mx-auto mb-4">
                <FileSpreadsheet className="size-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-ink">
                Ongoing &amp; Real-time Excel Dosyasını Buraya Sürükleyin
              </h3>
              <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">
                veya bilgisayarınızdan seçmek için tıklayın (.xlsx, .xls, .xlsm, .xlsb)
              </p>

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-700 text-ink font-semibold hover:text-white text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Dosya Seç
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSample();
                  }}
                  className="px-4 py-2 rounded-lg border border-line bg-surface hover:bg-slate-100 text-xs font-medium text-ink transition-colors cursor-pointer"
                >
                  Örnek Verileri Yükle
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full w-fit mx-auto font-medium">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Zero Campaign Data Egress: Dosyanız sunucuya iletilmez, tamamen tarayıcınızda işlenir.</span>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                <div className="size-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
                  <Clock className="size-4" />
                </div>
                <h4 className="text-xs font-semibold text-ink">Ongoing Tetiklenme &amp; Kitle</h4>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Günlük, haftalık, aylık cadence analitiği. Saatlik görev yoğunlaşması ve ortak hedef kitle (Shared Audience) kümeleri.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                <div className="size-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
                  <Zap className="size-4" />
                </div>
                <h4 className="text-xs font-semibold text-ink">Real-time Trigger Mimarisi</h4>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Event omurgası (MallIQEvent, TamamlanmisApp vb.), trigger konsantrasyonu ve ürün / birim çapraz matrisleri.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                <div className="size-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700">
                  <AlertTriangle className="size-4" />
                </div>
                <h4 className="text-xs font-semibold text-ink">Kontrol Merkezi &amp; Yönetişim</h4>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Süresi dolup canlıda kalan (zombie) senaryolar, bitiş tarihi yığılmaları ve kural tabanlı tutarlılık kontrolleri.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Views */}
        {workbookState && !isLoading && (
          <div>
            {activeTab === "overview" && <TabOverview />}
            {activeTab === "ongoing" && <TabOngoing />}
            {activeTab === "realtime" && <TabRealtime />}
            {activeTab === "control-center" && <TabControlCenter />}
            {activeTab === "all-scenarios" && <TabAllScenarios />}
          </div>
        )}
      </main>

      {/* Slide-over Scenario Detail Drawer */}
      <ScenarioDetailDrawer />
    </div>
  );
}
