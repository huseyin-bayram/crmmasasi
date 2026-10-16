/**
 * Safely minifies HTML for email campaign systems:
 * - Strips non-conditional HTML comments (preserves <!--[if mso]>).
 * - Strips whitespace and linebreaks between tags.
 * - Collapses multiple spaces in text into a single space.
 * - Removes spaces around '=' in attributes.
 * - Minifies inline <style> CSS blocks.
 * - Protects <pre> and <textarea> blocks.
 */
export function minifyHtml(html: string): string {
  if (!html) return "";

  // 1. Protect pre and textarea blocks
  const protectedBlocks: string[] = [];
  let processed = html.replace(/<(pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const placeholder = `__PROTECTED_BLOCK_${protectedBlocks.length}__`;
    protectedBlocks.push(match);
    return placeholder;
  });

  // 2. Remove standard HTML comments (preserves Outlook conditionals like <!--[if mso]>)
  processed = processed.replace(/<!--(?!\s*\[if[\s\S]*?\])[\s\S]*?-->/gi, "");

  // 3. Minify <style> blocks
  processed = processed.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) => {
    const minifiedCss = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{}:;,])\s*/g, "$1")
      .trim();
    return `<style${attrs}>${minifiedCss}</style>`;
  });

  // 4. Remove whitespace around '=' in attributes
  processed = processed.replace(/\s*=\s*(["'])/g, "=$1");

  // 5. Remove whitespace around block and table tags
  const blockTags =
    "table|thead|tbody|tfoot|tr|td|th|div|p|ul|ol|li|h1|h2|h3|h4|h5|h6|section|header|footer|style";

  const afterRegex = new RegExp(`(<(?:\\/?(?:${blockTags}))\\b[^>]*>)[ \\t\\r\\n]+`, "gi");
  processed = processed.replace(afterRegex, "$1");

  const beforeRegex = new RegExp(`[ \\t\\r\\n]+(<(?:\\/?(?:${blockTags}))\\b[^>]*>)`, "gi");
  processed = processed.replace(beforeRegex, "$1");

  // Collapse multiple spaces/newlines in text to single space
  processed = processed.replace(/[ \t\r\n]{2,}/g, " ");

  // Collapse whitespace between adjacent tags
  processed = processed.replace(/>\s+</g, "><");

  // 6. Restore protected blocks
  for (let i = 0; i < protectedBlocks.length; i++) {
    processed = processed.replace(`__PROTECTED_BLOCK_${i}__`, protectedBlocks[i]);
  }

  return processed.trim();
}

/**
 * Basic indentation formatter for inspection.
 */
export function formatHtml(html: string): string {
  if (!html) return "";
  let formatted = "";
  let indent = 0;
  const tab = "  ";

  const tokens = html.replace(/>\s*</g, ">\n<").split("\n");
  for (let token of tokens) {
    token = token.trim();
    if (!token) continue;

    if (token.match(/^<\/(?!img|br|hr|input)/i)) {
      indent = Math.max(0, indent - 1);
    }

    formatted += tab.repeat(indent) + token + "\n";

    if (
      token.match(/^<(?!area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr|\/)/i) &&
      !token.includes("/>") &&
      !token.match(/<[a-z0-9]+[^>]*>.*<\/[a-z0-9]+>/i)
    ) {
      indent += 1;
    }
  }

  return formatted.trim();
}
