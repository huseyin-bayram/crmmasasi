import { analyzePageTags, PageTagAnalysis } from "./page-tags";
import { hasStandardTemplate } from "./template";
import { createTokenStore } from "./evam-tokens";

export interface ValidationItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
}

export interface ScriptValidationResult {
  isValid: boolean;
  overallStatus: "pass" | "warn" | "fail";
  pageTags: PageTagAnalysis;
  hasStandardTemplate: boolean;
  doubleQuoteAttributeCount: number;
  brokenDynamicExpressions: string[];
  checklist: ValidationItem[];
}

/**
 * Validates Call Center EVAM script against all production rules.
 */
export function validateScript(content: string): ScriptValidationResult {
  const pageTags = analyzePageTags(content);
  const standardTemplatePresent = hasStandardTemplate(content);

  // 1. Check for double quotes inside HTML attributes (Rules 13, 38)
  // Mask genuine EVAM dynamic expressions so their double quotes are not counted
  const contentWithoutEvam = content.replace(/"\s*\+\s*&eec\.[a-zA-Z0-9_.]+\s*\+?\s*"/g, "");
  const doubleQuoteAttrRegex = /<[a-zA-Z][^>]*?\s+[a-zA-Z0-9_-]+="[^"]*"[^>]*>/g;
  const attrMatches = contentWithoutEvam.match(doubleQuoteAttrRegex) || [];
  const doubleQuoteAttributeCount = attrMatches.length;

  // 2. Check for broken EVAM expressions
  const brokenDynamicExpressions: string[] = [];
  // Pattern looking for broken &eec tokens
  const brokenExprRegex = /&eec\.[a-zA-Z0-9_.]+/g;
  let match: RegExpExecArray | null;
  while ((match = brokenExprRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const startIndex = Math.max(0, match.index - 5);
    const endIndex = Math.min(content.length, match.index + fullMatch.length + 5);
    const snippet = content.slice(startIndex, endIndex);
    if (!snippet.includes('"') || !snippet.includes('+')) {
      brokenDynamicExpressions.push(snippet);
    }
  }

  // Build checklist
  const checklist: ValidationItem[] = [
    {
      id: "page1",
      label: "<Page1> Giriş Etiketi",
      status: pageTags.page1.count === 1 ? "pass" : pageTags.page1.count === 0 ? "warn" : "fail",
      detail:
        pageTags.page1.count === 1
          ? "Mevcut"
          : pageTags.page1.count === 0
          ? "Eksik (Giriş bölümü için zorunlu)"
          : `${pageTags.page1.count} adet bulundu (Sadece 1 olmalı)`,
    },
    {
      id: "page2",
      label: "<Page2> Teklif Etiketi",
      status: pageTags.page2.count === 1 ? "pass" : pageTags.page2.count === 0 ? "warn" : "fail",
      detail:
        pageTags.page2.count === 1
          ? "Mevcut"
          : pageTags.page2.count === 0
          ? "Eksik (Teklif bölümü için zorunlu)"
          : `${pageTags.page2.count} adet bulundu (Sadece 1 olmalı)`,
    },
    {
      id: "approvePage",
      label: "<ApprovePage> Onay Etiketi",
      status:
        pageTags.approvePage.count === 1
          ? "pass"
          : pageTags.approvePage.count === 0
          ? "warn"
          : "fail",
      detail:
        pageTags.approvePage.count === 1
          ? "Mevcut (Kapanış öncesi)"
          : pageTags.approvePage.count === 0
          ? "Eksik (Kapanış/onay bölümü için zorunlu)"
          : `${pageTags.approvePage.count} adet bulundu (Sadece 1 olmalı)`,
    },
    {
      id: "order",
      label: "Sayfa Etiket Sıralaması",
      status: pageTags.orderValid ? "pass" : "fail",
      detail: pageTags.orderValid
        ? "Doğru (<Page1> → <Page2> → <ApprovePage>)"
        : "Hatalı sıralama tespit edildi!",
    },
    {
      id: "template",
      label: "Standart Call Center Şablonu",
      status: standardTemplatePresent ? "pass" : "warn",
      detail: standardTemplatePresent
        ? "Eklenmiş ve geçerli"
        : "Standart TFKB açılış şablonu henüz eklenmedi",
    },
    {
      id: "quotes",
      label: "HTML Nitelik Tırnakları (Tek Tırnak)",
      status: doubleQuoteAttributeCount === 0 ? "pass" : "fail",
      detail:
        doubleQuoteAttributeCount === 0
          ? "Tüm HTML nitelikleri EVAM uyumlu tek tırnaklı (''')"
          : `${doubleQuoteAttributeCount} adet çift tırnaklı nitelik bulundu`,
    },
    {
      id: "expressions",
      label: "Dinamik Müşteri İfadeleri",
      status: brokenDynamicExpressions.length === 0 ? "pass" : "fail",
      detail:
        brokenDynamicExpressions.length === 0
          ? "Tüm EVAM değişkenleri kurallara uygun"
          : `${brokenDynamicExpressions.length} adet hatalı dinamik ifade tespit edildi`,
    },
  ];

  const hasFailures = checklist.some((c) => c.status === "fail");
  const hasWarnings = checklist.some((c) => c.status === "warn");

  const overallStatus = hasFailures ? "fail" : hasWarnings ? "warn" : "pass";
  const isValid = !hasFailures && pageTags.allMandatoryPresent;

  return {
    isValid,
    overallStatus,
    pageTags,
    hasStandardTemplate: standardTemplatePresent,
    doubleQuoteAttributeCount,
    brokenDynamicExpressions,
    checklist,
  };
}
