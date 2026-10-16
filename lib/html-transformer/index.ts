import type { EngineResult } from "@/lib/tools/engine";
import { minifyHtml, formatHtml } from "./minify";
import {
  parseHtml,
  extractBodyContent,
  removeUnsafeElements,
  cleanComments,
  cleanEmptyElements,
  normalizeImages,
  normalizeAttributes,
  replaceUnsubscribeUrl,
  serializeHtml,
  validateOutput,
  type PipelineContext,
} from "./pipeline";
import type {
  HtmlTransformResult,
  HtmlChange,
  HtmlIssue,
} from "./types";

export * from "./types";
export * from "./constants";
export * from "./minify";
export * from "./pipeline";
export * from "./read-file";

export interface TransformHtmlOptions {
  /** If true (default), collapses whitespace and minifies HTML structure. */
  minify?: boolean;
}

/**
 * Conservatively transforms e-mail HTML into clean, production-ready EVAM HTML.
 * Preserves tables, styles, images, image-maps, tracking pixels, links.
 * Strips wrappers, normalizes quotes to single-quotes, injects missing alt="",
 * converts unsubscribe links to EVAM variable, audits local paths and minifies HTML.
 */
export function transformHtml(
  input: string,
  options: TransformHtmlOptions = { minify: true },
): EngineResult<HtmlTransformResult> {
  if (!input || !input.trim()) {
    return {
      ok: false,
      error: {
        code: "EMPTY_INPUT",
        message: "Dönüştürülecek HTML kaynak kodu bulunamadı.",
        hint: "Sol panele e-posta HTML kodunu yapıştırın veya 'Dosya Yükle' butonu ile bir dosya seçin.",
      },
    };
  }

  const context: PipelineContext = {
    changes: [],
    issues: [],
  };

  // 1. Parse HTML AST
  const root = parseHtml(input);

  // 2. Extract Body Content and any <style> blocks
  const { container, extractedStyles } = extractBodyContent(root, context);

  // 3. Security cleanup (script, iframe, form, etc.)
  removeUnsafeElements(container, context);

  // 4. Clean generic comments (preserving Outlook/MSO conditionals)
  cleanComments(container);

  // 5. Clean empty & hidden elements (empty <h1>, etc., never deleting <td> spacers)
  cleanEmptyElements(container, context);

  // 6. Normalize images (alt="", tracking pixels preserved, local image audit)
  normalizeImages(container, context);

  // 7. Normalize attributes (invalid px/;, JS handlers, inline CSS spacing, relative link audit)
  normalizeAttributes(container, context);

  // 8. Replace Unsubscribe URLs with EVAM variable
  replaceUnsubscribeUrl(container, context);

  // 9. Serialize AST to single-quoted EVAM HTML with void element normalization
  let output = serializeHtml(container.childNodes);

  if (extractedStyles) {
    output = extractedStyles + output;
  }

  // 10. Minify HTML (if enabled)
  if (options.minify !== false) {
    const beforeLen = output.length;
    output = minifyHtml(output);
    if (output.length < beforeLen) {
      context.changes.push({
        kind: "minified",
        label: "Gereksiz boşluklar ve satır sonları temizlendi (Minify)",
        count: 1,
      });
    }
  }

  // 11. Validate output
  validateOutput(output, context);

  // 12. Calculate stats
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(input).length;
  const outputBytes = encoder.encode(output).length;
  const imageCount = (output.match(/<img\b/gi) || []).length;
  const linkCount = (output.match(/<a\b/gi) || []).length;

  return {
    ok: true,
    value: {
      output,
      changes: context.changes,
      issues: context.issues,
      stats: {
        inputBytes,
        outputBytes,
        images: imageCount,
        links: linkCount,
      },
    },
  };
}
