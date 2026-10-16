import { parse, HTMLElement, Node, NodeType } from "node-html-parser";
import { ALLOWED_HTML_TAGS, EVAM_CUSTOMER_FIELDS } from "./constants";
import { createTokenStore } from "./evam-tokens";

export interface HtmlConversionStats {
  paragraphs: number;
  lists: number;
  links: number;
  placeholdersConverted: number;
}

const DOCUMENT_NOISE_PATTERNS = [
  /Genele\s+Açık\s*\/\s*Public/i,
  /Kişisel\s+Veri\s+İçermez/i,
  /Bankaya\s+Özel\s*\/\s*Internal\s+Use/i,
  /Sayfa\s+\d+\s*\/\s*\d+/i,
];

/**
 * Detects whether the input text contains HTML markup.
 */
export function hasHtmlMarkup(text: string): boolean {
  return /<\/?(?:p|div|ul|ol|li|table|thead|tbody|tr|td|th|h[1-6]|Page1|Page2|ApprovePage|br|section|article)\b/i.test(
    text,
  );
}

/**
 * Converts raw plain text (from clipboard copy-paste or Word raw text)
 * into semantic EVAM-compatible HTML elements:
 * - Empty lines -> <p> </p> intentional vertical spacers (Rule 9)
 * - Bullets (•, *, -) -> <ul><li>...</li></ul>
 * - Numbered items (1., 2.) -> <ol><li>...</li></ol>
 * - Known headings & dialogue markers (AÇILIŞ:, TEKLİF DETAYI:, KAPANIŞ;, Temsilci:, MT:) -> <strong>
 * - Regular paragraphs -> <p>...</p>
 */
export function convertPlainTextToHtml(text: string): string {
  if (!text || !text.trim()) return "";
  if (hasHtmlMarkup(text)) return text;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");

  const htmlChunks: string[] = [];
  let inList: "ul" | "ol" | false = false;
  let listItems: string[] = [];
  let lastWasSpacer = false;

  function flushList() {
    if (inList && listItems.length > 0) {
      const tag = inList;
      htmlChunks.push(`<${tag}>${listItems.map((it) => `<li>${it}</li>`).join("")}</${tag}>`);
      listItems = [];
      inList = false;
      lastWasSpacer = false;
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // Empty line -> paragraph spacer <p> </p> (Rule 9)
    if (!trimmed) {
      flushList();
      if (!lastWasSpacer && htmlChunks.length > 0) {
        htmlChunks.push("<p> </p>");
        lastWasSpacer = true;
      }
      continue;
    }

    // Bullet list item check: starts with •, *, or - followed by space
    const bulletMatch = trimmed.match(/^(?:•|\*|-(?=\s))\s*(.+)$/);
    if (bulletMatch) {
      if (inList !== "ul") flushList();
      inList = "ul";
      listItems.push(bulletMatch[1].trim());
      lastWasSpacer = false;
      continue;
    }

    // Numbered list item check: starts with digits + '.' or ')'
    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (orderedMatch) {
      if (inList !== "ol") flushList();
      inList = "ol";
      listItems.push(orderedMatch[2].trim());
      lastWasSpacer = false;
      continue;
    }

    flushList();
    lastWasSpacer = false;

    // Check for common Call Center heading prefixes or section markers
    const headerPrefixMatch = trimmed.match(
      /^(Temsilci:|MT:|Müşteri:|AÇILIŞ:|AÇILIŞ;|TEKLİF DETAYI:|TEKLİF DETAYI;|KAPANIŞ;|KAPANIŞ:|Anket Teklifi:|Cevap Evet ise:|Cevap Hayır ise:|“Evet” derse;|“Evet” derse:|“Hayır” derse;|“Hayır” derse:|İkna için [^:;]+[:;]|Âlâ Kredi Kartının ayrıcalıkları[:;]|Bonus Detayları[^\n]*)\s*(.*)$/i,
    );

    if (headerPrefixMatch) {
      const prefix = headerPrefixMatch[1].trim();
      const rest = headerPrefixMatch[2]?.trim();
      if (rest) {
        htmlChunks.push(`<p><strong>${prefix}</strong> ${rest}</p>`);
      } else {
        htmlChunks.push(`<p><strong>${prefix}</strong></p>`);
      }
      continue;
    }

    // Check for short section titles ending with : or ;
    if (trimmed.length <= 40 && !trimmed.includes(".") && (trimmed.endsWith(":") || trimmed.endsWith(";"))) {
      htmlChunks.push(`<p><strong>${trimmed}</strong></p>`);
      continue;
    }

    htmlChunks.push(`<p>${trimmed}</p>`);
  }

  flushList();

  // Strip trailing spacers
  while (htmlChunks.length > 0 && htmlChunks[htmlChunks.length - 1] === "<p> </p>") {
    htmlChunks.pop();
  }

  return htmlChunks.join("");
}

/**
 * Normalizes common Word customer name placeholders to EVAM CustomerName (Rule 22).
 */
export function normalizeSourcePlaceholders(text: string): { output: string; count: number } {
  let count = 0;
  // Replace (Müşteri Adı), [Müşteri Adı], [Ad], (Ad)
  const pattern = /(?:\[|\()(?:Müşteri\s+Adı|Ad)(?:\]|\))/gi;
  const output = text.replace(pattern, () => {
    count++;
    return EVAM_CUSTOMER_FIELDS.name;
  });
  return { output, count };
}

/**
 * Cleans Word HTML fragment into predictable, semantic EVAM-compatible HTML (Rules 8, 9, 10, 11, 12, 13).
 */
export function cleanWordHtml(rawHtml: string): {
  output: string;
  stats: HtmlConversionStats;
} {
  const preparedHtml = convertPlainTextToHtml(rawHtml);
  const tokenStore = createTokenStore();
  const protectedHtml = tokenStore.protect(preparedHtml);

  // Normalize source placeholders first
  const { output: placeholderCleaned, count: placeholdersConverted } =
    normalizeSourcePlaceholders(protectedHtml);

  const root = parse(placeholderCleaned, {
    comment: false,
    blockTextElements: { script: true, style: true, pre: true },
  });

  const stats: HtmlConversionStats = {
    paragraphs: 0,
    lists: 0,
    links: 0,
    placeholdersConverted,
  };

  // 1. Remove unwanted tags (script, style, iframe, etc.)
  for (const el of root.querySelectorAll("script, style, iframe, object, embed, meta, link")) {
    el.remove();
  }

  // 2. Remove classification noise paragraphs (Rule 40)
  for (const p of root.querySelectorAll("p, div, span")) {
    const text = p.text.trim();
    if (DOCUMENT_NOISE_PATTERNS.some((pattern) => pattern.test(text))) {
      p.remove();
    }
  }

  // 3. Serialize semantic nodes
  const serialized = serializeSemanticNode(root, stats);

  // Restore protected tokens
  const finalOutput = tokenStore.restore(serialized);

  return {
    output: finalOutput,
    stats,
  };
}

function serializeSemanticNode(node: Node, stats: HtmlConversionStats): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return node.rawText;
  }

  if (node.nodeType === NodeType.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.rawTagName ? el.rawTagName.toLowerCase() : "";

    if (!tag) {
      let innerContent = "";
      for (const child of el.childNodes) {
        innerContent += serializeSemanticNode(child, stats);
      }
      return innerContent;
    }

    // Check if intentional empty paragraph (Rule 9)
    if (tag === "p") {
      stats.paragraphs++;
      const innerTrimmed = el.text.trim();
      const hasChildren = el.querySelectorAll("img, a, strong, em, u, ul, ol, br").length > 0;
      if (!innerTrimmed && !hasChildren) {
        return "<p> </p>";
      }
    }

    if (tag === "ul" || tag === "ol") {
      stats.lists++;
    }

    if (tag === "a") {
      stats.links++;
      const href = el.getAttribute("href") || "#";
      // Attribute quotation marks must be single quotes (Rule 13, 38)
      // Escape inner single quotes if any
      const safeHref = href.replace(/'/g, "&#39;");
      let innerContent = "";
      for (const child of el.childNodes) {
        innerContent += serializeSemanticNode(child, stats);
      }
      return `<a href='${safeHref}'>${innerContent}</a>`;
    }

    // Allowed tags render semantically
    if (ALLOWED_HTML_TAGS.has(tag)) {
      if (tag === "br") return "<br />";

      let innerContent = "";
      for (const child of el.childNodes) {
        innerContent += serializeSemanticNode(child, stats);
      }
      return `<${tag}>${innerContent}</${tag}>`;
    }

    // Unwrap presentation wrappers (span, font, div, etc.)
    let innerContent = "";
    for (const child of el.childNodes) {
      innerContent += serializeSemanticNode(child, stats);
    }
    return innerContent;
  }

  return "";
}
