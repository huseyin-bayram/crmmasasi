"use client";

import { useRef, useState, useTransition, useMemo } from "react";
import {
  ArrowRightLeft,
  FileUp,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Download,
  Code2,
  Eye,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { EditorPane } from "@/components/editors/editor-pane";
import { TextEditor } from "@/components/editors/text-editor";
import { CopyButton } from "@/components/editors/copy-button";
import { FileDropTarget } from "@/components/editors/file-drop-target";
import { StatusIndicator } from "@/components/feedback/status-indicator";
import { InlineAlert } from "@/components/feedback/inline-alert";
import { ResultPanel } from "@/components/feedback/result-panel";
import { WorkspaceToolbar } from "@/components/tools/tool-page";
import { readHtmlFile } from "@/lib/html-transformer/read-file";
import { createHtmlPreviewDocument } from "@/lib/html-preview";
import {
  transformHtml,
  formatHtml,
  HTML_TRANSFORM_RULES,
  HTML_VALIDATION_CHECKS,
  UNSUBSCRIBE_VARIABLE,
  type HtmlTransformResult,
} from "@/lib/html-transformer";
import type { ToolRunState, EngineError } from "@/lib/tools/engine";
import { formatBytes, formatNumber, getTextStats, byteLength } from "@/lib/text-stats";
import { usePrimaryShortcut } from "@/lib/hooks/use-primary-shortcut";
import { cn } from "@/lib/cn";

const SAMPLE_EMAIL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Türkiye Finans Kampanya Bildirimi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f6f7;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <img src="C:\\kampanya\\banner.jpg" width="550" height="200">
              <h1 style="color: #161a1f; font-size: 20px;">Özel Finansman Fırsatı</h1>
              <p style="color: #4c5662; font-size: 14px;">Türkiye Finans avantajlı oranlarla yanınızda.</p>
            </td>
          </tr>
          <tr>
            <td width="30" valign="top" align="right" style="font-size:20px; line-height:16px; font-weight:bold; color:#858787"><h1></h1>
              · </td>
            <td style="padding: 16px; text-align: left; font-size: 11px; color: #67717c;">
              Bu e-postayı almak istemiyorsanız <a href="https://ornek.com/unsubscribe">buraya tıklayın</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function HtmlEditorWorkspace() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [outputTab, setOutputTab] = useState<"code" | "preview">("code");
  const [viewMode, setViewMode] = useState<"minified" | "formatted">("minified");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [transformResult, setTransformResult] = useState<HtmlTransformResult | null>(null);
  const [runState, setRunState] = useState<ToolRunState>("idle");
  const [error, setError] = useState<EngineError | null>(null);
  const [, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputStats = getTextStats(input);
  const inputBytes = byteLength(input);
  const outputStats = getTextStats(output);
  const outputBytes = byteLength(output);

  const displayedOutput = useMemo(() => {
    if (!output) return "";
    return viewMode === "formatted" ? formatHtml(output) : output;
  }, [output, viewMode]);

  const displayedStats = getTextStats(displayedOutput);
  const displayedBytes = byteLength(displayedOutput);

  const previewSrcDoc = useMemo(() => {
    if (!output) return "";
    return createHtmlPreviewDocument(output);
  }, [output]);

  async function handleFileUpload(file: File) {
    setError(null);
    setRunState("processing");

    const result = await readHtmlFile(file);
    if (!result.ok) {
      setRunState("error");
      setError(result.error);
      return;
    }

    setInput(result.value.text);
    setFileName(result.value.name);
    setOutput("");
    setTransformResult(null);
    setRunState("idle");
  }

  function handleTransform() {
    if (!input.trim()) {
      setRunState("error");
      setError({
        code: "EMPTY_INPUT",
        message: "Dönüştürülecek HTML kaynak kodu bulunamadı.",
        hint: "HTML kodunu sol panele yapıştırın veya 'Dosya Yükle' butonu ile bir .html dosyası seçin.",
      });
      return;
    }

    setRunState("processing");
    setError(null);

    startTransition(() => {
      const result = transformHtml(input);
      if (!result.ok) {
        setRunState("warning");
        setError(result.error);
        return;
      }

      setOutput(result.value.output);
      setTransformResult(result.value);
      setRunState("success");
    });
  }

  function handleClear() {
    if (input.trim().length > 100 && typeof window !== "undefined") {
      if (!window.confirm("Girdiğiniz HTML içeriği temizlenecek. Onaylıyor musunuz?")) {
        return;
      }
    }
    setInput("");
    setOutput("");
    setFileName(null);
    setTransformResult(null);
    setError(null);
    setRunState("idle");
  }

  function handleDownload() {
    if (!output) return;
    const downloadName = fileName
      ? `${fileName.replace(/\.html?$/i, "")}-clean.html`
      : "clean-template.html";
    const blob = new Blob([output], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleLoadSample() {
    setInput(SAMPLE_EMAIL_HTML);
    setFileName("ornek-kampanya-eposta.html");
    setOutput("");
    setTransformResult(null);
    setError(null);
    setRunState("idle");
  }

  usePrimaryShortcut(handleTransform);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Workspace Toolbar */}
      <WorkspaceToolbar
        status={<StatusIndicator state={runState} />}
      >
        <Button
          variant="primary"
          size="md"
          icon={ArrowRightLeft}
          onClick={handleTransform}
        >
          Kodu Dönüştür ve Temizle
          <Kbd inverted className="ml-1.5 hidden sm:inline-flex">Ctrl+Enter</Kbd>
        </Button>

        <Button
          variant="secondary"
          size="md"
          icon={FileUp}
          onClick={() => fileInputRef.current?.click()}
        >
          Dosya Yükle
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
              e.target.value = "";
            }
          }}
        />

        <Button
          variant="ghost"
          size="md"
          icon={Sparkles}
          onClick={handleLoadSample}
          title="Test için örnek bir HTML e-posta şablonu yükler"
        >
          Örnek Yükle
        </Button>

        {input ? (
          <Button
            variant="ghost"
            size="md"
            icon={RotateCcw}
            onClick={handleClear}
            className="text-ink-muted"
          >
            Temizle
          </Button>
        ) : null}
      </WorkspaceToolbar>

      {/* Persistent Inline Alert for Errors / Engine Notice */}
      {error ? (
        <InlineAlert
          tone={error.code === "ENGINE_NOT_AVAILABLE" ? "info" : "error"}
          title={error.message}
          onDismiss={() => setError(null)}
        >
          {error.hint}
        </InlineAlert>
      ) : null}

      {/* Applied Changes & Warning Badges */}
      {transformResult ? (
        <div className="space-y-2">
          {transformResult.changes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs">
              <span className="font-semibold text-brand-900">
                Uygulanan Standartlar:
              </span>
              {transformResult.changes.map((c, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded bg-surface-muted px-2 py-0.5 font-medium text-ink"
                >
                  ✓ {c.label}
                </span>
              ))}
            </div>
          ) : null}

          {transformResult.issues.length > 0 ? (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-warning-text">
                <ShieldAlert className="size-3.5 text-warning" />
                Teknik Uyarılar ({transformResult.issues.length})
              </p>
              <ul className="mt-1.5 space-y-1 text-ink-muted">
                {transformResult.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-mono text-warning">·</span>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Two-Pane Workspace: Input | Output */}
      <div className="grid min-h-[360px] flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Left Pane: Source HTML Input */}
        <EditorPane
          id="html-input-pane"
          label="Kaynak HTML"
          meta={fileName ? `Dosya: ${fileName}` : "E-posta kaynak kodunu buraya yapıştırın veya bırakın"}
          actions={
            input ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInput("")}
              >
                İçeriği Sil
              </Button>
            ) : null
          }
          footer={
            <div className="flex w-full items-center justify-between">
              <span>{formatNumber(inputStats.lines)} satır · {formatNumber(inputStats.characters)} karakter</span>
              <span>{formatBytes(inputBytes)}</span>
            </div>
          }
        >
          <FileDropTarget
            label="HTML dosyasını buraya bırakın"
            onFile={handleFileUpload}
          >
            <TextEditor
              labelledBy="html-input-pane-label"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E-posta HTML kaynak kodunu buraya yapıştırın veya bilgisayarınızdan sürükleyip bırakın..."
            />
          </FileDropTarget>
        </EditorPane>

        {/* Right Pane: Cleaned Safe HTML Output & Preview */}
        <EditorPane
          id="html-output-pane"
          label={outputTab === "code" ? "Temizlenmiş Güvenli HTML" : "E-posta Görsel Önizleme"}
          meta={
            output
              ? outputTab === "code"
                ? viewMode === "minified"
                  ? "Kompakt (Minify edilmiş) gövde kodu"
                  : "Okunabilir formatlanmış gövde kodu"
                : previewViewport === "desktop"
                  ? "Masaüstü görünüm simülasyonu"
                  : "Mobil cihaz görünüm simülasyonu (375px)"
              : "Gönderim sistemlerine hazır e-posta çıktısı"
          }
          actions={
            <div className="flex items-center gap-2">
              {/* Output Tab Switcher: Kod vs Önizleme */}
              <div className="inline-flex rounded border border-line bg-surface p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setOutputTab("code")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 transition-colors cursor-pointer",
                    outputTab === "code"
                      ? "bg-brand-50 text-brand-900 font-semibold"
                      : "text-ink-muted hover:text-ink"
                  )}
                  title="HTML Kaynak Kodu"
                >
                  <Code2 className="size-3" />
                  Kod
                </button>
                <button
                  type="button"
                  onClick={() => setOutputTab("preview")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 transition-colors cursor-pointer",
                    outputTab === "preview"
                      ? "bg-brand-50 text-brand-900 font-semibold"
                      : "text-ink-muted hover:text-ink"
                  )}
                  title="Görsel E-posta Önizleme"
                >
                  <Eye className="size-3" />
                  Önizleme
                </button>
              </div>

              {/* Sub-controls depending on active tab */}
              {outputTab === "code" ? (
                <div className="inline-flex rounded border border-line bg-surface p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setViewMode("minified")}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors cursor-pointer",
                      viewMode === "minified"
                        ? "bg-brand-50 text-brand-900 font-semibold"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    Kompakt (Minify)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("formatted")}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors cursor-pointer",
                      viewMode === "formatted"
                        ? "bg-brand-50 text-brand-900 font-semibold"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    Formatlı
                  </button>
                </div>
              ) : (
                <div className="inline-flex rounded border border-line bg-surface p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("desktop")}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-0.5 transition-colors cursor-pointer",
                      previewViewport === "desktop"
                        ? "bg-brand-50 text-brand-900 font-semibold"
                        : "text-ink-muted hover:text-ink"
                    )}
                    title="Masaüstü tam genişlik"
                  >
                    <Monitor className="size-3" />
                    Masaüstü
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport("mobile")}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-0.5 transition-colors cursor-pointer",
                      previewViewport === "mobile"
                        ? "bg-brand-50 text-brand-900 font-semibold"
                        : "text-ink-muted hover:text-ink"
                    )}
                    title="Mobil cihaz genişliği (375px)"
                  >
                    <Smartphone className="size-3" />
                    Mobil (375px)
                  </button>
                </div>
              )}

              {/* Action Buttons: Always use single source of truth (output) */}
              {output ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={handleDownload}
                    title="Temizlenmiş HTML kodunu .html dosyası olarak indir"
                  >
                    İndir
                  </Button>
                  <CopyButton
                    text={output}
                    successMessage="Temizlenmiş HTML panoya kopyalandı."
                    ariaLabel="Temizlenmiş HTML kodunu panoya kopyala"
                  />
                </>
              ) : (
                <CopyButton
                  text=""
                  ariaLabel="Temizlenmiş HTML kodunu panoya kopyala"
                />
              )}
            </div>
          }
          footer={
            <div className="flex w-full items-center justify-between">
              <span>
                {output
                  ? outputTab === "code"
                    ? `${formatNumber(displayedStats.lines)} satır · ${formatNumber(displayedStats.characters)} karakter`
                    : `Görünüm: ${previewViewport === "desktop" ? "Masaüstü" : "Mobil (375px)"}`
                  : "Dönüştürülmüş çıktı bekleniyor"}
              </span>
              <span>
                {output ? (
                  <span className="flex items-center gap-2">
                    {inputBytes > outputBytes && viewMode === "minified" && outputTab === "code" ? (
                      <span className="text-success text-[11px] font-medium">
                        %{Math.round(((inputBytes - outputBytes) / inputBytes) * 100)} küçültüldü
                      </span>
                    ) : null}
                    <span>{formatBytes(displayedBytes)}</span>
                  </span>
                ) : (
                  "0 B"
                )}
              </span>
            </div>
          }
        >
          {outputTab === "code" ? (
            <TextEditor
              labelledBy="html-output-pane-label"
              value={displayedOutput}
              readOnly
              placeholder="Dönüştürme işlemi tamamlandığında kampanya sistemlerine hazır HTML kodu burada görüntülenecektir."
            />
          ) : (
            <div className="flex h-full min-h-[380px] w-full flex-col bg-[#f0f2f5] p-3 rounded-b-md overflow-auto">
              <div className="mb-2 flex items-center justify-between text-[11px] text-ink-muted">
                <span>
                  {previewViewport === "desktop"
                    ? "Masaüstü Önizleme (Geniş Ekran)"
                    : "Mobil Cihaz Önizleme (375px E-posta Görünümü)"}
                </span>
                <span className="flex items-center gap-1 text-ink-subtle">
                  🔒 Güvenli Sandbox: Scriptler ve link yönlendirmeleri kısıtlanmıştır
                </span>
              </div>
              <div className="flex flex-1 items-start justify-center">
                {output ? (
                  <iframe
                    title="E-posta Güvenli Görsel Önizleme"
                    srcDoc={previewSrcDoc}
                    sandbox=""
                    className={cn(
                      "h-full min-h-[440px] border border-line bg-white shadow-sm transition-all duration-200",
                      previewViewport === "mobile"
                        ? "w-[375px] rounded-lg border-2 border-line-strong"
                        : "w-full rounded"
                    )}
                  />
                ) : (
                  <div className="flex h-full min-h-[360px] flex-col items-center justify-center p-8 text-center text-ink-muted">
                    <Eye className="size-8 text-ink-subtle mb-2" strokeWidth={1.5} />
                    <p className="font-medium text-ink">Görsel Önizleme Bekleniyor</p>
                    <p className="text-xs text-ink-subtle mt-1 max-w-sm">
                      Sol panele HTML kodunu yapıştırıp &quot;Kodu Dönüştür ve Temizle&quot; butonuna bastığınızda e-posta görsel önizlemesi burada gösterilecektir.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </EditorPane>
      </div>

      {/* Result & Validation Checklist Panel (Collapsible) */}
      <ResultPanel
        id="html-rules-panel"
        title="Dönüşüm Kuralları & Güvenli Şablon Standartları"
        summary="Tablo düzenleri, piksel takipleri ve görsel haritaları her zaman korunur"
        collapsible={true}
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2 text-ui">
          {/* Applied Rules */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-ink">
              <CheckCircle2 aria-hidden="true" className="size-3.5 text-success" />
              Uygulanan Standartlar
            </h3>
            <ul className="space-y-1.5 text-xs text-ink-muted">
              {HTML_TRANSFORM_RULES.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-ink-subtle">·</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 rounded border border-line bg-surface-muted p-2 font-mono text-[11px] text-ink-muted">
              Abonelikten çıkış parametresi:{" "}
              <code className="font-semibold text-brand-900">{`href='${UNSUBSCRIBE_VARIABLE}'`}</code>
            </div>
          </div>

          {/* Validation Checks */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-ink">
              <ShieldAlert aria-hidden="true" className="size-3.5 text-warning" />
              Teknik Doğrulama Kontrolleri
            </h3>
            <ul className="space-y-1.5 text-xs text-ink-muted">
              {HTML_VALIDATION_CHECKS.map((check, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-ink-subtle">·</span>
                  <span>{check}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-subtle">
              Dönüşüm konservatiftir: Görsel düzeni asla bozmaz, bilinmeyen kod bloklarını sessizce silmez.
            </p>
          </div>
        </div>
      </ResultPanel>
    </div>
  );
}
