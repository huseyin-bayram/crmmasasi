import { cleanWordHtml, HtmlConversionStats } from "./html-converter";
import { normalizeScriptTypography, TypographyChangeStats } from "./typography-normalizer";
import { insertStandardTemplate, TemplateInsertResult } from "./template";
import { insertApprovePageTag, analyzePageTags } from "./page-tags";
import { minifyScript, formatScript } from "./minifier";
import { validateScript, ScriptValidationResult } from "./validator";

export * from "./constants";
export * from "./docx-parser";
export * from "./evam-tokens";
export * from "./html-converter";
export * from "./typography-normalizer";
export * from "./template";
export * from "./page-tags";
export * from "./minifier";
export * from "./validator";

export interface CompileScriptOptions {
  autoInsertTemplate?: boolean;
  autoInsertApprovePage?: boolean;
  normalizeTypography?: boolean;
  minify?: boolean;
}

export interface CompileScriptResult {
  output: string;
  htmlStats: HtmlConversionStats;
  typoStats: TypographyChangeStats;
  templateResult: TemplateInsertResult;
  approvePageInserted: boolean;
  validation: ScriptValidationResult;
}

/**
 * End-to-end compilation pipeline converting Word HTML to production-ready EVAM script.
 * Follows all 76 Call Center Script Editor rules deterministically.
 */
export function compileCallCenterScript(
  rawInput: string,
  options: CompileScriptOptions = {},
): CompileScriptResult {
  const {
    autoInsertTemplate = true,
    autoInsertApprovePage = true,
    normalizeTypography = true,
    minify = true,
  } = options;

  // 1. Semantic HTML cleaning from Word markup (Rule 8, 9, 10, 11, 12, 13)
  const { output: cleanHtml, stats: htmlStats } = cleanWordHtml(rawInput);

  let currentText = cleanHtml;
  let typoStats: TypographyChangeStats = {
    apostrophes: 0,
    quotes: 0,
    dashes: 0,
    ellipses: 0,
    invisibleChars: 0,
    total: 0,
  };

  // 2. Normalize typography if enabled (Rules 31, 32, 34, 35, 36)
  if (normalizeTypography) {
    const typoResult = normalizeScriptTypography(currentText);
    currentText = typoResult.output;
    typoStats = typoResult.stats;
  }

  // 3. Auto-insert <ApprovePage> before KAPANIŞ if enabled (Rule 16)
  let approvePageInserted = false;
  if (autoInsertApprovePage) {
    const apResult = insertApprovePageTag(currentText);
    currentText = apResult.output;
    approvePageInserted = apResult.inserted;
  }

  // 4. Auto-insert standard template and customer header if enabled (Rules 18, 19)
  let templateResult: TemplateInsertResult = {
    output: currentText,
    templateInserted: false,
    redundantGreetingRemoved: false,
  };
  if (autoInsertTemplate) {
    templateResult = insertStandardTemplate(currentText);
    currentText = templateResult.output;
  }

  // 5. Minify or format
  let finalOutput = currentText;
  if (minify) {
    finalOutput = minifyScript(currentText);
  }

  // 6. Validate result
  const validation = validateScript(finalOutput);

  return {
    output: finalOutput,
    htmlStats,
    typoStats,
    templateResult,
    approvePageInserted,
    validation,
  };
}
