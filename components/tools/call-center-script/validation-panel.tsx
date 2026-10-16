"use client";

import { CheckCircle2, AlertTriangle, XCircle, Wrench, ShieldCheck } from "lucide-react";
import type { ScriptValidationResult } from "@/lib/call-center-script/validator";
import { cn } from "@/lib/cn";

interface ValidationPanelProps {
  validation: ScriptValidationResult;
  onFixTemplate?: () => void;
  onFixApprovePage?: () => void;
}

export function ValidationPanel({
  validation,
  onFixTemplate,
  onFixApprovePage,
}: ValidationPanelProps) {
  const { checklist, overallStatus, isValid } = validation;

  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className={cn(
              "size-5",
              isValid
                ? "text-emerald-600"
                : overallStatus === "warn"
                ? "text-amber-600"
                : "text-rose-600",
            )}
          />
          <h3 className="text-sm font-semibold text-ink">EVAM Kural Denetimi</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            isValid && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
            !isValid &&
              overallStatus === "warn" &&
              "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30",
            !isValid &&
              overallStatus === "fail" &&
              "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30",
          )}
        >
          {isValid ? (
            <>
              <CheckCircle2 className="size-3.5" />
              <span>EVAM İçin Hazır</span>
            </>
          ) : overallStatus === "warn" ? (
            <>
              <AlertTriangle className="size-3.5" />
              <span>Eksikler Mevcut</span>
            </>
          ) : (
            <>
              <XCircle className="size-3.5" />
              <span>Kural Hatası</span>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {checklist.map((item) => {
          const isPass = item.status === "pass";
          const isWarn = item.status === "warn";
          const isFail = item.status === "fail";

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start justify-between gap-2 p-2.5 rounded-md border text-xs transition-colors",
                isPass && "bg-surface-muted/40 border-line/70",
                isWarn && "bg-amber-500/5 border-amber-500/30",
                isFail && "bg-rose-500/5 border-rose-500/30",
              )}
            >
              <div className="flex items-start gap-2 min-w-0">
                {isPass ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : isWarn ? (
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="font-medium text-ink truncate">{item.label}</div>
                  {item.detail && (
                    <div
                      className={cn(
                        "text-[11px] mt-0.5 truncate",
                        isPass && "text-ink-subtle",
                        isWarn && "text-amber-700 dark:text-amber-400",
                        isFail && "text-rose-700 dark:text-rose-400 font-medium",
                      )}
                    >
                      {item.detail}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick fix action buttons */}
              {item.id === "template" && isWarn && onFixTemplate && (
                <button
                  type="button"
                  onClick={onFixTemplate}
                  title="Standart TFKB Açılış Şablonunu Ekle"
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] shadow-xs"
                >
                  <Wrench className="size-3" />
                  <span>Ekle</span>
                </button>
              )}

              {item.id === "approvePage" && (isWarn || isFail) && onFixApprovePage && (
                <button
                  type="button"
                  onClick={onFixApprovePage}
                  title="Kapanıştan önce <ApprovePage> etiketini otomatik yerleştir"
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] shadow-xs"
                >
                  <Wrench className="size-3" />
                  <span>Yerleştir</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
