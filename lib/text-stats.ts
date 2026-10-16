export interface TextStats {
  /** Unicode code points (not UTF-16 units), so "ğ" counts as 1. */
  characters: number;
  lines: number;
  words: number;
}

export function getTextStats(text: string): TextStats {
  if (!text) return { characters: 0, lines: 0, words: 0 };
  const trimmed = text.trim();
  return {
    characters: Array.from(text).length,
    lines: text.split(/\r\n|\r|\n/).length,
    words: trimmed ? trimmed.split(/\s+/u).length : 0,
  };
}

const numberFormat = new Intl.NumberFormat("tr-TR");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: kb < 10 ? 1 : 0 }).format(kb)} KB`;
  }
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(kb / 1024)} MB`;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
