"use client";

import React, { useEffect } from "react";
import { useOngoingRealtime } from "./context";
import {
  X,
  ExternalLink,
  GitFork,
  Calendar,
  Clock,
  Briefcase,
  Building,
  ShieldAlert,
  Flame,
  Users,
  AlertTriangle,
  Info,
  Copy,
  Check,
} from "lucide-react";

export function ScenarioDetailDrawer() {
  const { selectedScenario, setSelectedScenario, workbookState } = useOngoingRealtime();
  const [copied, setCopied] = React.useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedScenario(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedScenario]);

  if (!selectedScenario) return null;

  const sc = selectedScenario;
  const registry = workbookState?.registry || {};

  const handleCopyName = () => {
    navigator.clipboard.writeText(sc.scenarioName);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Upstream scenario in registry
  const upstreamObj = sc.upstreamScenarioName ? registry[sc.upstreamScenarioName] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Senaryo Detayları"
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end"
    >
      <div className="w-full max-w-xl bg-surface h-full shadow-2xl flex flex-col border-l border-line animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line bg-surface-muted/50 shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                  sc.scenarioType === "Ongoing"
                    ? "bg-sky-50 text-sky-800 border-sky-200"
                    : "bg-purple-50 text-purple-800 border-purple-200"
                }`}
              >
                {sc.scenarioType}
              </span>

              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                  sc.deploymentStatus === "Deployed"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : sc.deploymentStatus === "Undeployed"
                    ? "bg-slate-100 text-slate-700 border-slate-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {sc.deploymentStatus}
              </span>

              <span className="text-[10px] font-medium text-ink-muted bg-surface border border-line px-2 py-0.5 rounded">
                {sc.lifecycleStatus}
              </span>
            </div>

            {/* Campaign Name (Business Title) */}
            <h3 className="text-sm sm:text-base font-bold text-ink leading-snug">
              {sc.campaignName || sc.scenarioName}
            </h3>

            {/* Technical Identifier */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-xs font-mono text-ink-muted bg-surface border border-line px-1.5 py-0.5 rounded break-all select-all">
                {sc.scenarioName}
              </span>
              <button
                type="button"
                onClick={handleCopyName}
                className="text-ink-subtle hover:text-ink shrink-0"
                title="Kopyala"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedScenario(null)}
            className="rounded-lg p-1.5 text-ink-subtle hover:text-ink hover:bg-slate-100 transition-colors shrink-0"
            title="Kapat (Esc)"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* Enriched Metadata Pills */}
          {(sc.detectedCampaignId || sc.detectedVersion) && (
            <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-teal-900">Çıkarılan Bilgiler:</span>
                {sc.detectedCampaignId && (
                  <span className="font-mono text-xs font-bold text-teal-950 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded">
                    Kampanya ID: {sc.detectedCampaignId}
                  </span>
                )}
                {sc.detectedVersion && (
                  <span className="font-mono text-xs font-bold text-teal-950 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded">
                    Versiyon: {sc.detectedVersion}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Core Attributes Grid */}
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <h4 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
              Temel Parametreler
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-ink-subtle block text-[11px]">Ürün Grubu</span>
                <span className="font-semibold text-ink">{sc.product || "-"}</span>
              </div>
              <div>
                <span className="text-ink-subtle block text-[11px]">İş Birimi</span>
                <span className="font-semibold text-ink">{sc.businessUnit || "-"}</span>
              </div>

              <div>
                <span className="text-ink-subtle block text-[11px]">Başlangıç Tarihi</span>
                <span className="font-mono text-ink font-medium">{sc.startDateFormatted || "-"}</span>
              </div>
              <div>
                <span className="text-ink-subtle block text-[11px]">Bitiş Tarihi</span>
                <span className="font-mono text-ink font-medium">{sc.endDateFormatted || "-"}</span>
                {sc.daysUntilExpiry !== null && (
                  <span className="text-[10px] text-ink-subtle block">
                    ({sc.daysUntilExpiry < 0 ? `${Math.abs(sc.daysUntilExpiry)} gün önce bitti` : `${sc.daysUntilExpiry} gün kaldı`})
                  </span>
                )}
              </div>

              <div>
                <span className="text-ink-subtle block text-[11px]">Periyot / Frekans</span>
                <span className="text-ink font-medium">
                  {sc.cadence} {sc.periodRaw ? `(${sc.periodRaw})` : ""}
                </span>
              </div>
              <div>
                <span className="text-ink-subtle block text-[11px]">Tetiklenme Saati</span>
                <span className="font-mono text-ink font-medium">{sc.executionTime || "-"}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-line/60">
              <span className="text-ink-subtle block text-[11px]">Segment / Real-time Event</span>
              <span className="font-mono text-xs font-bold text-purple-900 block mt-0.5 bg-purple-50/70 p-1.5 rounded border border-purple-200 break-all">
                {sc.segmentOrEvent || "-"}
              </span>
            </div>

            {sc.burnRaw && (
              <div className="pt-2 border-t border-line/60">
                <span className="text-ink-subtle block text-[11px]">Burn Bilgisi</span>
                <span className="text-ink font-medium block mt-0.5">{sc.burnRaw}</span>
              </div>
            )}

            {sc.description && (
              <div className="pt-2 border-t border-line/60">
                <span className="text-ink-subtle block text-[11px]">Açıklama</span>
                <p className="text-ink-muted leading-relaxed mt-0.5 whitespace-pre-wrap">
                  {sc.description}
                </p>
              </div>
            )}
          </div>

          {/* Dependency Architecture Section */}
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GitFork className="size-4 text-indigo-700" />
              <h4 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
                Bağımlılık ve Besleme Mimarisi
              </h4>
            </div>

            {/* Upstream Scenario */}
            {sc.upstreamScenarioName ? (
              <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 space-y-1.5">
                <span className="text-[11px] font-medium text-indigo-900 block">
                  Hedef Kitle Besleyen Kaynak Senaryo (Upstream Feeder):
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-950">
                    {sc.upstreamScenarioName}
                  </span>
                  {upstreamObj && (
                    <button
                      type="button"
                      onClick={() => setSelectedScenario(upstreamObj)}
                      className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold underline"
                    >
                      Kaynağı İncele &rarr;
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-ink-subtle italic text-[11px]">
                Üst kaynak besleyici (feeder) tanımı bulunmuyor.
              </p>
            )}

            {/* Downstream Scenarios */}
            {sc.downstreamScenarioNames.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-ink block">
                  Bu Senaryodan Beslenen Alt Senaryolar ({sc.downstreamScenarioNames.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {sc.downstreamScenarioNames.map((name) => {
                    const downObj = registry[name];
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => downObj && setSelectedScenario(downObj)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          downObj
                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100"
                            : "bg-surface-muted border-line text-ink-muted"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sibling Scenarios */}
            {sc.siblingScenarioNames.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-line/60">
                <span className="text-[11px] font-medium text-ink block">
                  Aynı Kaynaktan Beslenen Kardeş Senaryolar ({sc.siblingScenarioNames.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {sc.siblingScenarioNames.map((name) => {
                    const sibObj = registry[name];
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => sibObj && setSelectedScenario(sibObj)}
                        className="text-[10px] font-mono bg-slate-100 hover:bg-slate-200 border border-slate-200 text-ink px-1.5 py-0.5 rounded"
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Shared Audience Cluster */}
          {sc.sharedAudienceCluster && sc.sharedAudienceCluster.count > 1 && (
            <div className="rounded-xl border border-line bg-surface p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-emerald-700" />
                <h4 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
                  Ortak Hedef Kitle Kümesi ({sc.sharedAudienceCluster.count} senaryo)
                </h4>
              </div>

              <p className="text-[11px] text-ink-muted leading-relaxed">
                Bu senaryo aşağıdaki senaryolarla aynı kitle/segment tanımını paylaşmaktadır:
              </p>

              <div className="flex flex-wrap gap-1">
                {sc.sharedAudienceCluster.scenarioNames.map((name) => {
                  if (name === sc.scenarioName) return null;
                  const clusterObj = registry[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => clusterObj && setSelectedScenario(clusterObj)}
                      className="text-[10px] font-mono bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded truncate max-w-[200px]"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Governance Flags Section */}
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-rose-700" />
                <h4 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
                  Governance Bulguları ({sc.flags.length})
                </h4>
              </div>
            </div>

            {sc.flags.length > 0 ? (
              <div className="space-y-2">
                {sc.flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                      flag.severity === "CRITICAL"
                        ? "border-rose-300 bg-rose-50/70"
                        : flag.severity === "REVIEW"
                        ? "border-amber-300 bg-amber-50/70"
                        : flag.severity === "PLANNING"
                        ? "border-blue-300 bg-blue-50/70"
                        : "border-slate-300 bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{flag.title}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border shrink-0 ${
                          flag.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : flag.severity === "REVIEW"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : flag.severity === "PLANNING"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-slate-200 text-slate-800 border-slate-300"
                        }`}
                      >
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      {flag.explanation}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                Bu senaryoda herhangi bir governance uyarısı bulunmamaktadır.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
