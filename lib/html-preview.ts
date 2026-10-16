import { HTMLElement, parse, type Node } from "node-html-parser";

const previewTags = new Set([
  "html", "head", "body", "div", "span", "p", "br", "hr", "a", "img",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  "strong", "b", "em", "i", "u", "s", "small", "sub", "sup", "blockquote",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "center",
]);

const previewAttributes = new Set([
  "class", "title", "alt", "width", "height", "colspan", "rowspan", "align",
  "valign", "bgcolor", "border", "cellpadding", "cellspacing", "dir", "lang",
]);

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function serializePreviewNode(node: Node): string {
  if (!(node instanceof HTMLElement)) return escapeHtml(node.text);
  const tag = node.rawTagName.toLowerCase();
  if (tag === "style") return `<style>${node.rawText}</style>`;
  const content = node.childNodes.map(serializePreviewNode).join("");
  if (["html", "head", "body"].includes(tag)) return content;
  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => ` ${name.toLowerCase()}="${escapeHtml(value)}"`).join("");
  const opening = `<${tag}${attributes}>`;
  return ["br", "hr", "img", "col"].includes(tag) ? opening : `${opening}${content}</${tag}>`;
}

export function sanitizePreviewHtml(html: string, allowStyles = false): string {
  const root = parse(html, { comment: false });
  for (const element of root.querySelectorAll(
    "script, iframe, object, embed, form, input, button, textarea, select, meta, link, base, svg, math, template, noscript, video, audio, source",
  )) {
    element.remove();
  }

  for (const element of root.querySelectorAll("*").reverse()) {
    const tag = element.rawTagName.toLowerCase();
    if (tag === "style") {
      if (!allowStyles) element.remove();
      continue;
    }
    if (!previewTags.has(tag)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    for (const [attribute, value] of Object.entries(element.attributes)) {
      const name = attribute.toLowerCase();
      const localImage = tag === "img" && name === "src"
        && /^data:image\/(?:png|jpeg|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i.test(value);
      if (!previewAttributes.has(name) && !(allowStyles && name === "style") && !localImage) {
        element.removeAttribute(attribute);
      }
    }
  }
  return root.childNodes.map(serializePreviewNode).join("");
}

export function createHtmlPreviewDocument(html: string): string {
  const policy = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:16px;background-color:#f5f5f5;font-family:system-ui,sans-serif;}a{pointer-events:none;cursor:default;}</style></head><body>${sanitizePreviewHtml(html, true)}</body></html>`;
}
