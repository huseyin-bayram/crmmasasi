import type { DetectedLink } from "./types";

/**
 * Known URL shortener domains commonly used in SMS, push and social campaigns.
 */
export const SHORT_DOMAINS = new Set([
  "tfkb.cc",
  "bit.ly",
  "bitly.com",
  "t.co",
  "goo.gl",
  "tinyurl.com",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "lnkd.in",
  "youtu.be",
]);

/**
 * Finds http(s), bare `www.` and bare shortener URLs (e.g. tfkb.cc/..., bit.ly/...)
 * in free text (SMS, push, e-mail copy, call-center scripts).
 * Pure and client-side: only the resulting URLs are sent to the server.
 */
const URL_PATTERN =
  /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)*(?:tfkb\.cc|bit\.ly|bitly\.com|t\.co|goo\.gl|tinyurl\.com|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|lnkd\.in|youtu\.be)\/|(?:turkiyefinans|tfkb)\.com\.tr\/)[^\s<>"'`“”‘’«»\u00A0\u200B-\u200D\u2060\uFEFF]+/giu;

const TRAILING_PUNCTUATION = /[.,;:!?…]+$/u;

function trimTrailing(candidate: string): string {
  let value = candidate;
  // Repeat because punctuation and brackets can be interleaved: "(…site.com)."
  for (let i = 0; i < 4; i += 1) {
    const before = value;
    value = value.replace(TRAILING_PUNCTUATION, "");
    for (const [open, close] of [
      ["(", ")"],
      ["[", "]"],
      ["{", "}"],
    ] as const) {
      if (value.endsWith(close)) {
        const opens = value.split(open).length - 1;
        const closes = value.split(close).length - 1;
        if (closes > opens) value = value.slice(0, -1);
      }
    }
    if (value === before) break;
  }
  return value;
}

function normalize(raw: string): string {
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `https://${raw}`;
}

export function extractLinks(text: string): DetectedLink[] {
  if (!text) return [];

  const found = new Map<string, DetectedLink>();
  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = trimTrailing(match[0]);
    // Require at least something after the scheme / host
    if (raw.length < 8 || /^(?:https?:\/\/|www\.)$/i.test(raw)) continue;

    const url = normalize(raw);
    const existing = found.get(url);
    if (existing) {
      existing.occurrences += 1;
    } else {
      found.set(url, { raw, url, occurrences: 1 });
    }
  }
  return [...found.values()];
}
