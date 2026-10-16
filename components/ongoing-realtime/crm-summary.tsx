"use client";

import React from "react";
import { useOngoingRealtime } from "./context";
import { FileText, CalendarClock, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";

export function CrmSummary() {
  const { workbookState, drillDown } = useOngoingRealtime();

  if (!workbookState) return null;

  const { summary } = workbookState;

  // Split deterministic executive summary text into paragraphs/bullet points
  const lines = summary.executiveSummaryText
    ? summary.executiveSummaryText.split("\n\n").filter(Boolean)
    : [];

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-brand-50 flex items-center justify-center text-brand-700">
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Portföy Mimarisi ve Durum Özeti</h3>
            <p className="text-[11px] text-ink-subtle">
              Kural tabanlı deterministik analiz • Kampanya performans ve dönüşüm metriği üretilmez
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          <span>Zero Campaign Data Egress</span>
        </div>
      </div>

      {/* Summary Narrative Content */}
      <div className="space-y-2.5 text-ui leading-relaxed text-ink-muted">
        {lines.length > 0 ? (
          lines.map((paragraph, idx) => (
            <p key={idx} className="flex items-start gap-2">
              <span className="size-1.5 rounded-full bg-brand-700 mt-2 shrink-0" />
              <span>{paragraph}</span>
            </p>
          ))
        ) : (
          <p className="text-ink-subtle italic">Özet metin oluşturulamadı.</p>
        )}
      </div>

      {/* Expiry Concentration Planning Insight */}
      {summary.expiryConcentration && summary.expiryConcentration.percentage >= 15 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <CalendarClock className="size-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">
                Planlama Öngörüsü: Bitiş Tarihi Yoğunlaşması
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                <span className="font-semibold text-amber-900">
                  {summary.expiryConcentration.count} senaryo
                </span>{" "}
                ({summary.expiryConcentration.percentage.toFixed(0)}%) aynı tarihte (
                <span className="font-semibold">{summary.expiryConcentration.dateFormatted}</span>)
                sona eriyor. Bu durum operasyonel bir hata olmayıp, eşzamanlı yenileme planlaması
                gerektirebilir.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              drillDown(
                {
                  searchQuery: summary.expiryConcentration?.dateFormatted || "",
                },
                "all-scenarios",
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded transition-colors shrink-0"
          >
            <span>Senaryoları Listele</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      )}

      {/* Expired Deployed Critical Alert */}
      {summary.expiredButDeployedCount > 0 && (
        <div className="rounded-lg border border-rose-300 bg-rose-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-950">
                Kritik Bulgu: Bitiş Tarihi Geçmiş Canlı Senaryolar
              </p>
              <p className="text-rose-800 text-[11px] mt-0.5">
                <span className="font-semibold text-rose-900">
                  {summary.expiredButDeployedCount} senaryo
                </span>{" "}
                bitiş tarihi geçmiş olmasına rağmen sistemde &ldquo;Deployed&rdquo; olarak
                işaretlenmiştir.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => drillDown({ quickFilter: "EXPIRED_DEPLOYED" }, "all-scenarios")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 px-3 py-1.5 rounded transition-colors shrink-0"
          >
            <span>Kritik Kayıtları İncele</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
