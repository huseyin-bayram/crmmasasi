/**
 * High-confidence metadata enrichment for campaign names and scenario names.
 * Explicitly marks derived metadata as derived (never assumes raw input).
 */

export interface EnrichmentResult {
  detectedCampaignId: string | null;
  detectedVersion: string | null;
}

/**
 * Extracts standalone 5-digit campaign IDs or CMS-prefixed IDs.
 * Rules:
 * - Must be standalone word or surrounded by delimiters: e.g. 30438, CMS30438, 49797
 * - Ignores year numbers (2024, 2025, 2026, 2027)
 */
export function extractCampaignId(text: string): string | null {
  if (!text) return null;

  // Check CMS12345
  const cmsMatch = text.match(/(?:^|[^0-9A-Za-z])CMS[-_]?(\d{5})(?:[^0-9A-Za-z]|$)/i);
  if (cmsMatch) {
    return cmsMatch[1];
  }

  // Standalone 5-digit number delimited by non-alphanumeric characters
  const match = text.match(/(?:^|[^0-9A-Za-z])(\d{5})(?:[^0-9A-Za-z]|$)/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Extracts scenario version like V2, V3, V4, v5, etc.
 */
export function extractVersion(text: string): string | null {
  if (!text) return null;

  const versionMatch = text.match(/(?:^|[^0-9A-Za-z])V([1-9]\d?)(?:[^0-9A-Za-z]|$)/i);
  if (versionMatch) {
    return `V${versionMatch[1]}`;
  }

  return null;
}

export function enrichScenarioMetadata(
  scenarioName: string,
  campaignName: string,
): EnrichmentResult {
  const combined = `${scenarioName} ${campaignName}`;
  return {
    detectedCampaignId: extractCampaignId(combined),
    detectedVersion: extractVersion(combined),
  };
}
