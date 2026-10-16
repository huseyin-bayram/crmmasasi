import { createTokenStore } from "./evam-tokens";

export interface TypographyChangeStats {
  apostrophes: number;
  quotes: number;
  dashes: number;
  ellipses: number;
  invisibleChars: number;
  total: number;
}

export function normalizeScriptTypography(input: string): {
  output: string;
  stats: TypographyChangeStats;
} {
  const tokenStore = createTokenStore();
  let text = tokenStore.protect(input);

  const stats: TypographyChangeStats = {
    apostrophes: 0,
    quotes: 0,
    dashes: 0,
    ellipses: 0,
    invisibleChars: 0,
    total: 0,
  };

  // 1. Smart apostrophes (Rules 31): ’ ‘ ´ ` ʹ ʻ ʼ -> '
  const apostropheRegex = /[’‘´`ʹʻʼ]/gu;
  const aposMatches = text.match(apostropheRegex);
  if (aposMatches) {
    stats.apostrophes = aposMatches.length;
    text = text.replace(apostropheRegex, "'");
  }

  // 2. Smart double quotes in campaign text (Rule 32): “ ” „ « » -> ''
  const quoteRegex = /[“”„«»]/gu;
  const quoteMatches = text.match(quoteRegex);
  if (quoteMatches) {
    stats.quotes = quoteMatches.length;
    text = text.replace(quoteRegex, "''");
  }

  // 3. Typographic dashes (Rule 34): — – ― ‒ − -> -
  const dashRegex = /[—–―‒−]/gu;
  const dashMatches = text.match(dashRegex);
  if (dashMatches) {
    stats.dashes += dashMatches.length;
    text = text.replace(dashRegex, "-");
  }

  // Decorative text separators: '--' -> '-'
  const multiDashRegex = /--+/g;
  const multiDashMatches = text.match(multiDashRegex);
  if (multiDashMatches) {
    stats.dashes += multiDashMatches.length;
    text = text.replace(multiDashRegex, "-");
  }

  // 4. Ellipsis (Rule 35): … -> ...
  const ellipsisRegex = /…/gu;
  const ellipMatches = text.match(ellipsisRegex);
  if (ellipMatches) {
    stats.ellipses = ellipMatches.length;
    text = text.replace(ellipsisRegex, "...");
  }

  // 5. Non-breaking spaces and invisible characters (Rule 36)
  // NBSP to normal space
  const nbspRegex = /[\u00A0\u202F\u2007]/gu;
  const nbspMatches = text.match(nbspRegex);
  if (nbspMatches) {
    stats.invisibleChars += nbspMatches.length;
    text = text.replace(nbspRegex, " ");
  }

  // Zero-width characters & BOM
  const invisibleRegex = /[\u200B\u200C\u200D\u2060\uFEFF\u200E\u200F\u00AD\u202A-\u202E\u2066-\u2069]/gu;
  const invMatches = text.match(invisibleRegex);
  if (invMatches) {
    stats.invisibleChars += invMatches.length;
    text = text.replace(invisibleRegex, "");
  }

  stats.total =
    stats.apostrophes +
    stats.quotes +
    stats.dashes +
    stats.ellipses +
    stats.invisibleChars;

  // Restore protected tokens
  const restored = tokenStore.restore(text);

  return {
    output: restored,
    stats,
  };
}
