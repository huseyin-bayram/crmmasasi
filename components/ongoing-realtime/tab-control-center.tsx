"use client";

import React, { useState, useMemo } from "react";
import { useOngoingRealtime } from "./context";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Info,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { GovernanceSeverity, ScenarioRecord } from "@/lib/ongoing-realtime/types";

interface RuleGroup {
  ruleId: string;
  ruleName: string;
  severity: GovernanceSeverity;
  explanation: string;
  scenarios: ScenarioRecord[];
}

export function TabControlCenter() {
  const { workbookState, drillDown, setSelectedScenario } = useOngoingRealtime();
  const [selectedSeverity, setSelectedSeverity] = useState<GovernanceSeverity | "ALL">("ALL");
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({
    expired_deployed: true,
    missing_status: true,
    active_undeployed: true,
  });

  const scenarios = workbookState?.scenarios || [];

  // Group all flags by ruleId
  const ruleGroups = useMemo(() => {
    const map = new Map<string, RuleGroup>();

    for (const s of scenarios) {
      for (const flag of s.flags) {
        let group = map.get(flag.id);
        if (!group) {
          group = {
            ruleId: flag.id,
            ruleName: flag.rule,
            severity: flag.severity,
            explanation: flag.explanation,
            scenarios: [],
          };
          map.set(flag.id, group);
        }
        if (!group.scenarios.some((sc) => sc.id === s.id)) {
          group.scenarios.push(s);
        }
      }
    }

    // Sort order: CRITICAL first, then REVIEW, then PLANNING, then INFO
    const severityWeight: Record<GovernanceSeverity, number> = {
      CRITICAL: 1,
      REVIEW: 2,
      PLANNING: 3,
      INFO: 4,
    };

    return Array.from(map.values()).sort(
      (a, b) => severityWeight[a.severity] - severityWeight[b.severity] || b.scenarios.length - a.scenarios.length,
    );
  }, [scenarios]);

  // Counts by severity
  const severityCounts = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      REVIEW: 0,
      PLANNING: 0,
      INFO: 0,
    };

    for (const g of ruleGroups) {
      counts[g.severity] += g.scenarios.length;
    }

    return counts;
  }, [ruleGroups]);

  // Filtered rule groups
  const filteredRuleGroups = useMemo(() => {
    if (selectedSeverity === "ALL") return ruleGroups;
    return ruleGroups.filter((g) => g.severity === selectedSeverity);
  }, [ruleGroups, selectedSeverity]);

  const toggleRule = (ruleId: string) => {
    setExpandedRules((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  };

  if (!workbookState) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header & Severity Summary Tabs */}
      <section aria-label="Governance Özeti" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-rose-50 flex items-center justify-center text-rose-700">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Kontrol Merkezi ve Governance Denetimi</h3>
              <p className="text-[11px] text-ink-subtle">
                Kural bazlı deterministik portföy sağlığı ve yaşam döngüsü kontrolleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-subtle">Filtre:</span>
            <div className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
              <button
                type="button"
                onClick={() => setSelectedSeverity("ALL")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedSeverity === "ALL" ? "bg-surface shadow-xs text-ink font-semibold" : "text-ink-muted hover:text-ink"
                }`}
              >
                Tümü ({ruleGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeverity("CRITICAL")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedSeverity === "CRITICAL"
                    ? "bg-rose-100 text-rose-900 font-semibold"
                    : "text-rose-800 hover:text-rose-950"
                }`}
              >
                Kritik ({severityCounts.CRITICAL})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeverity("REVIEW")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedSeverity === "REVIEW"
                    ? "bg-amber-100 text-amber-900 font-semibold"
                    : "text-amber-800 hover:text-amber-950"
                }`}
              >
                İnceleme ({severityCounts.REVIEW})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeverity("PLANNING")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedSeverity === "PLANNING"
                    ? "bg-blue-100 text-blue-900 font-semibold"
                    : "text-blue-800 hover:text-blue-950"
                }`}
              >
                Planlama ({severityCounts.PLANNING})
              </button>
              <button
                type="button"
                onClick={() => setSelectedSeverity("INFO")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedSeverity === "INFO"
                    ? "bg-slate-200 text-slate-900 font-semibold"
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                Bilgi ({severityCounts.INFO})
              </button>
            </div>
          </div>
        </div>

        {/* Governance Principles Callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start gap-2">
            <Info className="size-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-950 leading-relaxed">
              <strong>Active &amp; Undeployed:</strong> Senaryonun takvim tarihi başlamış olmasına rağmen canlıda olmaması iş biriminin kasıtlı planlaması veya hazırlığı olabilir. Bu durum <em>hata</em> olarak nitelendirilmez; <em>İnceleme (Review)</em> statüsünde listelenir.
            </p>
          </div>
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start gap-2">
            <Clock className="size-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-950 leading-relaxed">
              <strong>Uzun Süreli / Kalıcı Senaryolar:</strong> 2030 ve ötesi bitiş tarihine sahip veya süresiz altyapı senaryoları mimari gereksinimdir. Operasyonel risk oluşturmaz, planlama ve denetim amaçlı bilgilendirilir.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Categorized Rule List */}
      <section aria-label="Kural Denetim Listesi" className="space-y-3">
        {filteredRuleGroups.length > 0 ? (
          filteredRuleGroups.map((group) => {
            const isExpanded = Boolean(expandedRules[group.ruleId]);

            const severityBadge = {
              CRITICAL: {
                label: "KRİTİK",
                className: "bg-rose-100 text-rose-900 border-rose-300",
                borderClass: "border-rose-200",
                headerClass: "bg-rose-50/40 hover:bg-rose-50/80",
              },
              REVIEW: {
                label: "İNCELEME",
                className: "bg-amber-100 text-amber-900 border-amber-300",
                borderClass: "border-amber-200",
                headerClass: "bg-amber-50/30 hover:bg-amber-50/70",
              },
              PLANNING: {
                label: "PLANLAMA",
                className: "bg-blue-100 text-blue-900 border-blue-300",
                borderClass: "border-blue-200",
                headerClass: "bg-blue-50/30 hover:bg-blue-50/70",
              },
              INFO: {
                label: "BİLGİ",
                className: "bg-slate-100 text-slate-800 border-slate-300",
                borderClass: "border-slate-200",
                headerClass: "bg-slate-50/60 hover:bg-slate-100/70",
              },
            }[group.severity];

            return (
              <div
                key={group.ruleId}
                className={`rounded-xl border bg-surface overflow-hidden shadow-xs transition-colors ${severityBadge.borderClass}`}
              >
                {/* Rule Header Bar */}
                <div
                  onClick={() => toggleRule(group.ruleId)}
                  className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${severityBadge.headerClass}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      aria-label={isExpanded ? "Daralt" : "Genişlet"}
                      className="text-ink-subtle hover:text-ink shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${severityBadge.className}`}
                    >
                      {severityBadge.label}
                    </span>

                    <span className="font-semibold text-xs sm:text-sm text-ink truncate">
                      {group.ruleName}
                    </span>

                    <span className="text-xs text-ink-subtle font-medium shrink-0">
                      ({group.scenarios.length} senaryo)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        drillDown(
                          {
                            governanceSeverity: group.severity,
                          },
                          "all-scenarios",
                        );
                      }}
                      className="text-[11px] font-medium text-ink-muted hover:text-brand-900 bg-surface hover:bg-slate-100 border border-line px-2.5 py-1 rounded transition-colors hidden sm:inline-flex items-center gap-1"
                    >
                      <span>Tümünü Filtrele</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded Rule Content */}
                {isExpanded && (
                  <div className="p-4 border-t border-line/60 bg-surface space-y-3">
                    <p className="text-xs text-ink-muted leading-relaxed bg-surface-muted p-2.5 rounded-lg border border-line/40">
                      {group.explanation}
                    </p>

                    {/* Table of affected scenarios */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-line text-ink-subtle text-[11px]">
                            <th className="py-2 pr-3">Senaryo Adı</th>
                            <th className="py-2 px-2">Tip</th>
                            <th className="py-2 px-2">Statü</th>
                            <th className="py-2 px-2">Yaşam Döngüsü</th>
                            <th className="py-2 px-2">Bitiş Tarihi</th>
                            <th className="py-2 px-2">Ürün</th>
                            <th className="py-2 pl-2 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/40">
                          {group.scenarios.slice(0, 10).map((sc) => (
                            <tr
                              key={sc.id}
                              onClick={() => setSelectedScenario(sc)}
                              className="hover:bg-black/[0.02] cursor-pointer transition-colors"
                            >
                              <td className="py-2 pr-3 font-mono font-medium text-ink truncate max-w-[260px]">
                                {sc.scenarioName}
                              </td>
                              <td className="py-2 px-2">
                                <span className="text-[10px] font-medium text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                                  {sc.scenarioType}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                                    sc.deploymentStatus === "Deployed"
                                      ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                                      : sc.deploymentStatus === "Undeployed"
                                      ? "text-slate-700 bg-slate-100 border-slate-300"
                                      : "text-amber-800 bg-amber-50 border-amber-300"
                                  }`}
                                >
                                  {sc.deploymentStatus}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-ink-muted">{sc.lifecycleStatus}</td>
                              <td className="py-2 px-2 font-mono text-ink-subtle">
                                {sc.endDateFormatted || "-"}
                              </td>
                              <td className="py-2 px-2 text-ink-muted truncate max-w-[120px]">
                                {sc.product || "-"}
                              </td>
                              <td className="py-2 pl-2 text-right">
                                <span className="text-[11px] font-medium text-brand-700 hover:text-brand-900 hover:underline">
                                  Detay &rarr;
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {group.scenarios.length > 10 && (
                      <div className="pt-2 text-center text-xs text-ink-subtle">
                        Toplam {group.scenarios.length} senaryodan ilk 10 tanesi gösteriliyor.{" "}
                        <button
                          type="button"
                          onClick={() => drillDown({ governanceSeverity: group.severity }, "all-scenarios")}
                          className="font-medium text-brand-800 underline hover:text-brand-900"
                        >
                          Tüm {group.scenarios.length} senaryoyu tabloda görüntüle
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-sm text-ink-subtle border border-dashed border-line rounded-xl bg-surface">
            <CheckCircle2 className="size-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-ink">Bu kategoride governance uyarısı bulunmamaktadır.</p>
            <p className="text-xs mt-1">İlgili kriterlere uymayan senaryo tespit edilmedi.</p>
          </div>
        )}
      </section>
    </div>
  );
}
