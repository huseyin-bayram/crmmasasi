"use client";

import { useMemo } from "react";
import { User, Shield, CheckCircle, Smartphone, Headset } from "lucide-react";
import { EVAM_CUSTOMER_FIELDS } from "@/lib/call-center-script/constants";
import { sanitizePreviewHtml } from "@/lib/html-preview";
import { convertPlainTextToHtml, hasHtmlMarkup } from "@/lib/call-center-script/html-converter";

interface ScriptPreviewProps {
  content: string;
  title?: string;
}

/**
 * Visual Call Center Screen Preview
 * Simulates how customer representatives see and read the structured campaign script in EVAM / CC terminals.
 */
export function ScriptPreview({ content, title = "Çağrı Merkezi Temsilci Ekranı Önizlemesi" }: ScriptPreviewProps) {
  const renderedHtml = useMemo(() => {
    if (!content.trim()) return "";

    // 1. If plain text without HTML markup, convert to semantic HTML first
    let processed = hasHtmlMarkup(content) ? content : convertPlainTextToHtml(content);

    // 2. Close unclosed Customer Header <strong> before <Page1> or start of body
    processed = processed.replace(
      /(<strong>\s*Musteri\s+Adi:[\s\S]*?)(?=<Page1>|<div|<\/strong>|<p>|$)/gi,
      (match) => {
        if (match.includes("</strong>")) return match;
        return `${match}</strong>`;
      },
    );

    // 3. Fix legacy broken <p><strong><p> and <strong><p> patterns from template
    processed = processed.replace(/<p><strong><p>/gi, "<p>");
    processed = processed.replace(/<strong><p>/gi, "<p>");

    // 4. Fix unclosed <strong> inside any paragraph (<p><strong>... without </strong></p>)
    processed = processed.replace(/<p>((?:(?!<\/p>).)*?)<\/p>/gi, (match, inner) => {
      const openCount = (inner.match(/<strong\b/gi) || []).length;
      const closeCount = (inner.match(/<\/strong>/gi) || []).length;
      if (openCount > closeCount) {
        const missing = "</strong>".repeat(openCount - closeCount);
        return `<p>${inner}${missing}</p>`;
      }
      return match;
    });

    // 5. Replace EVAM customer variables with realistic simulated customer data
    processed = processed.replaceAll(
      EVAM_CUSTOMER_FIELDS.name,
      '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-xs not-italic" title="EVAM Dinamik Değişkeni: CustomerName">👤 Ahmet Yılmaz</span>',
    );
    processed = processed.replaceAll(
      EVAM_CUSTOMER_FIELDS.age,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-xs not-italic">38</span>',
    );
    processed = processed.replaceAll(
      EVAM_CUSTOMER_FIELDS.gender,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-xs not-italic">Erkek</span>',
    );
    processed = processed.replaceAll(
      EVAM_CUSTOMER_FIELDS.birthPlace,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-xs not-italic">İstanbul</span>',
    );
    processed = processed.replaceAll(
      EVAM_CUSTOMER_FIELDS.identificationNumber,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-xs not-italic">12345678901</span>',
    );

    // Also replace raw placeholders like (Müşteri Adı), [Müşteri Adı], [Ad]
    processed = processed.replace(
      /(?:\[|\()(?:Müşteri\s+Adı|Ad)(?:\]|\))/gi,
      '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-xs not-italic">👤 Ahmet Yılmaz</span>',
    );

    // 6. Beautify standard customer header into a neat representative info bar
    processed = processed.replace(
      /<strong>\s*Musteri\s+Adi:([\s\S]*?)<\/strong>/gi,
      '<div class="mb-3 p-2.5 rounded-lg bg-surface-muted border border-line text-xs font-medium text-ink flex flex-wrap items-center gap-2 not-prose"><span class="font-bold text-ink">Müşteri Bilgileri:</span> $1</div>',
    );

    // 7. Style Page breaks with clear visual call center page markers
    processed = processed.replace(
      /<Page1>/gi,
      '<div class="my-3 py-1.5 px-3 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-between not-prose"><span>📄 SAYFA 1 — Müşteri Giriş & Doğrulama</span><span class="text-[10px] text-emerald-600 font-mono">&lt;Page1&gt;</span></div>',
    );
    processed = processed.replace(
      /<Page2>/gi,
      '<div class="my-3 py-1.5 px-3 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold flex items-center justify-between not-prose"><span>📄 SAYFA 2 — Kampanya Teklifi</span><span class="text-[10px] text-blue-600 font-mono">&lt;Page2&gt;</span></div>',
    );
    processed = processed.replace(
      /<ApprovePage>/gi,
      '<div class="my-3 py-1.5 px-3 rounded bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center justify-between not-prose"><span>✅ ONAY SAYFASI — Kapanış ve Sözleşme</span><span class="text-[10px] text-amber-700 font-mono">&lt;ApprovePage&gt;</span></div>',
    );

    // 8. Render intentional paragraph spacers (<p> </p>) as visible spacing
    processed = processed.replace(/<p>\s*<\/p>/gi, '<p class="h-3 my-1">&nbsp;</p>');

    return sanitizePreviewHtml(processed);
  }, [content]);

  if (!content.trim()) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center text-ink-muted">
        <Headset className="size-8 text-ink-subtle mb-2" />
        <p className="text-sm font-medium">Önizlenecek script içeriği bulunmuyor</p>
        <p className="text-xs text-ink-subtle mt-1">
          Word dokümanı yüklediğinizde veya metin yapıştırdığınızda temsilci ekranı görünümü burada simüle edilecektir.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-canvas">
      {/* Simulation Banner Header */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-ink font-medium">
          <Headset className="size-3.5 text-brand-600" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-subtle">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Canlı Görünüm
          </span>
        </div>
      </div>

      {/* Styled Representation Content Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-ink leading-relaxed">
        <div
          className="cc-preview-content space-y-2 text-[13.5px] font-normal [&_p]:my-2 [&_p]:leading-relaxed [&_strong]:font-bold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-0.5 [&_a]:text-brand-700 [&_a]:underline [&_a]:font-medium [&_p:empty]:h-3"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
    </div>
  );
}
