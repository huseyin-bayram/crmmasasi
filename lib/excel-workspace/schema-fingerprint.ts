/**
 * Schema fingerprinting for Excel workbooks (Amendment 5).
 * Generates a deterministic fingerprint from normalized header names.
 */

export function normalizeHeaderName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

/**
 * Computes a deterministic 32-bit FNV-1a hash of a string.
 */
function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Generates a unique schema fingerprint from Excel header names.
 * Headers are normalized and sorted so column order in Excel does not break mapping.
 */
export function generateSchemaFingerprint(headers: readonly string[]): string {
  const normalized = headers
    .map(normalizeHeaderName)
    .filter(Boolean)
    .sort();

  const combined = normalized.join("|");
  return `fp_${fnv1a(combined)}_${normalized.length}`;
}
