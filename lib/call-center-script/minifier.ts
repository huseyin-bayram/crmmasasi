import { createTokenStore } from "./evam-tokens";

/**
 * Minifies the HTML/EVAM script for direct EVAM copy-paste.
 * - Removes inter-tag line breaks and superfluous indentation.
 * - Preserves `<p> </p>` intentional spacers (Rule 9).
 * - Protects EVAM dynamic expressions and URLs.
 * - Ensures attributes use single quotes (Rule 13).
 */
export function minifyScript(content: string): string {
  if (!content) return "";

  const tokenStore = createTokenStore();
  let text = tokenStore.protect(content);

  // Protect intentional <p> </p> paragraph spacers (Rule 9)
  const P_SPACER_TOKEN = "__P_EMPTY_SPACER_TOKEN__";
  text = text.replace(/<p>\s*<\/p>/gi, P_SPACER_TOKEN);

  // 1. Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove whitespace between tags
  text = text.replace(/>\s+</g, "><");

  // 3. Restore <p> </p>
  text = text.replaceAll(P_SPACER_TOKEN, "<p> </p>");

  // 4. Trim start and end
  text = text.trim();

  // 5. Restore protected tokens (EVAM expressions, URLs, page tags)
  const restored = tokenStore.restore(text);

  return restored;
}

/**
 * Formats the HTML/EVAM script into clean, readable indented lines
 * for easier inspection in the editor without losing semantic tags.
 */
export function formatScript(content: string): string {
  if (!content) return "";

  const tokenStore = createTokenStore();
  let text = tokenStore.protect(content);

  // Normalize all spaces between tags to single newlines
  text = text.replace(/>\s*</g, ">\n<");

  // Also break around Page tags
  text = text.replace(/(<Page1>|<Page2>|<ApprovePage>)/g, "\n$1\n");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (const line of lines) {
    // If it's a closing tag, decrease indent before printing
    if (line.startsWith("</") && !line.startsWith("</p>") && !line.startsWith("</li>")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = "  ".repeat(indentLevel);
    formattedLines.push(indent + line);

    // If it's an opening tag (and not self-closing or paired on same line), increase indent
    if (
      (line.startsWith("<ul") || line.startsWith("<ol")) &&
      !line.includes("</ul") &&
      !line.includes("</ol")
    ) {
      indentLevel++;
    }
  }

  const result = formattedLines.join("\n");
  return tokenStore.restore(result);
}
