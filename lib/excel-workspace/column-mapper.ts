import { COLUMN_ALIASES, REQUIRED_FIELDS, type RequiredField } from "./constants";
import { generateSchemaFingerprint, normalizeHeaderName } from "./schema-fingerprint";
import type { ColumnMappingConfig } from "./types";

export interface MappingResult {
  schemaFingerprint: string;
  mappings: Record<string, string>; // internalField -> actualExcelHeader
  unmappedRequired: RequiredField[];
  isComplete: boolean;
}

/**
 * Automatically maps Excel headers to internal fields using the alias dictionary.
 * Scoped by schema fingerprint (Amendment 5).
 */
export function autoMapHeaders(
  rawHeaders: readonly string[],
  savedConfig?: ColumnMappingConfig | null,
): MappingResult {
  const schemaFingerprint = generateSchemaFingerprint(rawHeaders);
  const mappings: Record<string, string> = {};

  // If a saved config exists and matches this exact schema fingerprint, apply it first
  if (savedConfig && savedConfig.schemaFingerprint === schemaFingerprint) {
    for (const [field, header] of Object.entries(savedConfig.mappings)) {
      if (header && rawHeaders.includes(header)) {
        mappings[field] = header;
      }
    }
  }

  // Pre-normalize actual Excel headers for fast matching
  const normalizedActualHeaders = rawHeaders.map((h) => ({
    original: h,
    normalized: normalizeHeaderName(h),
  }));

  // Auto-map any unmapped fields using alias dictionary
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (mappings[field]) continue; // already mapped from saved config

    const normalizedAliases = aliases.map(normalizeHeaderName);

    // Look for exact match first
    const found = normalizedActualHeaders.find((item) =>
      normalizedAliases.includes(item.normalized),
    );

    if (found) {
      mappings[field] = found.original;
    }
  }

  // Check which required fields are still missing
  const unmappedRequired: RequiredField[] = REQUIRED_FIELDS.filter(
    (req) => !mappings[req],
  );

  return {
    schemaFingerprint,
    mappings,
    unmappedRequired,
    isComplete: unmappedRequired.length === 0,
  };
}
