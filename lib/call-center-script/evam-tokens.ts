import { EVAM_PAGE_TAGS, EVAM_CUSTOMER_FIELDS, STANDARD_CALL_CENTER_TEMPLATE } from "./constants";

export interface ProtectedTokenStore {
  tokenMap: Map<string, string>;
  protect: (content: string) => string;
  restore: (content: string) => string;
}

/**
 * Creates a token store to protect EVAM syntax, page tags, and URLs
 * before typography normalization and HTML parsing.
 * Rules 14, 15, 16, 17, 30, 33, 39, 63, 66.
 */
export function createTokenStore(): ProtectedTokenStore {
  const tokenMap = new Map<string, string>();
  let tokenCounter = 0;

  function registerToken(original: string, prefix = "EVAM"): string {
    const token = `__${prefix}_TOKEN_${tokenCounter++}__`;
    tokenMap.set(token, original);
    return token;
  }

  function protect(content: string): string {
    let result = content;

    // 0. Protect entire standard template if already present (Rule 18, 28)
    if (result.includes(STANDARD_CALL_CENTER_TEMPLATE)) {
      result = result.replaceAll(STANDARD_CALL_CENTER_TEMPLATE, () =>
        registerToken(STANDARD_CALL_CENTER_TEMPLATE, "STD_TEMPLATE"),
      );
    }

    // 1. Protect Canonical Page Tags
    result = result.replace(/<Page1>/g, () => registerToken(EVAM_PAGE_TAGS.page1, "PAGE1"));
    result = result.replace(/<Page2>/g, () => registerToken(EVAM_PAGE_TAGS.page2, "PAGE2"));
    result = result.replace(/<ApprovePage>/g, () => registerToken(EVAM_PAGE_TAGS.approvePage, "APPROVE_PAGE"));

    // 2. Protect exact canonical customer placeholders
    for (const [, expr] of Object.entries(EVAM_CUSTOMER_FIELDS)) {
      const escaped = expr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), () => registerToken(expr, "CUST_FIELD"));
    }

    // 3. Protect generic EVAM expressions with double quotes: e.g. "+ &eec...+"
    // Pattern matches quotes containing + &eec...
    result = result.replace(
      /"\s*\+\s*&eec\.[a-zA-Z0-9_.]+\s*\+?\s*"/g,
      (match) => registerToken(match, "EVAM_EXPR"),
    );

    // 4. Protect href attributes in <a> tags so URLs are not touched by dash/quote replacements
    result = result.replace(/href=(["'])(.*?)\1/gi, (match, quote, url) => {
      // Keep href='__URL_TOKEN__' but protect the URL content
      const urlToken = registerToken(url, "URL");
      return `href='${urlToken}'`;
    });

    return result;
  }

  function restore(content: string): string {
    let result = content;
    // Iterate in reverse insertion order
    for (const [token, original] of Array.from(tokenMap.entries()).reverse()) {
      result = result.replaceAll(token, original);
    }
    return result;
  }

  return { tokenMap, protect, restore };
}
