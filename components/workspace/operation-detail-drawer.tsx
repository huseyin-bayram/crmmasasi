"use client";

import React, { useEffect, useRef } from "react";
import { useWorkspace } from "./workspace-provider";
import { StatusBadge, ChannelBadge } from "./status-badge";
import { formatDateOnly } from "@/lib/excel-workspace";
import { CopyButton } from "@/components/editors/copy-button";
import {
  X,
  Calendar,
  Layers,
  User,
  FileText,
  AlertTriangle,
  ArrowRight,
  Info,
  ShieldAlert,
} from "lucide-react";

export function OperationDetailDrawer() {
  const { selectedOperation, selectOperation, getRelatedOperations } = useWorkspace();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedOperation) {
        selectOperation(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOperation, selectOperation]);

  if (!selectedOperation) return null;

  const relatedOps = getRelatedOperations(selectedOperation.cmsCode);
  const otherChannels = relatedOps.filter((op) => op.rowId !== selectedOperation.rowId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kampanya Detayı"
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-[2px] transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectOperation(null);
      }}
    >
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-full sm:max-w-xl bg-surface border-l border-line shadow-2xl flex flex-col h-full"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between border-b border-line px-4 sm:px-5 py-3.5 bg-surface-muted">
            <div className="min-w-0 flex-1 pr-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-muted bg-canvas border border-line px-2 py-0.5 rounded">
                  {selectedOperation.cmsCode || "CMS Belirtilmemiş"}
                </span>
                <ChannelBadge channel={selectedOperation.channel} />
                <span className="text-[11px] text-ink-subtle">
                  Excel Satır #{selectedOperation.excelRowIndex}
                </span>
              </div>
              <h2 className="text-base font-semibold text-ink truncate mt-1">
                {selectedOperation.campaignName || "Kampanya Adı Yok"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => selectOperation(null)}
              className="rounded p-1.5 text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
              aria-label="Kapat"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
            {/* Status & Operational Reason */}
            <div className="rounded border border-line bg-canvas p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-ink-muted font-medium">Türetilmiş Statü:</span>
                  <StatusBadge
                    status={selectedOperation.derivedStatus}
                    label={selectedOperation.statusExplanation.label}
                    size="md"
                  />
                </div>
                {selectedOperation.sourceStatus && (
                  <span className="text-xs text-ink-subtle">
                    Excel Değeri: <strong className="text-ink">{selectedOperation.sourceStatus}</strong>
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-muted bg-surface p-2 rounded border border-line-subtle flex items-start gap-2">
                <Info className="size-4 shrink-0 text-brand-700 mt-0.5" />
                <span>{selectedOperation.statusExplanation.reason}</span>
              </div>
            </div>

            {/* Quality Issues / Warnings */}
            {selectedOperation.qualityIssues.length > 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <ShieldAlert className="size-4 text-amber-700" />
                  <span>Veri Kalitesi Bildirimleri ({selectedOperation.qualityIssues.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs text-amber-950">
                  {selectedOperation.qualityIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="font-mono font-medium shrink-0">[{issue.code}]</span>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* General Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
              <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                <span className="text-ink-subtle flex items-center gap-1">
                  <Calendar className="size-3.5" /> Başlangıç Tarihi
                </span>
                <span className="font-medium text-ink text-sm block">
                  {formatDateOnly(selectedOperation.startDate)}
                </span>
              </div>

              <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                <span className="text-ink-subtle flex items-center gap-1">
                  <Calendar className="size-3.5" /> Bitiş Tarihi
                </span>
                <span className="font-medium text-ink text-sm block">
                  {formatDateOnly(selectedOperation.endDate)}
                </span>
              </div>

              <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                <span className="text-ink-subtle flex items-center gap-1">
                  <User className="size-3.5" /> CRM Sorumlusu
                </span>
                <span className="font-medium text-ink text-sm block truncate">
                  {selectedOperation.owner || "Belirtilmemiş"}
                </span>
              </div>

              <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                <span className="text-ink-subtle flex items-center gap-1">
                  <Layers className="size-3.5" /> Talep Eden İş Birimi
                </span>
                <span className="font-medium text-ink text-sm block truncate">
                  {selectedOperation.requestingUnit || "Belirtilmemiş"}
                </span>
              </div>

              {selectedOperation.requester && (
                <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                  <span className="text-ink-subtle flex items-center gap-1">
                    <User className="size-3.5" /> İş Birimi Sorumlusu
                  </span>
                  <span className="font-medium text-ink text-sm block truncate">
                    {selectedOperation.requester}
                  </span>
                </div>
              )}

              {selectedOperation.pegaStatus && (
                <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                  <span className="text-ink-subtle flex items-center gap-1">
                    <Info className="size-3.5" /> PEGA Statüsü
                  </span>
                  <span className="font-medium text-ink text-sm block truncate">
                    {selectedOperation.pegaStatus}
                  </span>
                </div>
              )}

              {selectedOperation.campaignPurpose && (
                <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                  <span className="text-ink-subtle flex items-center gap-1">
                    <FileText className="size-3.5" /> Kampanya Amacı
                  </span>
                  <span className="font-medium text-ink text-sm block truncate">
                    {selectedOperation.campaignPurpose}
                  </span>
                </div>
              )}

              {selectedOperation.campaignProduct && (
                <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                  <span className="text-ink-subtle flex items-center gap-1">
                    <Layers className="size-3.5" /> Kampanya Ürünü
                  </span>
                  <span className="font-medium text-ink text-sm block truncate">
                    {selectedOperation.campaignProduct}
                  </span>
                </div>
              )}

              {selectedOperation.cardCampaignCode && (
                <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                  <span className="text-ink-subtle flex items-center gap-1">
                    <FileText className="size-3.5" /> Kart Kampanya Kodu
                  </span>
                  <span className="font-mono font-medium text-ink text-sm block truncate">
                    {selectedOperation.cardCampaignCode}
                  </span>
                </div>
              )}

              {selectedOperation.advantagePackageNo && (
                <div className="rounded border border-line p-2.5 bg-surface space-y-1">
                  <span className="text-ink-subtle flex items-center gap-1">
                    <FileText className="size-3.5" /> Avantaj Paket No
                  </span>
                  <span className="font-mono font-medium text-ink text-sm block truncate">
                    {selectedOperation.advantagePackageNo}
                  </span>
                </div>
              )}
            </div>

            {/* Same CMS Code - Other Channels */}
            <div className="rounded border border-line p-3 bg-surface space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-ink">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-brand-700" />
                  Aynı CMS Koduna Bağlı Kanallar ({relatedOps.length})
                </span>
                <span className="font-mono text-[11px] text-ink-subtle">
                  {selectedOperation.cmsCode}
                </span>
              </div>

              {otherChannels.length === 0 ? (
                <p className="text-xs text-ink-subtle italic">
                  Bu talebe bağlı başka bir kanal bulunmuyor.
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {otherChannels.map((other) => (
                    <button
                      key={other.rowId}
                      type="button"
                      onClick={() => selectOperation(other)}
                      className="w-full flex items-center justify-between p-2 rounded border border-line-subtle bg-canvas hover:bg-brand-50 hover:border-brand-300 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChannelBadge channel={other.channel} />
                        <span className="text-xs text-ink truncate">
                          {other.owner || "Sorumsuz"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge
                          status={other.derivedStatus}
                          label={other.statusExplanation.label}
                        />
                        <ArrowRight className="size-3.5 text-ink-muted group-hover:text-brand-800 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Campaign Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink flex items-center gap-1">
                  <FileText className="size-3.5 text-ink-muted" /> Kampanya İçeriği
                </label>
                {selectedOperation.content && (
                  <CopyButton
                    text={selectedOperation.content}
                    ariaLabel="Kampanya içeriğini kopyala"
                  />
                )}
              </div>
              <div className="min-h-16 max-h-48 overflow-y-auto rounded border border-line bg-canvas p-3 font-mono text-xs whitespace-pre-wrap text-ink select-text">
                {selectedOperation.content || (
                  <span className="text-ink-subtle italic">Kampanya içeriği belirtilmemiş.</span>
                )}
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Hedef Kitle Detayı</label>
              <div className="rounded border border-line bg-canvas p-2.5 text-xs text-ink whitespace-pre-wrap select-text">
                {selectedOperation.targetAudience || (
                  <span className="text-ink-subtle italic">Hedef kitle detayı bulunmuyor.</span>
                )}
              </div>
            </div>

            {/* Note */}
            {selectedOperation.note && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Notlar</label>
                <div className="rounded border border-line bg-canvas p-2.5 text-xs text-ink whitespace-pre-wrap select-text">
                  {selectedOperation.note}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-line px-5 py-3 bg-surface-muted flex items-center justify-between text-xs text-ink-subtle">
            <span>Teknik Kimlik: {selectedOperation.rowId}</span>
            <button
              type="button"
              onClick={() => selectOperation(null)}
              className="px-3 py-1.5 rounded border border-line bg-surface text-ink font-medium hover:bg-canvas transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
