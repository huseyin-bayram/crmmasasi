"use client";

import React, { useRef, useState } from "react";
import { useWorkspace } from "./workspace-provider";
import {
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  Lock,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";

export function ExcelUploader({ onLoaded }: { onLoaded?: () => void }) {
  const { loadWorkbook, isLoading, error } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    const res = await loadWorkbook(file);
    if (res.success && onLoaded) {
      onLoaded();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Upload Box */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer text-center",
          isDragging
            ? "border-brand-700 bg-brand-50/50"
            : "border-line-strong hover:border-brand-700 hover:bg-surface-muted bg-surface",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="size-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-700 mb-3 border border-brand-200">
          <FileSpreadsheet className="size-6" />
        </div>

        <h3 className="text-sm font-semibold text-ink">
          {isLoading ? "Dosya Çözümleniyor..." : "Ortak Kampanya Excel Dosyasını Seçin"}
        </h3>

        <p className="text-xs text-ink-muted mt-1 max-w-sm">
          Dosyayı buraya sürükleyip bırakabilir veya dosya seçmek için tıklayabilirsiniz.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            <span>Excel Dosyası Seç (.xlsx)</span>
          </button>
        </div>

        <span className="text-[11px] text-ink-subtle mt-2">
          Desteklenen formatlar: .xlsx, .xls
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <strong className="font-semibold">Dosya Okuma Hatası:</strong> {error}
          </div>
        </div>
      )}

      {/* Zero Campaign Data Egress Guarantee */}
      <div className="p-3.5 rounded border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
          <ShieldCheck className="size-4 text-emerald-700 shrink-0" />
          <span>Zero Campaign Data Egress Mimarisi</span>
        </div>
        <p className="text-emerald-900/90 leading-relaxed text-[12px]">
          Seçtiğiniz Excel dosyası <strong>yalnızca tarayıcınızın belleğinde (client-side)</strong> işlenir. 
          Hiçbir kampanya kaydı, içerik veya müşteri bilgisi harici bir sunucuya, Vercel fonksiyonlarına, analitik servislerine veya yapay zekaya gönderilmez.
        </p>
        <div className="flex items-center gap-3 pt-1 text-[11px] text-emerald-800 font-medium">
          <span className="flex items-center gap-1">
            <Lock className="size-3" /> 100% Yerel Bellek
          </span>
          <span className="flex items-center gap-1">
            <FileCheck className="size-3" /> SheetJS Tarayıcı Motoru
          </span>
        </div>
      </div>
    </div>
  );
}
