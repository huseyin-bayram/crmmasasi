"use client";

import React from "react";
import { useOngoingRealtime } from "./context";
import {
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  PauseCircle,
} from "lucide-react";

export function KpiStrip() {
  const { workbookState, drillDown } = useOngoingRealtime();

  if (!workbookState) return null;

  const { summary } = workbookState;

  const kpis = [
    {
      id: "ongoing",
      label: "Ongoing",
      sublabel: "Sürekli senaryo adedi",
      value: summary.ongoingCount,
      icon: Clock,
      color: "text-sky-700 bg-sky-50 border-sky-200 hover:border-sky-300",
      iconColor: "text-sky-600",
      onClick: () => drillDown({ scenarioType: "Ongoing", quickFilter: "ALL" }),
    },
    {
      id: "realtime",
      label: "Real-time",
      sublabel: "Olay bazlı tetiklenenler",
      value: summary.realtimeCount,
      icon: Zap,
      color: "text-purple-700 bg-purple-50 border-purple-200 hover:border-purple-300",
      iconColor: "text-purple-600",
      onClick: () => drillDown({ scenarioType: "Real-time", quickFilter: "ALL" }),
    },
    {
      id: "active_deployed",
      label: "Active & Deployed",
      sublabel: "Aktif ve canlıda çalışan",
      value: summary.activeAndDeployedCount,
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-300",
      iconColor: "text-emerald-600",
      onClick: () => drillDown({ quickFilter: "ACTIVE_DEPLOYED" }),
    },
    {
      id: "active_undeployed",
      label: "Active & Undeployed",
      sublabel: "Aktif fakat canlıda değil",
      value: summary.activeButUndeployedCount,
      icon: PauseCircle,
      color: "text-amber-800 bg-amber-50 border-amber-200 hover:border-amber-300",
      iconColor: "text-amber-600",
      onClick: () => drillDown({ quickFilter: "ACTIVE_UNDEPLOYED" }),
    },
    {
      id: "expired_deployed",
      label: "Expired & Deployed",
      sublabel: "Bitiş geçmiş ama canlıda!",
      value: summary.expiredButDeployedCount,
      icon: AlertTriangle,
      color:
        summary.expiredButDeployedCount > 0
          ? "text-rose-800 bg-rose-50 border-rose-300 hover:border-rose-400 ring-1 ring-rose-200"
          : "text-ink-muted bg-surface border-line hover:border-line-strong",
      iconColor: summary.expiredButDeployedCount > 0 ? "text-rose-600" : "text-ink-subtle",
      badge: summary.expiredButDeployedCount > 0 ? "Kritik" : undefined,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
      onClick: () => drillDown({ quickFilter: "EXPIRED_DEPLOYED" }),
    },
    {
      id: "expiring_30",
      label: "Bitişe ≤ 30 Gün",
      sublabel: "Yenileme planlaması",
      value: summary.expiring30Count,
      icon: Calendar,
      color:
        summary.expiring30Count > 0
          ? "text-amber-900 bg-amber-50/70 border-amber-300 hover:border-amber-400"
          : "text-ink-muted bg-surface border-line hover:border-line-strong",
      iconColor: summary.expiring30Count > 0 ? "text-amber-600" : "text-ink-subtle",
      onClick: () => drillDown({ quickFilter: "EXPIRING_30" }),
    },
    {
      id: "today_scheduled",
      label: "Bugün Planlı Ongoing",
      sublabel: "Takvimde zamanlanan",
      value: summary.todayExecutionsCount,
      icon: Activity,
      color: "text-blue-800 bg-blue-50 border-blue-200 hover:border-blue-300",
      iconColor: "text-blue-600",
      onClick: () => drillDown({}, "ongoing"),
    },
    {
      id: "governance_warnings",
      label: "Governance Uyarıları",
      sublabel: "Kritik + İnceleme kaydı",
      value: summary.criticalIssuesCount + summary.reviewIssuesCount,
      icon: ShieldAlert,
      color:
        summary.criticalIssuesCount > 0
          ? "text-rose-900 bg-rose-50/80 border-rose-300 hover:border-rose-400"
          : "text-ink-muted bg-surface border-line hover:border-line-strong",
      iconColor: summary.criticalIssuesCount > 0 ? "text-rose-600" : "text-ink-subtle",
      badge: summary.criticalIssuesCount > 0 ? `${summary.criticalIssuesCount} Kritik` : undefined,
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
      onClick: () => drillDown({}, "control-center"),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <button
            key={kpi.id}
            type="button"
            onClick={kpi.onClick}
            title={`${kpi.label} detaylarını görüntülemek için tıklayın`}
            className={`group relative text-left rounded-lg p-2.5 sm:p-3 border transition-all duration-150 shadow-xs focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${kpi.color}`}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[11px] font-medium text-ink-muted truncate">
                {kpi.label}
              </span>
              <Icon className={`size-3.5 shrink-0 ${kpi.iconColor}`} />
            </div>

            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-ink tabular-nums">
                {kpi.value.toLocaleString("tr-TR")}
              </span>
              {kpi.badge && (
                <span
                  className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0 ${kpi.badgeColor}`}
                >
                  {kpi.badge}
                </span>
              )}
            </div>

            <p className="text-[10px] text-ink-subtle truncate mt-0.5" title={kpi.sublabel}>
              {kpi.sublabel}
            </p>
          </button>
        );
      })}
    </div>
  );
}
