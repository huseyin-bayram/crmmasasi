import { POSITIVE_BLOCKER_PATTERNS, RESOLVED_SIGNALS } from "./constants";

export interface BlockerCheckResult {
  isBlocked: boolean;
  blockerReason?: string;
  matchedPattern?: string;
}

/**
 * Deterministic, phrase-based blocker detector (Amendment 4).
 * Prevents false positives by requiring full blocker phrases rather than bare keywords.
 * For example:
 *  - "PEGA talebi henüz gelmedi" -> BLOCKED
 *  - "PEGA talebi geldi" -> NOT BLOCKED
 *  - "Görsel bekleniyor" -> BLOCKED
 *  - "Görsel tamamlandı" -> NOT BLOCKED
 */
export function checkBlockerStatus(
  note: string,
  sourceStatus = "",
  pegaStatus = "",
): BlockerCheckResult {
  const combinedText = `${note || ""} ${sourceStatus || ""} ${pegaStatus || ""}`.trim();
  if (!combinedText) {
    return { isBlocked: false };
  }

  // 1. Check positive blocker patterns
  for (const pattern of POSITIVE_BLOCKER_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      const matchedPhrase = match[0].trim();

      // Check if this specific mention was resolved in the same context
      // e.g. "Görsel bekleniyordu ama geldi"
      const hasResolution = RESOLVED_SIGNALS.some((resPattern) => {
        return resPattern.test(combinedText) && !combinedText.includes("ancak") && !combinedText.includes("ama");
      });

      // If the matched phrase is explicitly an active blocker phrase (like "bekleniyor" or "gelmedi"),
      // check if it is negated by a resolution signal
      if (hasResolution) {
        // e.g. "PEGA talebi geldi"
        if (/geldi|tamamlandı|onaylandı|çözüldü|iletildi/i.test(matchedPhrase)) {
          continue;
        }
      }

      return {
        isBlocked: true,
        blockerReason: `Not alanında operasyonel engel tespit edildi: "${matchedPhrase}"`,
        matchedPattern: matchedPhrase,
      };
    }
  }

  return { isBlocked: false };
}
