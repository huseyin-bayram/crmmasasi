"use client";

import { Fragment, useState, useTransition, useMemo, useRef, type ChangeEvent } from "react";
import { Link2, ShieldCheck, Sparkles, RotateCcw, ExternalLink, Globe, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Badge } from "@/components/ui/badge";
import { EditorPane } from "@/components/editors/editor-pane";
import { TextEditor } from "@/components/editors/text-editor";
import { StatusIndicator } from "@/components/feedback/status-indicator";
import { InlineAlert } from "@/components/feedback/inline-alert";
import { ResultPanel } from "@/components/feedback/result-panel";
import { WorkspaceToolbar } from "@/components/tools/tool-page";
import {
  checkLinks,
  extractLinks,
  MAX_URLS_PER_REQUEST,
  type DetectedLink,
  type LinkCheckResult,
} from "@/lib/link-checker";
import { createLocalCheckInput, parseLocalReport, MAX_REPORT_BYTES } from "@/lib/link-checker/local-report";
import type { ToolRunState, EngineError } from "@/lib/tools/engine";
import { formatNumber, getTextStats } from "@/lib/text-stats";
import { usePrimaryShortcut } from "@/lib/hooks/use-primary-shortcut";
import { cn } from "@/lib/cn";

const SAMPLE_CAMPAIGN_CONTENT = `Sayın Müşterimiz, 
Türkiye Finans Taşıt Finansmanı kasko poliçesi işleminiz için:
https://tfkb.cc/44qC0wU bağlantısına tıklayarak talebinizi iletebilirsiniz.
Kampanya detayları: https://www.turkiyefinans.com.tr/tr-tr/kampanyalar
Müşteri hizmetleri: www.turkiyefinans.com.tr/yardim`;

export function LinkCheckerWorkspace() {
  const [input, setInput] = useState("");
  const [resultsMap, setResultsMap] = useState<Map<string, LinkCheckResult>>(new Map());
  const [runState, setRunState] = useState<ToolRunState>("idle");
  const [error, setError] = useState<EngineError | null>(null);
  const [, startTransition] = useTransition();
  const [exportConsent, setExportConsent] = useState(false);
  const [hasLocalReport, setHasLocalReport] = useState(false);
  const inputRevision = useRef(0);

  const inputStats = getTextStats(input);

  // Pure client-side link extraction (instant feedback without server calls)
  const detectedLinks: DetectedLink[] = useMemo(() => {
    return extractLinks(input);
  }, [input]);

  const hasExceededLimit = detectedLinks.length > MAX_URLS_PER_REQUEST;

  function handleCheck() {
    setHasLocalReport(false);
    if (!input.trim()) {
      setRunState("error");
      setError({
        code: "EMPTY_INPUT",
        message: "Kontrol edilecek metin veya bağlantı bulunamadı.",
        hint: "Metin alanına SMS, e-posta veya kampanya metninizi yapıştırın.",
      });
      return;
    }

    if (detectedLinks.length === 0) {
      setRunState("info");
      setError({
        code: "INVALID_INPUT",
        message: "Metin içerisinde geçerli bir web bağlantısı (URL) tespit edilemedi.",
        hint: "Metnin 'http://', 'https://' veya 'www.' ile başlayan bağlantılar içerdiğinden emin olun.",
      });
      return;
    }

    if (hasExceededLimit) {
      setRunState("error");
      setError({
        code: "INPUT_TOO_LARGE",
        message: `Çok fazla bağlantı tespit edildi (${detectedLinks.length} adet).`,
        hint: `Tek seferde en fazla ${MAX_URLS_PER_REQUEST} bağlantı kontrol edilebilir. Lütfen metni bölerek kontrol edin.`,
      });
      return;
    }

    setRunState("processing");
    setError(null);

    startTransition(async () => {
      const urls = detectedLinks.map((item) => item.url);
      const result = await checkLinks(urls);
      if (!result.ok) {
        setRunState("warning");
        setError(result.error);
        const errMap = new Map<string, LinkCheckResult>();
        for (const item of detectedLinks) {
          errMap.set(item.url, {
            originalUrl: item.url,
            url: item.url,
            working: false,
            classification: "unreachable",
            status: "network-error",
            redirectCount: 0,
            redirects: [],
            error: result.error.message,
            message: result.error.message,
          });
        }
        setResultsMap(errMap);
        return;
      }

      const map = new Map<string, LinkCheckResult>();
      for (const item of result.value) {
        map.set(item.url, item);
      }
      setResultsMap(map);
      setRunState("success");
    });
  }

  function handleClear() {
    inputRevision.current += 1;
    setHasLocalReport(false);
    setExportConsent(false);
    setInput("");
    setResultsMap(new Map());
    setError(null);
    setRunState("idle");
  }

  function handleLoadSample() {
    inputRevision.current += 1;
    setHasLocalReport(false);
    setExportConsent(false);
    setInput(SAMPLE_CAMPAIGN_CONTENT);
    setResultsMap(new Map());
    setError(null);
    setRunState("idle");
  }

  function handleExport() {
    if (!exportConsent || !detectedLinks.length || hasExceededLimit) return;
    const content = createLocalCheckInput(detectedLinks.map((link) => link.url));
    const objectUrl = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "link-input.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const revision = inputRevision.current;
    const urls = detectedLinks.map((link) => link.url);
    try {
      if (file.size > MAX_REPORT_BYTES) throw new Error("Rapor en fazla 1 MB olabilir.");
      const source = await file.text();
      if (revision !== inputRevision.current) return;
      const results = parseLocalReport(source, urls);
      setResultsMap(new Map(results.map((result) => [result.url, result])));
      setHasLocalReport(true);
      setRunState(results.every((result) => result.working) ? "success" : "warning");
      setError(null);
    } catch {
      if (revision !== inputRevision.current) return;
      setError({ code: "INVALID_INPUT", message: "Rapor okunamadı veya mevcut bağlantılarla eşleşmiyor.",
        hint: "En fazla 1 MB boyutundaki yerel Python JSON raporunu seçin. Mevcut sonuçlar korundu." });
    }
  }

  usePrimaryShortcut(handleCheck);

  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());

  function toggleExpand(url: string) {
    setExpandedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }

  function getStatusBadge(check?: LinkCheckResult) {
    if (runState === "processing" && !check) {
      return <Badge tone="info">İnceleniyor...</Badge>;
    }
    if (!check) {
      return <Badge tone="neutral">Beklemede</Badge>;
    }

    switch (check.classification) {
      case "unchecked":
        return <Badge tone="info">Biçim geçerli · Ağ kontrolü yok</Badge>;
      case "working":
        return <Badge tone="success">Çalışıyor ({check.finalStatus || 200})</Badge>;
      case "working-redirected":
        return (
          <Badge tone="info">
            {check.redirectCount > 1
              ? `Çalışıyor — ${check.redirectCount} yönlendirme`
              : "Çalışıyor — Yönlendirildi"}
          </Badge>
        );
      case "not-found":
        return (
          <Badge tone="warning">
            {check.finalStatus ? `Hedef Bulunamadı (${check.finalStatus})` : "Hedef Sayfa Bulunamadı"}
          </Badge>
        );
      case "forbidden":
        return <Badge tone="warning">Erişim Engellendi (403)</Badge>;
      case "server-error":
        return (
          <Badge tone="danger">
            {check.finalStatus ? `Sunucu Hatası (${check.finalStatus})` : "Sunucu Hatası (5xx)"}
          </Badge>
        );
      case "client-error":
        return <Badge tone="warning">İstemci Hatası ({check.finalStatus})</Badge>;
      case "redirect-limit":
        return <Badge tone="warning">5 Yönlendirme Sınırı</Badge>;
      case "redirect-loop":
        return <Badge tone="warning">Yönlendirme Döngüsü</Badge>;
      case "tls-error":
        return <Badge tone="danger">TLS / Sertifika Hatası</Badge>;
      case "timeout":
        return <Badge tone="warning">Zaman Aşımı</Badge>;
      case "dns-error":
        return <Badge tone="danger">DNS Hatası</Badge>;
      case "blocked-security":
        return <Badge tone="danger">Güvenlik Engeli (SSRF)</Badge>;
      case "invalid-url":
        return <Badge tone="neutral">Geçersiz URL</Badge>;
      case "unreachable":
      default:
        return <Badge tone="danger">Ulaşılamadı</Badge>;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Workspace Toolbar */}
      <WorkspaceToolbar
        status={<StatusIndicator state={runState} />}
      >
        <Button
          variant="primary"
          size="md"
          icon={Link2}
          onClick={handleCheck}
        >
          Bağlantı Biçimlerini İncele
          <Kbd inverted className="ml-1.5 hidden sm:inline-flex">Ctrl+Enter</Kbd>
        </Button>

        <Button
          variant="ghost"
          size="md"
          icon={Sparkles}
          onClick={handleLoadSample}
          title="Test için gerçekçi URL'ler içeren örnek kampanya metni yükler"
        >
          Örnek Metin Yükle
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

      {/* Persistent Inline Alert */}
      <InlineAlert tone="info" title="Yalnızca tarayıcı içinde inceleme">
        Bu sayfa metinleri, URL’leri ve raporları sunucuya veya hedef sitelere göndermez.
        Ağ kontrolü yalnızca bilgisayarınızda çalıştırdığınız Python scriptiyle yapılır.
      </InlineAlert>
      <ResultPanel id="local-network-check" title="Yerel Ağ Kontrolü" summary="Python → yerel JSON raporu → bu tablo" collapsible defaultOpen={false}>
        <div className="space-y-3 p-3 text-xs text-ink-muted">
          <p>Kampanya metni tarayıcıda kalır. Sadece ayıklanan URL listesini indirip Python 3.10+ ile bilgisayarınızda kontrol edin; raporu aşağıdan seçin. Ek paket veya harici kontrol servisi gerekmez.</p>
          <p className="rounded border border-warning/30 bg-warning/10 p-2 text-ink">Hedef siteler istenen URL’yi ve IP adresinizi, DNS sağlayıcınız alan adlarını görebilir. URL’nin yolunda veya sorgusunda müşteri bilgisi/token bulunabilir; kişiye özel linkleri kontrol etmek izleme veya tek kullanımlık işlemleri tetikleyebilir. Sıfır ağ ifşası garanti edilemez.</p>
          <label className="flex items-start gap-2 text-ink">
            <input type="checkbox" checked={exportConsent} onChange={(event) => setExportConsent(event.target.checked)} className="mt-0.5" />
            <span>URL listesini yerel dosyaya indirmeyi kabul ediyorum. Dosya ve rapor hassas veri içerebilir.</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/downloads/check_links.py" download="check_links.py" className="rounded border border-line-strong px-3 py-2 font-medium text-brand-900 hover:bg-canvas">1. Python Scriptini İndir</a>
            <Button size="sm" onClick={handleExport} disabled={!exportConsent || !detectedLinks.length || hasExceededLimit}>2. URL Listesini İndir</Button>
          </div>
          <p>İki dosyanın bulunduğu klasörde terminalden çalıştırın (Windows’ta gerekirse <code>python3</code> yerine <code>py</code>):</p>
          <pre className="overflow-x-auto rounded border border-line bg-canvas p-2 text-ink"><code>python3 check_links.py link-input.json --allow-network</code></pre>
          <p>En fazla 5 yönlendirme izlenir. HTTP ve farklı alan adına yönlendirmeler varsayılan olarak engellenir. Gerekli olduğunu doğruladığınızda komuta sırasıyla <code>--allow-http</code> ve <code>--allow-cross-domain-redirects</code> ekleyin. HTTP şifresizdir; alan adı değişikliği URL’yi yeni hedefe gönderir.</p>
          <label className="block space-y-1 font-medium text-ink">
            <span>3. Yerel Raporu Seç (link-report.json · en fazla 1 MB)</span>
            <input type="file" accept=".json,application/json" onChange={handleImport} disabled={!detectedLinks.length || hasExceededLimit} className="block w-full rounded border border-line p-2 text-xs" />
          </label>
          <p>Dosya seçimi yükleme yapmaz; sonuçlar yalnızca bu sekmenin belleğinde tutulur. Rapor script çıktısıdır, bağımsız doğrulanmış değildir. İşiniz bitince yerel dosyaları silin.</p>
        </div>
      </ResultPanel>
      {hasLocalReport ? <InlineAlert tone="info" title="Yerel Python raporu görüntüleniyor">HTTP sonuçları seçtiğiniz dosyadan okundu; bu sayfa ağ kontrolü yapmadı. Eksik bağlantılar beklemede kalır. Rapor anlık bir ölçümdür; 2xx yanıtı içerik güvenliğini doğrulamaz.</InlineAlert> : null}
      {error ? (
        <InlineAlert
          tone={error.code === "ENGINE_NOT_AVAILABLE" ? "info" : "error"}
          title={error.message}
          onDismiss={() => setError(null)}
        >
          {error.hint}
        </InlineAlert>
      ) : null}

      {/* Content Input Pane (Compact Top Section) */}
      <EditorPane
        id="link-input-pane"
        label="Kampanya / İletişim Metni"
        meta="SMS, Push bildirimi, e-posta kopyası veya çağrı merkezi içeriğini yapıştırın"
        className="min-h-[160px] max-h-[220px]"
        actions={
          input ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput("")}
            >
              Metni Sil
            </Button>
          ) : null
        }
        footer={
          <div className="flex w-full items-center justify-between">
            <span>
              {formatNumber(inputStats.characters)} karakter · {formatNumber(inputStats.lines)} satır
            </span>
            <span className="font-medium text-ink">
              {detectedLinks.length > 0 ? (
                <span className={hasExceededLimit ? "text-danger" : "text-brand-900"}>
                  {detectedLinks.length} bağlantı tespit edildi
                  {hasExceededLimit ? ` (Maksimum ${MAX_URLS_PER_REQUEST})` : ""}
                </span>
              ) : (
                "Bağlantı aranıyor..."
              )}
            </span>
          </div>
        }
      >
        <TextEditor
          labelledBy="link-input-pane-label"
          value={input}
          onChange={(event) => {
            inputRevision.current += 1;
            setInput(event.target.value);
            setResultsMap(new Map());
            setHasLocalReport(false);
            setExportConsent(false);
            setError(null);
            setRunState("idle");
          }}
          placeholder="İçerisinde URL geçen metni buraya yapıştırın. Bağlantılar otomatik olarak ayıklanacaktır..."
        />
      </EditorPane>

      {/* Results Table Section */}
      <ResultPanel
        id="link-results-panel"
        title="Bağlantı Kontrol Sonuçları"
        summary={
          detectedLinks.length > 0
            ? `${detectedLinks.length} benzersiz adres listede`
            : "Metin yapıştırıldığında URL'ler burada listelenir"
        }
        className="flex-1"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-line bg-surface-muted text-ink-muted">
              <tr>
                <th scope="col" className="w-10 px-3 py-2 text-center font-semibold">#</th>
                <th scope="col" className="min-w-[220px] px-3 py-2 font-semibold">Orijinal URL</th>
                <th scope="col" className="w-36 px-3 py-2 font-semibold">Sonuç Durumu</th>
                <th scope="col" className="w-20 px-3 py-2 text-center font-semibold">İlk HTTP</th>
                <th scope="col" className="w-20 px-3 py-2 text-center font-semibold">Nihai HTTP</th>
                <th scope="col" className="w-28 px-3 py-2 text-center font-semibold">Yönlendirme</th>
                <th scope="col" className="min-w-[220px] px-3 py-2 font-semibold">Nihai Hedef URL</th>
                <th scope="col" className="w-20 px-3 py-2 text-right font-semibold">Süre</th>
                <th scope="col" className="w-16 px-3 py-2 text-center font-semibold">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {detectedLinks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-ink-muted">
                    <Globe aria-hidden="true" className="mx-auto mb-2 size-6 text-ink-subtle" strokeWidth={1.5} />
                    <p className="font-medium text-ink">Henüz bağlantı tespit edilmedi</p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      Metin alanına bağlantı içeren bir içerik yapıştırdığınızda URL&apos;ler otomatik olarak burada listelenecektir.
                    </p>
                  </td>
                </tr>
              ) : (
                detectedLinks.map((link, index) => {
                  const check = resultsMap.get(link.url);
                  const isExpanded = expandedUrls.has(link.url);
                  const hasDetails = Boolean(
                    check &&
                    (check.redirects.length > 0 ||
                     check.message ||
                     check.error ||
                     check.classification === "blocked-security" ||
                     check.classification === "forbidden" ||
                     check.classification === "not-found")
                  );

                  return (
                    <Fragment key={link.url}>
                      <tr className={cn("hover:bg-canvas transition-colors", isExpanded && "bg-canvas")}>
                        <td className="px-3 py-2.5 text-center font-mono text-ink-subtle">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-ink">
                          <div className="flex items-center gap-1.5 truncate max-w-sm" title={link.url}>
                            <ExternalLink aria-hidden="true" className="size-3 shrink-0 text-ink-subtle" />
                            <span className="truncate">{link.url}</span>
                            {link.occurrences > 1 ? (
                              <span className="shrink-0 rounded bg-line px-1 text-[10px] text-ink-muted" title={`${link.occurrences} kez geçiyor`}>
                                ×{link.occurrences}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {getStatusBadge(check)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-ink-subtle">
                          {check?.initialStatus ? (
                            <span className={cn(
                              "font-semibold",
                              check.initialStatus >= 300 && check.initialStatus < 400 ? "text-brand-900" :
                              check.initialStatus >= 200 && check.initialStatus < 300 ? "text-success" : "text-danger"
                            )}>
                              {check.initialStatus}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-ink-subtle">
                          {check?.finalStatus ? (
                            <span className={cn(
                              "font-semibold",
                              check.finalStatus >= 200 && check.finalStatus < 300 ? "text-success" :
                              check.finalStatus >= 400 ? "text-danger" : "text-ink"
                            )}>
                              {check.finalStatus}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-ink-subtle">
                          {check && check.redirectCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(link.url)}
                              className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-900 hover:bg-brand-100 transition-colors cursor-pointer"
                              title="Yönlendirme zincirini görüntüle"
                            >
                              <span>{check.redirectCount} hop</span>
                              <ChevronDown className={cn("size-3 transition-transform", isExpanded && "rotate-180")} />
                            </button>
                          ) : check ? (
                            "0"
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-ink-subtle max-w-sm truncate" title={check?.finalUrl || link.url}>
                          {check?.finalUrl ? (
                            <span className={cn(check.finalUrl !== link.url ? "text-brand-900 font-medium" : "text-ink-muted")}>
                              {check.finalUrl}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-ink-subtle">
                          {check?.responseTimeMs !== undefined ? `${check.responseTimeMs} ms` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {hasDetails ? (
                            <button
                              type="button"
                              onClick={() => toggleExpand(link.url)}
                              className="inline-flex items-center justify-center rounded p-1 text-ink-muted hover:bg-line hover:text-ink cursor-pointer transition-colors"
                              title={isExpanded ? "Detayları gizle" : "Detayları göster"}
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} />
                            </button>
                          ) : (
                            <span className="text-ink-subtle">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Hop Chain and Diagnosis Drawer */}
                      {isExpanded && check ? (
                        <tr className="bg-canvas border-b border-line">
                          <td colSpan={9} className="px-4 py-3 bg-surface-muted/60">
                            <div className="space-y-2 text-xs">
                              {/* Redirect Hop Chain */}
                              {check.redirects.length > 0 ? (
                                <div className="space-y-1.5">
                                  <div className="font-semibold text-ink flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full bg-brand-700" />
                                    Yönlendirme Adımları ({check.redirects.length} Adım):
                                  </div>
                                  <div className="rounded border border-line bg-surface p-2.5 space-y-1.5 font-mono text-[11px]">
                                    {check.redirects.map((hop, hIdx) => (
                                      <div key={hIdx} className="flex items-center gap-2 text-ink">
                                        <span className="rounded bg-brand-100 px-1.5 py-0.5 text-brand-900 font-bold">
                                          {hop.status}
                                        </span>
                                        <span className="text-ink-muted truncate">{hop.url}</span>
                                  <span className="text-brand-700 font-bold">→</span>
                                      </div>
                                    ))}
                                    <div className="flex items-center gap-2 pt-1 border-t border-line text-ink">
                                      <span className={cn(
                                        "rounded px-1.5 py-0.5 font-bold",
                                        check.finalStatus && check.finalStatus >= 200 && check.finalStatus < 300
                                          ? "bg-success/15 text-success"
                                          : "bg-danger/15 text-danger"
                                      )}>
                                        {check.finalStatus || "Bitiş"}
                                      </span>
                                      <span className="font-semibold text-ink truncate">{check.finalUrl || link.url}</span>
                                      <span className="text-ink-subtle text-[10px]">({check.responseTimeMs} ms)</span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Diagnostic / Error Message / Smart Tips */}
                              {check.message && !check.error ? (
                                <p className="rounded border border-line bg-surface p-2.5 text-ink-muted">
                                  {check.message}
                                </p>
                              ) : null}
                              {check.error ? (
                                <div className="rounded border border-line bg-surface p-2.5 space-y-1.5">
                                  {check.error.includes("İpucu:") ? (
                                    <>
                                      <div className="font-medium text-danger">
                                        {check.error.split("İpucu:")[0].trim()}
                                      </div>
                                      <div className="rounded bg-brand-50 p-2 text-brand-900 border border-brand-200">
                                        <strong>💡 Akıllı Teşhis:</strong> {check.error.split("İpucu:")[1].trim()}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="font-medium text-danger flex items-center gap-1.5">
                                      <AlertTriangle className="size-3.5 shrink-0" />
                                      {check.error}
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ResultPanel>

      {/* Security & SSRF Protection Policy Box (Collapsible on Click) */}
      <ResultPanel
        id="link-security-panel"
        title="Yerel Bağlantı İncelemesi ve Veri Gizliliği"
        summary="Ağ isteği göndermeden URL ayıklama ve biçim doğrulama"
        collapsible={true}
        defaultOpen={false}
      >
        <div className="p-3 text-ui">
          <div className="flex items-start gap-2.5">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" strokeWidth={2} />
            <div className="space-y-1">
              <p className="text-xs text-ink-muted leading-relaxed">
                URL’ler yalnızca tarayıcı içinde ayıklanır ve HTTP/HTTPS adres biçimi
                açısından incelenir. DNS sorgusu, sunucu isteği ve yönlendirme takibi
                bu sayfa tarafından yapılmaz. Geçerli URL biçimi, bağlantının çalıştığı anlamına gelmez.
                İsteğe bağlı Python scripti bilgisayarınızdan hedeflere istek gönderir; çerez,
                Authorization veya Referer başlığı göndermez, proxy ortam değişkenlerini kullanmaz.
                Özel ağ hedefleri engellenir, TLS sertifikaları doğrulanır ve yanıt gövdeleri okunmaz.
              </p>
            </div>
          </div>
        </div>
      </ResultPanel>
    </div>
  );
}
