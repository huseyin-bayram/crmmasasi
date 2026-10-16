import { parse, HTMLElement, Node, NodeType, CommentNode, TextNode } from "node-html-parser";
import {
  UNSUBSCRIBE_VARIABLE,
  UNSUBSCRIBE_URL_PATTERNS,
  UNSUBSCRIBE_TEXT_PATTERNS,
  VOID_TAGS,
  UNSAFE_TAGS,
  PRESENTATIONAL_ATTRIBUTES,
} from "./constants";
import type { HtmlChange, HtmlIssue } from "./types";

export interface PipelineContext {
  changes: HtmlChange[];
  issues: HtmlIssue[];
}

/**
 * 1. Parses raw HTML into an AST supporting comments and block styles.
 */
export function parseHtml(rawHtml: string): HTMLElement {
  return parse(rawHtml, {
    comment: true,
    blockTextElements: {
      script: true,
      style: true,
      pre: true,
    },
  });
}

/**
 * 2. Extracts meaningful body content and any <style> blocks.
 * Discards document-level wrappers: <!DOCTYPE>, <html>, <head>, <meta>, <title>, <body>.
 * The resulting container's children start directly with the actual email content (typically <table>).
 */
export function extractBodyContent(
  root: HTMLElement,
  context: PipelineContext,
): { container: HTMLElement; extractedStyles: string } {
  const head = root.querySelector("head");
  const body = root.querySelector("body");

  // Extract <style> blocks if present
  let extractedStyles = "";
  const styles = root.querySelectorAll("style");
  if (styles.length > 0) {
    extractedStyles = styles.map((s) => s.toString().trim()).join("\n") + "\n";
  }

  const hadWrapper = !!(body || root.querySelector("html") || head);

  let container: HTMLElement;
  if (body) {
    container = body;
    context.changes.push({
      kind: "wrapper-removed",
      label: "<html>, <head> ve <body> sarmalayıcıları kaldırıldı",
      count: 1,
    });
  } else {
    // If no explicit body, create a container element holding content nodes
    const synth = parse("<div id='__tfkb_root__'></div>").querySelector("#__tfkb_root__")!;
    for (const child of root.childNodes) {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        const tag = (child as HTMLElement).rawTagName.toLowerCase();
        if (tag === "html" || tag === "head" || tag === "meta" || tag === "title") continue;
      }
      synth.appendChild(child);
    }
    container = synth;
    if (hadWrapper) {
      context.changes.push({
        kind: "wrapper-removed",
        label: "Gereksiz meta ve HTML sarmalayıcıları temizlendi",
        count: 1,
      });
    }
  }

  return { container, extractedStyles };
}

/**
 * Recursively walks all nodes starting from container.
 */
function walkTree(container: HTMLElement, visitor: (node: Node) => void): void {
  for (const node of [...container.childNodes]) {
    visitor(node);
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      walkTree(node as HTMLElement, visitor);
    }
  }
}

/**
 * 3. Removes unsafe elements: <script>, <iframe>, <object>, <embed>, <form>, <input>, etc.
 */
export function removeUnsafeElements(container: HTMLElement, context: PipelineContext): void {
  const toRemove: Node[] = [];
  let scriptCount = 0;
  let iframeCount = 0;
  let formCount = 0;

  walkTree(container, (node) => {
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.rawTagName.toLowerCase();

      if (tag === "script") {
        scriptCount++;
        toRemove.push(el);
      } else if (tag === "iframe" || tag === "object" || tag === "embed") {
        iframeCount++;
        toRemove.push(el);
      } else if (tag === "form" || tag === "input" || tag === "textarea" || tag === "select" || tag === "button") {
        formCount++;
        toRemove.push(el);
      }
    }
  });

  for (const el of toRemove) {
    el.remove();
  }

  if (scriptCount > 0) {
    context.issues.push({
      severity: "warning",
      code: "SCRIPT_REMOVED",
      message: `${scriptCount} adet <script> etiketi tespit edildi ve güvenlik nedeniyle temizlendi.`,
    });
    context.changes.push({
      kind: "script-removed",
      label: `${scriptCount} zararlı script etiketi temizlendi`,
      count: scriptCount,
    });
  }

  if (iframeCount > 0) {
    context.issues.push({
      severity: "warning",
      code: "IFRAME_REMOVED",
      message: `${iframeCount} adet güvensiz sarmalayıcı (iframe/embed/object) temizlendi.`,
    });
    context.changes.push({
      kind: "iframe-removed",
      label: `${iframeCount} iframe/embed etiketi temizlendi`,
      count: iframeCount,
    });
  }

  if (formCount > 0) {
    context.issues.push({
      severity: "warning",
      code: "FORM_REMOVED",
      message: `${formCount} adet form elementi e-posta güvenliği nedeniyle kaldırıldı.`,
    });
    context.changes.push({
      kind: "form-removed",
      label: `${formCount} form elementi temizlendi`,
      count: formCount,
    });
  }
}

/**
 * 4. Cleans generic HTML comments while strictly preserving Outlook/MSO conditionals.
 */
export function cleanComments(container: HTMLElement): void {
  const toRemove: Node[] = [];

  walkTree(container, (node) => {
    if (node.nodeType === NodeType.COMMENT_NODE) {
      const comment = node as CommentNode;
      const text = comment.rawText.trim();
      const isMso =
        text.startsWith("[if") ||
        text.startsWith("<![if") ||
        text.includes("mso") ||
        text.includes("endif");

      if (!isMso) {
        toRemove.push(comment);
      }
    }
  });

  for (const c of toRemove) {
    c.remove();
  }
}

/**
 * Helper to check if text or inner HTML is completely empty or blank.
 */
function isEmptyContent(text: string): boolean {
  const stripped = text
    .replace(/&nbsp;/gi, "")
    .replace(/&#160;/gi, "")
    .replace(/&#8203;/gi, "")
    .replace(/&zwnj;/gi, "")
    .replace(/&zwj;/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/[\s\u200B\u200C\u200D\uFEFF]/g, "");
  return stripped.length === 0;
}

/**
 * 5. Cleans empty/hidden <h1> headings and meaningless empty elements.
 * Critical: Never deletes <td> (table cells) even if empty, preserving layout spacers.
 */
export function cleanEmptyElements(container: HTMLElement, context: PipelineContext): void {
  let emptyH1Count = 0;
  let otherEmptyCount = 0;

  // Run up to 3 passes to catch nested empties: e.g. <h1><span></span></h1>
  for (let pass = 0; pass < 3; pass++) {
    const toRemove: HTMLElement[] = [];

    walkTree(container, (node) => {
      if (node.nodeType === NodeType.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.rawTagName.toLowerCase();

        // 1. Heading tags h1
        if (tag === "h1") {
          const style = (el.getAttribute("style") || "").toLowerCase();
          const isHidden =
            style.includes("display:none") ||
            style.includes("display: none") ||
            style.includes("font-size:0") ||
            style.includes("font-size: 0") ||
            style.includes("max-height:0") ||
            style.includes("visibility:hidden");

          const hasNoMeaningfulChildren =
            el.querySelectorAll("img, a, table").length === 0;

          if (isHidden || (hasNoMeaningfulChildren && isEmptyContent(el.text))) {
            toRemove.push(el);
            emptyH1Count++;
            return;
          }
        }

        // 2. Heading tags h2-h6
        if (/^h[2-6]$/.test(tag)) {
          if (el.querySelectorAll("img, a, table").length === 0 && isEmptyContent(el.text)) {
            toRemove.push(el);
            otherEmptyCount++;
            return;
          }
        }

        // 3. Other empty elements: p, span, font, b, i, strong, em, div
        // NEVER remove td, tr, table, th, tbody, map, area, a, img
        if (
          tag === "p" ||
          tag === "span" ||
          tag === "font" ||
          tag === "b" ||
          tag === "i" ||
          tag === "strong" ||
          tag === "em" ||
          tag === "div"
        ) {
          if (el.childNodes.length === 0 || (el.querySelectorAll("img, a, table").length === 0 && isEmptyContent(el.text))) {
            toRemove.push(el);
            otherEmptyCount++;
          }
        }
      }
    });

    if (toRemove.length === 0) break;
    for (const el of toRemove) {
      el.remove();
    }
  }

  if (emptyH1Count > 0) {
    context.changes.push({
      kind: "h1-removed",
      label: `${emptyH1Count} gereksiz/boş <h1> etiketi temizlendi`,
      count: emptyH1Count,
    });
  }

  if (otherEmptyCount > 0) {
    context.changes.push({
      kind: "empty-removed",
      label: `${otherEmptyCount} anlamsız boş element (<p>, <span>, <font> vb.) temizlendi`,
      count: otherEmptyCount,
    });
  }
}

/**
 * 6. Checks images:
 * - 1x1 tracking pixels are strictly preserved!
 * - Injects alt='' if missing.
 * - Warns on local/relative image sources.
 */
export function normalizeImages(container: HTMLElement, context: PipelineContext): void {
  let missingAltCount = 0;

  walkTree(container, (node) => {
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.rawTagName.toLowerCase() === "img") {
        const src = el.getAttribute("src") || "";

        // Check local image reference
        if (src) {
          const isLocalOrRelative =
            /^[a-zA-Z]:[\\\/]/.test(src) ||
            /^file:\/\//i.test(src) ||
            (!/^(?:https?:\/\/|\/\/|data:|cid:)/i.test(src) && !src.startsWith("#"));

          if (isLocalOrRelative) {
            context.issues.push({
              severity: "warning",
              code: "LOCAL_IMAGE",
              message: `Yerel / göreli görsel yolu tespit edildi: "${src}". EVAM / production ortamında görsel erişilemeyebilir.`,
            });
          }
        } else {
          context.issues.push({
            severity: "error",
            code: "IMG_NO_SRC",
            message: "src özniteliği bulunmayan <img> etiketi tespit edildi.",
          });
        }

        // Check alt attribute
        if (!el.hasAttribute("alt")) {
          el.setAttribute("alt", "");
          missingAltCount++;
        }
      }
    }
  });

  if (missingAltCount > 0) {
    context.changes.push({
      kind: "alt-added",
      label: `${missingAltCount} görsele eksik alt='' niteliği eklendi`,
      count: missingAltCount,
    });
  }
}

/**
 * 7. Normalizes element attributes:
 * - Removes invalid presentation attributes (e.g. height='78px;')
 * - Removes JS event handlers (onclick, etc.)
 * - Normalizes inline CSS spacing & deduplicates CSS declarations
 * - Warns on relative hyperlinks
 */
export function normalizeAttributes(container: HTMLElement, context: PipelineContext): void {
  let jsAttrCount = 0;
  let invalidAttrCount = 0;

  walkTree(container, (node) => {
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const attrs = { ...el.attributes };

      for (const [attrName, attrValue] of Object.entries(attrs)) {
        const lowerName = attrName.toLowerCase();

        // 1. Remove JavaScript event handlers
        if (/^on[a-z]+/i.test(lowerName)) {
          el.removeAttribute(attrName);
          jsAttrCount++;
          continue;
        }

        // 2. Remove invalid presentational attributes (e.g. height='78px;' or trailing semicolons in HTML attributes)
        if (PRESENTATIONAL_ATTRIBUTES.has(lowerName)) {
          if (attrValue.includes("px") || attrValue.includes(";") || attrValue.includes(":")) {
            el.removeAttribute(attrName);
            invalidAttrCount++;
            context.issues.push({
              severity: "warning",
              code: "INVALID_ATTR",
              message: `Geçersiz ${lowerName} attribute kaldırıldı: ${lowerName}='${attrValue}'`,
            });
            continue;
          }
        }

        // 3. Normalize inline style declaration spacing and handle duplicate style properties
        if (lowerName === "style" && attrValue) {
          const normalizedStyle = normalizeInlineStyle(attrValue);
          if (normalizedStyle !== attrValue) {
            el.setAttribute("style", normalizedStyle);
          }
        }

        // 4. Warn on relative links in <a>
        if (el.rawTagName.toLowerCase() === "a" && lowerName === "href") {
          const href = attrValue.trim();
          if (
            href &&
            !href.startsWith("http://") &&
            !href.startsWith("https://") &&
            !href.startsWith("mailto:") &&
            !href.startsWith("tel:") &&
            !href.startsWith("#") &&
            !href.startsWith("<PV:")
          ) {
            context.issues.push({
              severity: "warning",
              code: "RELATIVE_LINK",
              message: `Göreli bağlantı tespit edildi: "${href}".`,
            });
          }
        }
      }
    }
  });

  if (jsAttrCount > 0) {
    context.issues.push({
      severity: "warning",
      code: "JS_ATTR_REMOVED",
      message: `${jsAttrCount} adet JavaScript event attribute temizlendi.`,
    });
    context.changes.push({
      kind: "js-attr-removed",
      label: `${jsAttrCount} JavaScript attribute kaldırıldı`,
      count: jsAttrCount,
    });
  }

  if (invalidAttrCount > 0) {
    context.changes.push({
      kind: "invalid-attr-removed",
      label: `${invalidAttrCount} geçersiz presentation niteliği (px/;) kaldırıldı`,
      count: invalidAttrCount,
    });
  }
}

/**
 * Normalizes inline style declaration:
 * - Collapses redundant whitespace around colons and semicolons: "prop: value;"
 * - Deduplicates properties, keeping the last declared value (Rule 16).
 */
function normalizeInlineStyle(styleText: string): string {
  const declarations = styleText.split(";");
  const propMap = new Map<string, string>();
  const order: string[] = [];

  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();

    if (!propMap.has(prop)) {
      order.push(prop);
    }
    propMap.set(prop, val); // overwrite duplicate with last declaration
  }

  return order.map((p) => `${p}: ${propMap.get(p)};`).join(" ");
}

/**
 * 8. Converts unsubscribe links into EVAM variable: href='<PV:Eposta_Istemeyenler>'.
 * Never encodes as &lt;PV:Eposta_Istemeyenler&gt;.
 * Idempotent: already converted links are preserved.
 */
export function replaceUnsubscribeUrl(container: HTMLElement, context: PipelineContext): void {
  let unsubConvertedCount = 0;

  walkTree(container, (node) => {
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.rawTagName.toLowerCase() === "a") {
        const href = el.getAttribute("href") || "";
        const text = el.text || "";

        // Check if already EVAM variable (idempotency)
        if (href.includes("Eposta_Istemeyenler")) {
          return;
        }

        const isUnsubUrl = UNSUBSCRIBE_URL_PATTERNS.some((p) => p.test(href));
        const isUnsubText = UNSUBSCRIBE_TEXT_PATTERNS.some((p) => p.test(text));

        if (isUnsubUrl || isUnsubText) {
          el.setAttribute("href", UNSUBSCRIBE_VARIABLE);
          unsubConvertedCount++;
        } else if (
          /almak\s*istemiyorsanız|bülten|kampanya/i.test(text) &&
          !href.startsWith("<PV:")
        ) {
          context.issues.push({
            severity: "warning",
            code: "POTENTIAL_UNSUBSCRIBE",
            message: `Potansiyel unsubscribe bağlantısı tespit edildi ancak otomatik değişiklik yapılmadı: "${href}".`,
          });
        }
      }
    }
  });

  if (unsubConvertedCount > 0) {
    context.changes.push({
      kind: "unsub-converted",
      label: `${unsubConvertedCount} abonelikten çıkış bağlantısı ${UNSUBSCRIBE_VARIABLE} parametresine dönüştürüldü`,
      count: unsubConvertedCount,
    });
  }
}

/**
 * 9. Serializes AST to HTML with strict EVAM standards:
 * - All attributes enclosed in SINGLE QUOTES: attr='value' (Rule 14A)
 * - Inner single quotes escaped as &#39;
 * - Self-closing void tags: <br />, <img ... />, <area ... /> (Rule 13)
 * - EVAM variables like <PV:...> strictly preserved without HTML entity encoding (Rule 40)
 * - Text node contents preserved as-is without changing quotes (Rule 27)
 * - Outlook/MSO conditional comments preserved verbatim (Rule 25)
 */
export function serializeHtml(nodes: Node[]): string {
  let result = "";

  for (const node of nodes) {
    result += serializeNode(node);
  }

  return result;
}

function serializeNode(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const textNode = node as TextNode;
    let text = textNode.rawText;
    // Unescape accidental &lt;PV:Eposta_Istemeyenler&gt; in text
    if (text.includes("&lt;PV:")) {
      text = text.replace(/&lt;PV:([^&]+)&gt;/g, "<PV:$1>");
    }
    return text;
  }

  if (node.nodeType === NodeType.COMMENT_NODE) {
    const comment = node as CommentNode;
    const raw = comment.rawText;
    // Only serialize Outlook/MSO comments
    if (raw.includes("[if") || raw.includes("<![if") || raw.includes("mso") || raw.includes("endif")) {
      return `<!--${raw}-->`;
    }
    return "";
  }

  if (node.nodeType === NodeType.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tag = el.rawTagName.toLowerCase();
    const isVoid = VOID_TAGS.has(tag);

    let attrsStr = "";
    for (const [attrName, attrValue] of Object.entries(el.attributes)) {
      let serializedVal = attrValue;

      // Handle EVAM variable in attribute
      const isEvamVar = serializedVal.includes("<PV:");

      if (isEvamVar) {
        // Do not escape < and > in EVAM variables!
        // Escape any inner single quotes that are not part of the variable
        serializedVal = serializedVal.replace(/'/g, "&#39;");
      } else {
        // Escape inner single quotes to &#39; to maintain valid single-quoted HTML
        serializedVal = serializedVal.replace(/'/g, "&#39;");
      }

      attrsStr += ` ${attrName}='${serializedVal}'`;
    }

    if (isVoid) {
      return `<${tag}${attrsStr} />`;
    }

    let innerContent = "";
    for (const child of el.childNodes) {
      innerContent += serializeNode(child);
    }

    return `<${tag}${attrsStr}>${innerContent}</${tag}>`;
  }

  return "";
}

/**
 * 10. Validates the final HTML output.
 */
export function validateOutput(output: string, context: PipelineContext): void {
  if (!output || !output.trim()) {
    context.issues.push({
      severity: "error",
      code: "EMPTY_OUTPUT",
      message: "Dönüştürme sonucunda geçerli bir HTML içeriği üretilemedi.",
    });
    return;
  }

  // Check if output starts with table or style
  const trimmed = output.trim();
  if (!trimmed.startsWith("<table") && !trimmed.startsWith("<style") && !trimmed.startsWith("<!--[if")) {
    context.issues.push({
      severity: "info",
      code: "NON_TABLE_ROOT",
      message: "E-posta içeriği doğrudan bir tablo (<table>) ile başlamıyor.",
    });
  }

  // Verify EVAM variable is not escaped
  if (output.includes("&lt;PV:")) {
    context.issues.push({
      severity: "error",
      code: "ESCAPED_VARIABLE",
      message: "EVAM parametre değişkeni kaçış karakteri içeriyor (&lt;PV:…&gt;).",
    });
  }
}
