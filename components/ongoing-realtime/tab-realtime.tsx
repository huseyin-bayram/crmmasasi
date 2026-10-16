"use client";

import React, { useMemo } from "react";
import { useOngoingRealtime } from "./context";
import {
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Building,
  Briefcase,
} from "lucide-react";
import { ScenarioRecord } from "@/lib/ongoing-realtime/types";

export function TabRealtime() {
  const { workbookState, drillDown, setSelectedScenario } = useOngoingRealtime();

  const realtimeScenarios = useMemo(() => {
    return workbookState?.scenarios.filter((s) => s.scenarioType === "Real-time") || [];
  }, [workbookState]);

  // Group by Trigger / Event
  const triggerStats = useMemo(() => {
    const map = new Map<
      string,
      {
        trigger: string;
        count: number;
        scenarios: ScenarioRecord[];
        products: Map<string, number>;
        businessUnits: Map<string, number>;
      }
    >();

    for (const s of realtimeScenarios) {
      const trigger = s.normalizedSegmentOrEvent || "Belirtilmemiş";
      const existing = map.get(trigger) || {
        trigger,
        count: 0,
        scenarios: [],
        products: new Map<string, number>(),
        businessUnits: new Map<string, number>(),
      };

      existing.count++;
      existing.scenarios.push(s);

      const prod = s.product || "Belirtilmemiş";
      existing.products.set(prod, (existing.products.get(prod) || 0) + 1);

      const bu = s.businessUnit || "Belirtilmemiş";
      existing.businessUnits.set(bu, (existing.businessUnits.get(bu) || 0) + 1);

      map.set(trigger, existing);
    }

    const total = realtimeScenarios.length || 1;
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: (item.count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [realtimeScenarios]);

  // Calculate Trigger Concentration (share of top 3 triggers)
  const concentration = useMemo(() => {
    const total = realtimeScenarios.length || 1;
    const top3Count = triggerStats.slice(0, 3).reduce((acc, curr) => acc + curr.count, 0);
    const top3Percentage = (top3Count / total) * 100;
    return {
      top3Count,
      top3Percentage,
      top3Names: triggerStats.slice(0, 3).map((t) => t.trigger),
    };
  }, [realtimeScenarios, triggerStats]);

  // Scenarios with missing trigger metadata
  const missingTriggerScenarios = useMemo(() => {
    return realtimeScenarios.filter(
      (s) =>
        !s.segmentOrEvent ||
        s.segmentOrEvent.trim() === "" ||
        s.segmentOrEvent.trim() === "-" ||
        s.segmentOrEvent.toLowerCase() === "yok",
    );
  }, [realtimeScenarios]);

  // Cross-tabulation matrices
  const allProducts = workbookState?.availableProducts || [];
  const allBusinessUnits = workbookState?.availableBusinessUnits || [];

  if (!workbookState) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header & Architecture Concentration KPI */}
      <section aria-label="Tetikleyici Mimarisi Özeti" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-purple-50 flex items-center justify-center text-purple-700">
              <Zap className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Real-time Trigger Landscape (Tetikleyici Mimarisi)</h3>
              <p className="text-[11px] text-ink-subtle">
                {realtimeScenarios.length} Real-time senaryo • {triggerStats.length} farklı event/trigger kaynağı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-medium">
            <Layers className="size-3.5 text-purple-700" />
            <span>Mimari Görünürlük</span>
          </div>
        </div>

        {/* Trigger Concentration Callout */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="font-semibold text-purple-950">
              Trigger Yoğunlaşması: İlk 3 Tetikleyici %{concentration.top3Percentage.toFixed(0)} Pay Alıyor
            </p>
            <p className="text-purple-900 text-[11px]">
              En sık kullanılan event&apos;ler:{" "}
              <span className="font-mono font-medium">
                {concentration.top3Names.join(", ") || "Yok"}
              </span>
              . Bu metrik sistem mimarisinin hangi event omurgaları üzerinde yoğunlaştığını gösterir;
              operasyonel bir hata veya risk değildir.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              drillDown(
                {
                  scenarioType: "Real-time",
                  triggerOrEvent: concentration.top3Names[0] || "ALL",
                },
                "all-scenarios",
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-3 py-1.5 rounded transition-colors shrink-0"
          >
            <span>Lider Event&apos;i İncele</span>
            <ArrowRight className="size-3" />
          </button>
        </div>

        {/* Missing Trigger Warning */}
        {missingTriggerScenarios.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
              <span>
                <strong>{missingTriggerScenarios.length} senaryoda</strong> tetikleyici / event alanı
                boş veya tanımsız.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                drillDown(
                  {
                    scenarioType: "Real-time",
                    quickFilter: "GOVERNANCE_REVIEW",
                  },
                  "all-scenarios",
                )
              }
              className="text-amber-900 hover:text-amber-950 underline font-medium text-[11px]"
            >
              Kayıtları Listele
            </button>
          </div>
        )}
      </section>

      {/* 2. Trigger Distribution Table */}
      <section aria-label="Tetikleyici Dağılım Tablosu" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
        <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">
          Tetikleyici Dağılımı ve Senaryo Hacmi
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-line text-ink-subtle font-medium text-[11px]">
                <th className="py-2 pr-3">Tetikleyici / Real-time Event</th>
                <th className="py-2 px-2 text-right">Senaryo Adedi</th>
                <th className="py-2 px-2 text-right">Pay (%)</th>
                <th className="py-2 px-3">İlişkili Ürünler</th>
                <th className="py-2 px-3">İş Birimleri</th>
                <th className="py-2 pl-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {triggerStats.map((item) => {
                const productSummary = Array.from(item.products.keys()).slice(0, 3).join(", ");
                const buSummary = Array.from(item.businessUnits.keys()).slice(0, 3).join(", ");

                return (
                  <tr key={item.trigger} className="hover:bg-black/[0.02] transition-colors">
                    <td className="py-2.5 pr-3 font-mono font-semibold text-purple-900">
                      {item.trigger}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-ink tabular-nums">
                      {item.count}
                    </td>
                    <td className="py-2.5 px-2 text-right text-ink-subtle tabular-nums font-mono">
                      %{item.percentage.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-ink-muted text-[11px] truncate max-w-[200px]" title={productSummary}>
                      {productSummary || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-ink-muted text-[11px] truncate max-w-[200px]" title={buSummary}>
                      {buSummary || "-"}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          drillDown(
                            {
                              scenarioType: "Real-time",
                              triggerOrEvent: item.trigger,
                            },
                            "all-scenarios",
                          )
                        }
                        className="text-[11px] font-medium text-purple-700 hover:text-purple-900 hover:underline"
                      >
                        Filtrele
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Trigger Cross-tabulation Matrices */}
      <section aria-label="Çapraz Matrisler" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trigger x Product Matrix */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 border-b border-line mb-3">
            <Briefcase className="size-4 text-ink-muted" />
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Trigger × Ürün Matrisi (Top 5 Trigger)
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-line/60 text-ink-subtle">
                  <th className="py-1.5 pr-2 font-medium">Trigger</th>
                  {allProducts.slice(0, 5).map((prod) => (
                    <th key={prod} className="py-1.5 px-1.5 text-center font-medium truncate max-w-[80px]" title={prod}>
                      {prod}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {triggerStats.slice(0, 6).map((item) => (
                  <tr key={item.trigger} className="hover:bg-slate-50">
                    <td className="py-1.5 pr-2 font-mono font-medium text-purple-900 truncate max-w-[140px]" title={item.trigger}>
                      {item.trigger}
                    </td>
                    {allProducts.slice(0, 5).map((prod) => {
                      const count = item.products.get(prod) || 0;
                      return (
                        <td
                          key={prod}
                          className={`py-1.5 px-1.5 text-center tabular-nums font-mono ${
                            count > 0 ? "font-bold text-ink bg-purple-50/50" : "text-ink-subtle/40"
                          }`}
                        >
                          {count > 0 ? count : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trigger x Business Unit Matrix */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 border-b border-line mb-3">
            <Building className="size-4 text-ink-muted" />
            <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Trigger × İş Birimi Matrisi (Top 5 Trigger)
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-line/60 text-ink-subtle">
                  <th className="py-1.5 pr-2 font-medium">Trigger</th>
                  {allBusinessUnits.slice(0, 5).map((bu) => (
                    <th key={bu} className="py-1.5 px-1.5 text-center font-medium truncate max-w-[80px]" title={bu}>
                      {bu}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {triggerStats.slice(0, 6).map((item) => (
                  <tr key={item.trigger} className="hover:bg-slate-50">
                    <td className="py-1.5 pr-2 font-mono font-medium text-purple-900 truncate max-w-[140px]" title={item.trigger}>
                      {item.trigger}
                    </td>
                    {allBusinessUnits.slice(0, 5).map((bu) => {
                      const count = item.businessUnits.get(bu) || 0;
                      return (
                        <td
                          key={bu}
                          className={`py-1.5 px-1.5 text-center tabular-nums font-mono ${
                            count > 0 ? "font-bold text-ink bg-purple-50/50" : "text-ink-subtle/40"
                          }`}
                        >
                          {count > 0 ? count : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
