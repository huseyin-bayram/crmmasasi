"use client";

import React, { useMemo } from "react";
import { useOngoingRealtime } from "./context";
import { Briefcase, Building2, Layers } from "lucide-react";

export function PortfolioCoverage() {
  const { workbookState, drillDown } = useOngoingRealtime();

  const scenarios = workbookState?.scenarios || [];

  // Group by Product
  const productStats = useMemo(() => {
    const map = new Map<string, { ongoing: number; realtime: number; total: number }>();

    for (const s of scenarios) {
      const prod = s.product || "Belirtilmemiş";
      const current = map.get(prod) || { ongoing: 0, realtime: 0, total: 0 };
      if (s.scenarioType === "Ongoing") current.ongoing++;
      else if (s.scenarioType === "Real-time") current.realtime++;
      current.total++;
      map.set(prod, current);
    }

    return Array.from(map.entries())
      .map(([product, counts]) => ({
        product,
        ...counts,
      }))
      .sort((a, b) => b.total - a.total);
  }, [scenarios]);

  // Group by Business Unit
  const businessUnitStats = useMemo(() => {
    const map = new Map<string, { ongoing: number; realtime: number; total: number }>();

    for (const s of scenarios) {
      const bu = s.businessUnit || "Belirtilmemiş";
      const current = map.get(bu) || { ongoing: 0, realtime: 0, total: 0 };
      if (s.scenarioType === "Ongoing") current.ongoing++;
      else if (s.scenarioType === "Real-time") current.realtime++;
      current.total++;
      map.set(bu, current);
    }

    return Array.from(map.entries())
      .map(([businessUnit, counts]) => ({
        businessUnit,
        ...counts,
      }))
      .sort((a, b) => b.total - a.total);
  }, [scenarios]);

  if (!workbookState) return null;

  const totalScenarios = scenarios.length || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Product Coverage */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded bg-sky-50 flex items-center justify-center text-sky-700">
                <Briefcase className="size-3.5" />
              </div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                Ürün × Senaryo Tipi Dağılımı
              </h4>
            </div>
            <span className="text-[11px] text-ink-subtle">
              {productStats.length} farklı ürün grubu
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-line/60 text-ink-subtle font-medium text-[11px]">
                  <th className="py-1.5 pr-2">Ürün</th>
                  <th className="py-1.5 px-2 text-right">Ongoing</th>
                  <th className="py-1.5 px-2 text-right">Real-time</th>
                  <th className="py-1.5 px-2 text-right">Toplam</th>
                  <th className="py-1.5 pl-3 w-32">Dağılım</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {productStats.slice(0, 8).map((item) => {
                  const ongoingPct = (item.ongoing / totalScenarios) * 100;
                  const realtimePct = (item.realtime / totalScenarios) * 100;

                  return (
                    <tr
                      key={item.product}
                      onClick={() => drillDown({ product: item.product }, "all-scenarios")}
                      className="hover:bg-black/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-2 pr-2 font-medium text-ink group-hover:text-brand-800 truncate max-w-[150px]">
                        {item.product}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-sky-700 font-medium">
                        {item.ongoing}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-purple-700 font-medium">
                        {item.realtime}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-semibold text-ink">
                        {item.total}
                      </td>
                      <td className="py-2 pl-3">
                        <div className="flex h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${ongoingPct}%` }}
                            className="bg-sky-500"
                            title={`Ongoing: ${item.ongoing}`}
                          />
                          <div
                            style={{ width: `${realtimePct}%` }}
                            className="bg-purple-500"
                            title={`Real-time: ${item.realtime}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-subtle">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-sky-500" /> Ongoing
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-purple-500" /> Real-time
            </span>
          </div>
          <span>Tıklayarak filtreleyin</span>
        </div>
      </div>

      {/* Business Unit Coverage */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-700">
                <Building2 className="size-3.5" />
              </div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                İş Birimi × Senaryo Tipi Dağılımı
              </h4>
            </div>
            <span className="text-[11px] text-ink-subtle">
              {businessUnitStats.length} farklı iş birimi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-line/60 text-ink-subtle font-medium text-[11px]">
                  <th className="py-1.5 pr-2">İş Birimi</th>
                  <th className="py-1.5 px-2 text-right">Ongoing</th>
                  <th className="py-1.5 px-2 text-right">Real-time</th>
                  <th className="py-1.5 px-2 text-right">Toplam</th>
                  <th className="py-1.5 pl-3 w-32">Dağılım</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {businessUnitStats.slice(0, 8).map((item) => {
                  const ongoingPct = (item.ongoing / totalScenarios) * 100;
                  const realtimePct = (item.realtime / totalScenarios) * 100;

                  return (
                    <tr
                      key={item.businessUnit}
                      onClick={() =>
                        drillDown({ businessUnit: item.businessUnit }, "all-scenarios")
                      }
                      className="hover:bg-black/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-2 pr-2 font-medium text-ink group-hover:text-brand-800 truncate max-w-[150px]">
                        {item.businessUnit}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-sky-700 font-medium">
                        {item.ongoing}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-purple-700 font-medium">
                        {item.realtime}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-semibold text-ink">
                        {item.total}
                      </td>
                      <td className="py-2 pl-3">
                        <div className="flex h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${ongoingPct}%` }}
                            className="bg-sky-500"
                            title={`Ongoing: ${item.ongoing}`}
                          />
                          <div
                            style={{ width: `${realtimePct}%` }}
                            className="bg-purple-500"
                            title={`Real-time: ${item.realtime}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-subtle">
          <span className="flex items-center gap-1 italic text-[11px]">
            <Layers className="size-3" /> Sayısal düşüklük kampanya ihtiyacı olarak yorumlanamaz.
          </span>
          <span>Tıklayarak filtreleyin</span>
        </div>
      </div>
    </div>
  );
}
