"use client";

import { useRef, useState, useTransition, useMemo } from "react";
import {
  ArrowRightLeft,
  FileUp,
  RotateCcw,
  Download,
  FileText,
  ShieldCheck,
  Type,
  FilePlus,
  Eye,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { EditorPane } from "@/components/editors/editor-pane";
import { TextEditor } from "@/components/editors/text-editor";
import { CopyButton } from "@/components/editors/copy-button";
import { FileDropTarget } from "@/components/editors/file-drop-target";
import { StatusIndicator } from "@/components/feedback/status-indicator";
import { InlineAlert } from "@/components/feedback/inline-alert";
import { WorkspaceToolbar } from "@/components/tools/tool-page";
import { PageTagChips } from "@/components/tools/call-center-script/page-tag-chips";
import { QuickInsertToolbar } from "@/components/tools/call-center-script/quick-insert-toolbar";
import { ValidationPanel } from "@/components/tools/call-center-script/validation-panel";
import { ScriptPreview } from "@/components/tools/call-center-script/script-preview";
import {
  parseDocx,
  compileCallCenterScript,
  insertStandardTemplate,
  insertApprovePageTag,
  normalizeScriptTypography,
  minifyScript,
  formatScript,
  validateScript,
  type ScriptValidationResult,
} from "@/lib/call-center-script";
import type { ToolRunState, EngineError } from "@/lib/tools/engine";
import { formatBytes, formatNumber, getTextStats, byteLength } from "@/lib/text-stats";
import { usePrimaryShortcut } from "@/lib/hooks/use-primary-shortcut";
import { cn } from "@/lib/cn";

const SAMPLE_CALL_CENTER_SCRIPT = `Temsilci: Günaydın / İyi günler (Müşteri Adı) Hanım / Bey ile görüşebilir miyim? Türkiye Finans Katılım Bankası Anonim Şirketi'nden arıyorum.
Değişiklik talebiniz olursa Türkiye Finans mobil/internet şube veya Müşteri İletişim Merkezimizden tercihinizi değiştirebilirsiniz. (Zorunlu). Görüşmelerimiz kalite standartları gereği kayıt altına alınıyor. (Zorunlu)
İsmim ?..
Güvenle görüşebilmemiz için Türkiye Finans Mobil uygulamanıza bildirim gönderdik, dilerseniz kontrol edebilirsiniz.

[Müşteri Adı] Hanım / Bey, Türkiye Finans Happy Kart'ınıza özel masrafsız taksitli nakit avans ve kâr payı avantajlı finansman fırsatımız hakkında bilgi vermek için aradım.

Kampanya Detayları:
• Âlâ Bankacılık müşterilerimize özel %0 faizli nakit avans imkanı
• 12 aya varan vade seçenekleri
• Başvuru ve tüm detaylar için: https://www.turkiyefinans.com.tr/kampanyalar

“Evet” demeniz durumunda avantajlı finansmanınız anında hesabınıza aktarılacaktır.

KAPANIŞ;
Değerli vaktinizi ayırdığınız için teşekkür eder, iyi günler dilerim.`;

export function CallCenterScriptWorkspace() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [inputTab, setInputTab] = useState<"code" | "preview">("code");
  const [output, setOutput] = useState("");
  const [viewMode, setViewMode] = useState<"minified" | "formatted" | "preview">("minified");
  const [runState, setRunState] = useState<ToolRunState>("idle");
  const [error, setError] = useState<EngineError | null>(null);
  const [, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);

  const inputStats = getTextStats(input);
  const inputBytes = byteLength(input);

  // Live validation of current output
  const liveValidation: ScriptValidationResult = useMemo(() => {
    return validateScript(output);
  }, [output]);

  // Displayed output respects minified vs formatted view mode
  const displayedOutput = useMemo(() => {
    if (!output) return "";
    return viewMode === "formatted" ? formatScript(output) : minifyScript(output);
  }, [output, viewMode]);

  const outputStats = getTextStats(displayedOutput);
  const outputBytes = byteLength(displayedOutput);

  // Core compilation handler
  function handleCompile(customInput?: string) {
    const textToProcess = customInput ?? input;
    if (!textToProcess.trim()) {
      setError({
        code: "EMPTY_INPUT",
        message: "Lütfen dönüştürülecek bir Word dokümanı yükleyin veya script yapıştırın.",
      });
      setRunState("error");
      return;
    }

    setRunState("processing");
    setError(null);

    startTransition(() => {
      try {
        const result = compileCallCenterScript(textToProcess, {
          autoInsertTemplate: true,
          autoInsertApprovePage: true,
          normalizeTypography: true,
          minify: true,
        });

        setOutput(result.output);
        setRunState("success");
      } catch (err) {
        setError({
          code: "INVALID_INPUT",
          message: err instanceof Error ? err.message : "Script dönüştürülürken beklenmedik bir hata oluştu.",
        });
        setRunState("error");
      }
    });
  }

  usePrimaryShortcut(() => handleCompile());

  // Insert standard template on demand
  function handleInsertTemplate() {
    if (!output && !input) return;
    const target = output || input;
    const result = insertStandardTemplate(target);
    const minified = minifyScript(result.output);
    setOutput(minified);
    setRunState("success");
  }

  // Insert <ApprovePage> on demand
  function handleInsertApprovePage() {
    if (!output && !input) return;
    const target = output || input;
    const result = insertApprovePageTag(target);
    const minified = minifyScript(result.output);
    setOutput(minified);
    setRunState("success");
  }

  // Normalize typography on demand
  function handleNormalizeTypography() {
    if (!output && !input) return;
    const target = output || input;
    const result = normalizeScriptTypography(target);
    const minified = minifyScript(result.output);
    setOutput(minified);
    setRunState("success");
  }

  // Handle client-side file reading (DOCX or text/html)
  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setRunState("processing");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let extractedContent = "";

      if (ext === "docx") {
        const docxResult = await parseDocx(file);
        // Show exact Word raw text in left editor without HTML tags
        extractedContent = docxResult.rawText;
      } else {
        extractedContent = await file.text();
      }

      setInput(extractedContent);
      // Auto compile on file upload
      handleCompile(extractedContent);
    } catch (err) {
      setError({
        code: "INVALID_INPUT",
        message:
          err instanceof Error
            ? `Dosya okunamadı: ${err.message}`
            : "Dosya işlenirken bir hata oluştu. Lütfen geçerli bir .docx veya .html dosyası seçin.",
      });
      setRunState("error");
    }
  }

  // Cursor-aware insertion into output textarea
  function insertTextAtCursor(snippet: string) {
    const textarea = outputTextareaRef.current;
    if (!textarea) {
      setOutput((prev) => prev + snippet);
      return;
    }

    const start = textarea.selectionStart ?? output.length;
    const end = textarea.selectionEnd ?? output.length;
    const currentVal = textarea.value;

    const nextVal = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    setOutput(nextVal);

    // Restore focus and move caret
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  }

  function handleReset() {
    setInput("");
    setOutput("");
    setFileName(null);
    setError(null);
    setRunState("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleLoadSample() {
    setInput(SAMPLE_CALL_CENTER_SCRIPT);
    setFileName("ornek-cagri-scripti.docx");
    handleCompile(SAMPLE_CALL_CENTER_SCRIPT);
  }

  function handleDownload() {
    if (!displayedOutput) return;
    const blob = new Blob([displayedOutput], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? fileName.replace(/\.[^/.]+$/, "-evam.html") : "cagri-scripti-evam.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.html,.htm,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Main Workspace Toolbar */}
      <WorkspaceToolbar
        status={
          <StatusIndicator
            state={runState}
            label={
              runState === "idle"
                ? "Dönüştürmeye hazır"
                : runState === "processing"
                ? "Script derleniyor..."
                : runState === "success"
                ? "EVAM formatına dönüştürüldü"
                : runState === "error"
                ? "Dönüştürme hatası"
                : undefined
            }
          />
        }
      >
        <Button
          variant="primary"
          icon={ArrowRightLeft}
          onClick={() => handleCompile()}
          disabled={!input.trim() || runState === "processing"}
        >
          <span>HTML'e Dönüştür</span>
          <span className="hidden items-center gap-0.5 sm:inline-flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </span>
        </Button>

        <Button
          variant="secondary"
          icon={FilePlus}
          onClick={handleInsertTemplate}
          disabled={!output && !input}
          title="Standart Türkiye Finans Call Center açılış şablonunu ve müşteri başlığını ekler"
        >
          Şablon Ekle
        </Button>

        <Button
          variant="secondary"
          icon={ShieldCheck}
          onClick={handleInsertApprovePage}
          disabled={!output && !input}
          title="KAPANIŞ bölümünün hemen önüne zorunlu <ApprovePage> etiketini yerleştirir"
        >
          &lt;ApprovePage&gt; Ekle
        </Button>

        <Button
          variant="secondary"
          icon={Type}
          onClick={handleNormalizeTypography}
          disabled={!output && !input}
          title="Tırnak, tire, kesme ve görünmez karakterleri normalize eder"
        >
          Karakterleri Düzelt
        </Button>

        <Button
          variant="ghost"
          icon={RotateCcw}
          onClick={handleReset}
          disabled={!input && !output}
        >
          Temizle
        </Button>
      </WorkspaceToolbar>

      {/* Error alert */}
      {error && (
        <InlineAlert
          tone="error"
          title="İşlem Hatası"
          onDismiss={() => setError(null)}
        >
          {error.message}
        </InlineAlert>
      )}

      {/* Two-Pane Editor Layout */}
      <div className="grid min-h-[520px] flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Pane: Word / Raw Input */}
        <EditorPane
          id="script-input"
          label="Word / Ham Script"
          meta={
            fileName ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-ink font-medium">
                <FileText className="size-3 text-brand-600" />
                {fileName}
              </span>
            ) : null
          }
          actions={
            <div className="flex items-center gap-1.5">
              {/* Tab Mode: Metin / Kod vs Görsel Önizleme */}
              <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setInputTab("code")}
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded transition-colors inline-flex items-center gap-1",
                    inputTab === "code"
                      ? "bg-brand-700 text-white"
                      : "text-ink-muted hover:text-ink",
                  )}
                  title="Ham metin veya kaynak kodu görüntüle ve düzenle"
                >
                  <Code2 className="size-3" />
                  <span>Kod</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab("preview")}
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded transition-colors inline-flex items-center gap-1",
                    inputTab === "preview"
                      ? "bg-brand-700 text-white"
                      : "text-ink-muted hover:text-ink",
                  )}
                  title="Yapılandırılmış Word görünümü önizlemesi"
                >
                  <Eye className="size-3" />
                  <span>Önizleme</span>
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={FileUp}
                onClick={() => fileInputRef.current?.click()}
              >
                Word Yükle
              </Button>
              {!input && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadSample}
                >
                  Örnek
                </Button>
              )}
            </div>
          }
          footer={
            <div className="flex w-full items-center justify-between text-xs text-ink-subtle">
              <span>{formatNumber(inputStats.characters)} karakter · {formatNumber(inputStats.words)} kelime</span>
              <span>{formatBytes(inputBytes)}</span>
            </div>
          }
        >
          {inputTab === "preview" ? (
            <ScriptPreview
              content={input}
              title="Word Dokümanı Görsel Önizlemesi"
            />
          ) : (
            <FileDropTarget
              label="Word (.docx) veya HTML dosyasını buraya bırakın"
              onFile={handleFile}
            >
              <TextEditor
                labelledBy="script-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Word dokümanından kopyalanan metni veya HTML kaynak kodunu buraya yapıştırın, ya da yukarıdaki butondan .docx dosyası yükleyin..."
              />
            </FileDropTarget>
          )}
        </EditorPane>

        {/* Right Pane: EVAM HTML Output */}
        <EditorPane
          id="script-output"
          label="EVAM Script Çıktısı"
          meta={
            <span className="font-mono text-xs text-ink-muted">
              {viewMode === "minified"
                ? "Minified (EVAM)"
                : viewMode === "formatted"
                ? "Formatlı (Okunabilir)"
                : "Temsilci Önizlemesi"}
            </span>
          }
          actions={
            <div className="flex items-center gap-1">
              <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("minified")}
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded transition-colors",
                    viewMode === "minified"
                      ? "bg-brand-700 text-white"
                      : "text-ink-muted hover:text-ink",
                  )}
                  title="EVAM için kompakt/minified HTML çıktısı"
                >
                  Minified
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("formatted")}
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded transition-colors",
                    viewMode === "formatted"
                      ? "bg-brand-700 text-white"
                      : "text-ink-muted hover:text-ink",
                  )}
                  title="Satırlara ayrılmış okunabilir HTML çıktısı"
                >
                  Formatlı
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded transition-colors inline-flex items-center gap-1",
                    viewMode === "preview"
                      ? "bg-brand-700 text-white"
                      : "text-ink-muted hover:text-ink",
                  )}
                  title="Temsilcilerin göreceği EVAM ekranı simülasyonu"
                >
                  <Eye className="size-3" />
                  <span>Önizleme</span>
                </button>
              </div>

              <CopyButton
                text={displayedOutput}
                ariaLabel="EVAM script çıktısını panoya kopyala"
              />

              <Button
                variant="ghost"
                size="sm"
                icon={Download}
                onClick={handleDownload}
                disabled={!displayedOutput}
                title="Çıktıyı HTML dosyası olarak indir"
              />
            </div>
          }
          footer={
            <div className="flex w-full items-center justify-between text-xs text-ink-subtle">
              <span>{formatNumber(outputStats.characters)} karakter · {formatBytes(outputBytes)}</span>
              <span className={cn(liveValidation.isValid ? "text-emerald-600 font-medium" : "text-amber-600 font-medium")}>
                {liveValidation.isValid ? "✓ EVAM Uyumlu" : "⚠ Kural Uyarısı"}
              </span>
            </div>
          }
        >
          {viewMode === "preview" ? (
            <ScriptPreview
              content={output}
              title="EVAM Temsilci Ekranı Önizlemesi"
            />
          ) : (
            <div className="flex flex-col h-full">
              {/* Direct manipulation toolbar: Page tag chips & customer fields */}
              <div className="shrink-0 border-b border-line bg-surface-muted/60 px-3 py-2 space-y-1.5">
                <PageTagChips
                  analysis={liveValidation.pageTags}
                  onInsertTag={insertTextAtCursor}
                />
                <QuickInsertToolbar
                  onInsertText={insertTextAtCursor}
                />
              </div>

              {/* Editor Area */}
              <div className="relative flex-1 min-h-[300px]">
                <TextEditor
                  ref={outputTextareaRef}
                  labelledBy="script-output"
                  value={displayedOutput}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder="Dönüştürülen EVAM uyumlu script burada görüntülenecektir. Doğrudan düzenleme yapabilir veya yukarıdaki butonlarla etiket ekleyebilirsiniz."
                />
              </div>
            </div>
          )}
        </EditorPane>
      </div>

      {/* EVAM Validation & Compliance Checklist */}
      <ValidationPanel
        validation={liveValidation}
        onFixTemplate={handleInsertTemplate}
        onFixApprovePage={handleInsertApprovePage}
      />

      {/* Privacy & Client-side Execution Notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-muted/50 border border-line text-xs text-ink-subtle">
        <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Gizlilik Güvencesi:</strong> Word (.docx) dosya ayrıştırma ve EVAM dönüştürme işlemleri %100 kullanıcının tarayıcısında (istemci tarafında) yerel olarak çalışır. Kurumsal kampanya verileriniz hiçbir sunucuya veya harici servise iletilmez.
        </span>
      </div>
    </div>
  );
}
