"use client";

import React, { useEffect } from "react";
import { useWorkspace } from "./workspace-provider";
import { X, AlertTriangle, AlertCircle, Info, ExternalLink } from "lucide-react";

export function DataQualityModal() {
  const { state, isQualityModalOpen, setIsQualityModalOpen, selectOperation } = useWorkspace();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isQualityModalOpen) {
        setIsQualityModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQualityModalOpen, setIsQualityModalOpen]);

  if (!isQualityModalOpen || !state) return null;

  const issues = state.qualityIssues;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-quality-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsQualityModalOpen(false);
      }}
    >
      <div className="w-full max-w-2xl max-h-[85vh] bg-surface rounded-lg border border-line shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-surface-muted">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" />
            <h3 id="data-quality-title" className="text-sm font-semibold text-ink">
              Veri Kalitesi ve Uyarı Listesi ({issues.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsQualityModalOpen(false)}
            className="rounded p-1 text-ink-muted hover:bg-canvas hover:text-ink"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {issues.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">
              Çalışma kitabında tespit edilen herhangi bir veri kalitesi problemi veya uyarı bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue, idx) => {
                const op = state.operations.find((o) => o.rowId === issue.rowId);
                const isError = issue.severity === "error";

                return (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 p-3 rounded border border-line bg-canvas hover:bg-surface transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isError ? (
                        <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs min-w-0">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-semibold text-ink">
                            Satır #{issue.excelRowNumber}
                          </span>
                          {issue.cmsCode && (
                            <span className="bg-surface px-1.5 py-0.2 rounded border border-line text-ink-muted">
                              {issue.cmsCode}
                            </span>
                          )}
                          <span
                            className={
                              isError
                                ? "text-red-700 font-bold uppercase text-[10px]"
                                : "text-amber-700 font-bold uppercase text-[10px]"
                            }
                          >
                            [{issue.code}]
                          </span>
                        </div>
                        <p className="text-ink-muted mt-1 text-xs">{issue.message}</p>
                      </div>
                    </div>

                    {op && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsQualityModalOpen(false);
                          selectOperation(op);
                        }}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2 py-1 rounded transition-colors"
                      >
                        <span>İncele</span>
                        <ExternalLink className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-5 py-2.5 bg-surface-muted flex items-center justify-between text-xs text-ink-subtle">
          <span>Tüm kontroller tarayıcı içinde gerçekleştirilmiştir.</span>
          <button
            type="button"
            onClick={() => setIsQualityModalOpen(false)}
            className="px-3 py-1 rounded border border-line bg-surface text-ink font-medium hover:bg-canvas transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
