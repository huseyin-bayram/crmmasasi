"use client";

import React from "react";
import { useOngoingRealtime } from "./context";
import { KpiStrip } from "./kpi-strip";
import { CrmSummary } from "./crm-summary";
import { PortfolioCoverage } from "./portfolio-coverage";
import {
  ShieldAlert,
  ArrowRight,
  Zap,
  Clock,
  Share2,
  GitFork,
  CheckCircle2,
} from "lucide-react";

export function TabOverview() {
  const { workbookState, drillDown, setActiveTab } = useOngoingRealtime();

  if (!workbookState) return null;

  const { summary, scenarios } = workbookState;

  // Top dependencies stats
  const scenariosWithUpstream = scenarios.filter((s) => Boolean(s.upstreamScenarioName));
  const scenariosInClusters = scenarios.filter((s) => Boolean(s.sharedAudienceCluster));

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Strip (8 interactive cards) */}
      <section aria-label="Temel Metrikler">
        <KpiStrip />
      </section>

      {/* 2. Deterministic CRM Portfolio Summary */}
      <section aria-label="CRM Portföy Özeti">
        <CrmSummary />
      </section>

      {/* 3. Portfolio Coverage (Product & Business Unit Matrices) */}
      <section aria-label="Portföy Kapsamı">
        <PortfolioCoverage />
      </section>

      {/* 4. Quick Architecture & Health Jump Cards */}
      <section aria-label="Mimarî ve Sağlık Kısayolları" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Governance Health Card */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded bg-rose-50 flex items-center justify-center text-rose-700">
                  <ShieldAlert className="size-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Governance Durumu
                </h4>
              </div>
              <span className="text-[11px] font-medium text-ink-subtle">
                {summary.criticalIssuesCount + summary.reviewIssuesCount} aktif bulgu
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-rose-50/60 border border-rose-200">
                <span className="text-rose-900 font-medium">Kritik Sorunlar (Acil)</span>
                <span className="font-bold text-rose-800 tabular-nums">
                  {summary.criticalIssuesCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-amber-50/60 border border-amber-200">
                <span className="text-amber-900 font-medium">İnceleme Gerektiren (Review)</span>
                <span className="font-bold text-amber-800 tabular-nums">
                  {summary.reviewIssuesCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-blue-50/60 border border-blue-200">
                <span className="text-blue-900 font-medium">Planlama Notları</span>
                <span className="font-bold text-blue-800 tabular-nums">
                  {summary.planningIssuesCount}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("control-center")}
            className="mt-4 inline-flex items-center justify-between w-full text-xs font-medium text-ink hover:text-brand-900 bg-canvas hover:bg-slate-200/70 border border-line px-3 py-2 rounded-lg transition-colors"
          >
            <span>Kontrol Merkezini Aç</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        {/* Ongoing Cadence Quick Jump */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded bg-sky-50 flex items-center justify-center text-sky-700">
                  <Clock className="size-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Ongoing Mimarisi
                </h4>
              </div>
              <span className="text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                {summary.ongoingCount} senaryo
              </span>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Günlük, haftalık, aylık periyotlar ve takvim bazlı tetiklenme dağılımı. Ortak kitle havuzları
              (Shared Audience Clusters).
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 rounded bg-slate-50 border border-line">
                <span className="text-ink-subtle block text-[11px]">Planlı Tetiklenme</span>
                <span className="font-bold text-ink tabular-nums text-sm">
                  {summary.todayExecutionsCount}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-line">
                <span className="text-ink-subtle block text-[11px]">Ortak Kitle Havuzu</span>
                <span className="font-bold text-ink tabular-nums text-sm">
                  {scenariosInClusters.length}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("ongoing")}
            className="mt-4 inline-flex items-center justify-between w-full text-xs font-medium text-ink hover:text-brand-900 bg-canvas hover:bg-slate-200/70 border border-line px-3 py-2 rounded-lg transition-colors"
          >
            <span>Ongoing Detaylarını Gör</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        {/* Real-time Trigger Landscape Jump */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded bg-purple-50 flex items-center justify-center text-purple-700">
                  <Zap className="size-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Real-time Mimarisi
                </h4>
              </div>
              <span className="text-[11px] font-medium text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                {summary.realtimeCount} senaryo
              </span>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Olay bazlı tetikleyiciler (MallIQEvent, TamamlanmisApp, IvrLogin vb.), trigger konsantrasyonu ve
              ürün/iş birimi matrisleri.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 rounded bg-slate-50 border border-line">
                <span className="text-ink-subtle block text-[11px]">Beslenen Bağımlılık</span>
                <span className="font-bold text-ink tabular-nums text-sm">
                  {scenariosWithUpstream.length}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-line">
                <span className="text-ink-subtle block text-[11px]">Aktif & Canlıda</span>
                <span className="font-bold text-emerald-700 tabular-nums text-sm">
                  {scenarios.filter((s) => s.scenarioType === "Real-time" && s.deploymentStatus === "Deployed").length}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("realtime")}
            className="mt-4 inline-flex items-center justify-between w-full text-xs font-medium text-ink hover:text-brand-900 bg-canvas hover:bg-slate-200/70 border border-line px-3 py-2 rounded-lg transition-colors"
          >
            <span>Real-time Detaylarını Gör</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
