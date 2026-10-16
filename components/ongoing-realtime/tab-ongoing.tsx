"use client";

import React, { useState, useMemo } from "react";
import { useOngoingRealtime } from "./context";
import {
  Clock,
  Calendar,
  Layers,
  Users,
  Info,
  ArrowRight,
  Filter,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { OngoingCadence, ScenarioRecord } from "@/lib/ongoing-realtime/types";

export function TabOngoing() {
  const { workbookState, drillDown, setSelectedScenario } = useOngoingRealtime();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const ongoingScenarios = useMemo(() => {
    return workbookState?.scenarios.filter((s) => s.scenarioType === "Ongoing") || [];
  }, [workbookState]);

  // Cadence breakdown
  const cadenceStats = useMemo(() => {
    const counts: Record<OngoingCadence, number> = {
      Daily: 0,
      Weekly: 0,
      Monthly: 0,
      "Passive Audience": 0,
      "Non-scheduled": 0,
      Other: 0,
    };

    for (const s of ongoingScenarios) {
      if (counts[s.cadence] !== undefined) {
        counts[s.cadence]++;
      } else {
        counts.Other++;
      }
    }

    const total = ongoingScenarios.length || 1;
    return (Object.keys(counts) as OngoingCadence[]).map((cadence) => ({
      cadence,
      count: counts[cadence],
      percentage: (counts[cadence] / total) * 100,
    }));
  }, [ongoingScenarios]);

  // Shared Audience Clusters (Ongoing scenarios sharing exact segment)
  const audienceClusters = useMemo(() => {
    const clustersMap = new Map<string, ScenarioRecord[]>();

    for (const s of ongoingScenarios) {
      if (s.normalizedSegmentOrEvent && s.normalizedSegmentOrEvent !== "-") {
        const list = clustersMap.get(s.normalizedSegmentOrEvent) || [];
        list.push(s);
        clustersMap.set(s.normalizedSegmentOrEvent, list);
      }
    }

    return Array.from(clustersMap.entries())
      .filter(([_, list]) => list.length > 1)
      .map(([segment, list]) => ({
        segment,
        scenarios: list,
        count: list.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [ongoingScenarios]);

  // Calendar Sheet Data
  const calendarExecutions = workbookState?.calendar || [];
  const hasCalendar = calendarExecutions.length > 0;

  // Hourly distribution for today / general calendar
  const hourlyStats = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, "0")}:00`,
      executions: [] as typeof calendarExecutions,
    }));

    for (const cal of calendarExecutions) {
      if (cal.hour !== null && cal.hour >= 0 && cal.hour < 24) {
        hours[cal.hour].executions.push(cal);
      }
    }

    // Filter to business range 06:00 to 22:00 for compact display, or keep any with count > 0
    return hours.filter((h) => h.executions.length > 0 || (h.hour >= 8 && h.hour <= 19));
  }, [calendarExecutions]);

  // Filtered executions for selected hour
  const executionsForSelectedHour = useMemo(() => {
    if (selectedHour === null) return [];
    return calendarExecutions.filter((cal) => cal.hour === selectedHour);
  }, [calendarExecutions, selectedHour]);

  if (!workbookState) return null;

  return (
    <div className="space-y-6">
      {/* 1. Cadence Mix Section */}
      <section aria-label="Cadence Dağılımı" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-sky-50 flex items-center justify-center text-sky-700">
              <Clock className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Ongoing Tetiklenme Frekansı (Cadence Mix)</h3>
              <p className="text-[11px] text-ink-subtle">
                Toplam {ongoingScenarios.length} Ongoing senaryonun periyot yapısı
              </p>
            </div>
          </div>
          <span className="text-[11px] text-ink-subtle">Tıklayarak senaryoları listeleyin</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cadenceStats.map((item) => (
            <button
              key={item.cadence}
              type="button"
              onClick={() =>
                drillDown(
                  {
                    scenarioType: "Ongoing",
                    period: item.cadence === "Other" ? "ALL" : item.cadence,
                  },
                  "all-scenarios",
                )
              }
              className="text-left rounded-lg p-3 border border-line bg-surface-muted hover:bg-sky-50/50 hover:border-sky-300 transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="text-[11px] font-medium text-ink-subtle block truncate group-hover:text-sky-800">
                {item.cadence}
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-bold text-ink tabular-nums">
                  {item.count}
                </span>
                <span className="text-[11px] text-ink-subtle font-mono">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  style={{ width: `${item.percentage}%` }}
                  className="h-full bg-sky-600 rounded-full"
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Today's Execution Timeline & Hourly Density */}
      <section aria-label="Takvim Dağılımı" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-blue-50 flex items-center justify-center text-blue-700">
              <Calendar className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Takvim ve Saatlik Tetiklenme Dağılımı (Execution Density)
              </h3>
              <p className="text-[11px] text-ink-subtle">
                CALENDAR çalışma sayfasındaki zamanlanmış batch görevleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
            <Info className="size-3.5 text-amber-700 shrink-0" />
            <span>Tetiklenme sayısı tekil müşteri erişim adedini (reach/contact) ifade etmez.</span>
          </div>
        </div>

        {hasCalendar ? (
          <div className="space-y-4">
            {/* Hourly Distribution Grid */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-ink">Saat Dilimine Göre Görev Dağılımı:</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                {hourlyStats.map((item) => {
                  const isSelected = selectedHour === item.hour;
                  const hasTasks = item.executions.length > 0;

                  return (
                    <button
                      key={item.hour}
                      type="button"
                      onClick={() => setSelectedHour(isSelected ? null : item.hour)}
                      className={`p-2 rounded text-center border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-brand-50 border-brand-700 ring-2 ring-brand-700 text-brand-900 font-bold"
                          : hasTasks
                          ? "bg-blue-50/70 border-blue-200 hover:border-blue-400 text-blue-900"
                          : "bg-surface-muted border-line/60 text-ink-subtle opacity-60"
                      }`}
                    >
                      <span className="text-[11px] block font-mono">{item.label}</span>
                      <span className="text-sm font-semibold block mt-0.5 tabular-nums">
                        {item.executions.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Hour Details or Timeline List */}
            {selectedHour !== null ? (
              <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-brand-200/60">
                  <span className="font-semibold text-brand-900">
                    {String(selectedHour).padStart(2, "0")}:00 Saat Diliminde Planlanan Senaryolar (
                    {executionsForSelectedHour.length} kayıt)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedHour(null)}
                    className="text-[11px] text-ink-subtle hover:text-ink underline"
                  >
                    Filtreyi Kaldır
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {executionsForSelectedHour.map((cal, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-1.5 rounded bg-surface border border-line text-xs"
                    >
                      <span className="font-mono font-medium text-ink truncate max-w-[400px]">
                        {cal.scenarioName}
                      </span>
                      <span className="text-[11px] font-mono text-ink-muted shrink-0">
                        {cal.timeRaw || `${cal.hour}:00`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-ink-subtle italic">
                Yukarıdaki bir saat kutusuna tıklayarak o saatte çalışan senaryo listesini
                filtreleyebilirsiniz.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-surface-muted p-4 text-center text-xs text-ink-subtle space-y-1">
            <CalendarDays className="size-6 text-ink-subtle mx-auto mb-1 opacity-50" />
            <p className="font-medium text-ink">Bu çalışma kitabında CALENDAR sayfası bulunamadı.</p>
            <p>
              Tetiklenme saatleri ve periyot bilgileri doğrudan SCENARIOS sayfasındaki &ldquo;PERIOD&rdquo; ve
              &ldquo;EXECUTION TIME&rdquo; kolonlarından takip edilmektedir.
            </p>
          </div>
        )}
      </section>

      {/* 3. Shared Audience Clusters */}
      <section aria-label="Ortak Hedef Kitle Kümeleri" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line mb-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Users className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Shared Audience Clusters (Ortak Kitle Havuzları)</h3>
              <p className="text-[11px] text-ink-subtle">
                Aynı SEGMENT tanımına referans veren senaryo grupları
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            {audienceClusters.length} kitle kümesi
          </span>
        </div>

        {/* Callout Notice */}
        <div className="rounded-lg border border-line bg-slate-50 p-3 mb-4 text-xs text-ink-muted flex items-start gap-2">
          <Info className="size-4 text-brand-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-semibold text-ink">Mimari Not:</span> Bu analiz aynı hedef kitle
            kodunu/filtresini paylaşan senaryoları tespit eder. Veri setinde müşteri bazlı üyelik
            detayı bulunmadığından, bu durum kesin bir müşteri çakışması (contact collision) anlamına
            gelmez; kitle bağımlılığını ve ortak havuz kullanımını gösterir.
          </p>
        </div>

        {audienceClusters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audienceClusters.map((cluster) => (
              <div
                key={cluster.segment}
                className="rounded-lg border border-line bg-surface p-3 space-y-2 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold text-ink truncate block" title={cluster.segment}>
                      {cluster.segment}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {cluster.count} farklı senaryo bu kitleyi kullanıyor
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      drillDown(
                        {
                          scenarioType: "Ongoing",
                          triggerOrEvent: cluster.segment,
                        },
                        "all-scenarios",
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2 py-1 rounded transition-colors shrink-0"
                  >
                    <span>Filtrele</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {cluster.scenarios.slice(0, 5).map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSelectedScenario(sc)}
                      className="text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-ink px-1.5 py-0.5 rounded truncate max-w-[200px]"
                      title={sc.scenarioName}
                    >
                      {sc.scenarioName}
                    </button>
                  ))}
                  {cluster.count > 5 && (
                    <span className="text-[10px] text-ink-subtle px-1 py-0.5">
                      +{cluster.count - 5} daha
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-ink-subtle">
            Ortak kitle kullanan mükerrer segment bulunamadı.
          </div>
        )}
      </section>
    </div>
  );
}
