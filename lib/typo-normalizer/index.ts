import type { EngineResult } from "@/lib/tools/engine";
import type { TypoCorrectionResult, TypoChange, TypoRuleId } from "./types";

export * from "./types";
export * from "./rules";

interface RuleDefinition {
  id: TypoRuleId;
  pattern: RegExp;
  replacement: string;
}

const RULES: readonly RuleDefinition[] = [
  {
    id: "smart-apostrophe",
    pattern: /[’‘´`ʹʻʼ]/gu,
    replacement: "'",
  },
  {
    id: "smart-quote",
    pattern: /[“”„«»]/gu,
    replacement: "''",
  },
  {
    id: "long-dash",
    pattern: /[—–―‒−]/gu,
    replacement: "-",
  },
  {
    id: "ellipsis",
    pattern: /…/gu,
    replacement: "...",
  },
  {
    id: "non-breaking-space",
    pattern: /[\u00A0\u202F\u2007]/gu,
    replacement: " ",
  },
  {
    id: "invisible",
    pattern: /[\u200B\u200C\u200D\u2060\uFEFF\u200E\u200F\u00AD\u202A-\u202E\u2066-\u2069]/gu,
    replacement: "",
  },
];

/**
 * Turkish to 7-bit ASCII transliteration mapping for SMS.
 * Â â -> A a, Ç ç -> C c, Ş ş -> S s, Ö ö -> O o, İ ı -> I i, Ğ ğ -> G g, Ü ü -> U u
 */
export const TURKISH_TO_ASCII_MAP: Record<string, string> = {
  "ç": "c", "Ç": "C",
  "ğ": "g", "Ğ": "G",
  "ı": "i", "İ": "I",
  "ö": "o", "Ö": "O",
  "ş": "s", "Ş": "S",
  "ü": "u", "Ü": "U",
  "â": "a", "Â": "A",
  "î": "i", "Î": "I",
  "û": "u", "Û": "U",
};

/**
 * Converts Turkish characters and diacritics into standard Latin ASCII characters for SMS.
 */
export function convertTurkishToAscii(text: string): { output: string; count: number } {
  let count = 0;
  const output = text
    .normalize("NFC")
    .replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/gu, (match) => {
      count++;
      return TURKISH_TO_ASCII_MAP[match] || match;
    })
    .replace(/[\u0300-\u036f]/gu, () => {
      count++;
      return "";
    });
  return { output, count };
}

/**
 * Mobil Şube sentence formatting:
 * Prepends literal '\n- ' to the first word following a sentence-ending dot (.).
 * Idempotent, skips ellipses and trailing dots.
 */
export function formatMobilSubeSentences(text: string): { output: string; count: number } {
  let count = 0;
  const output = text.replace(
    /(?<!\.)\.(?!\.)(?:\s+)(?!(?:\\n\s*-\s*)|$)(?=\S)/gu,
    () => {
      count++;
      return ". \\n- ";
    },
  );
  return { output, count };
}

/**
 * Normalizes problematic typography characters for campaign & CRM systems across 3 channels:
 * 1. SMS: Turkish characters converted to ASCII (A, C, G, I, O, S, U) + typo normalization.
 * 2. PUSH: Base typo normalization, preserving Turkish characters.
 * 3. Mobil Şube: Base typo normalization (preserves Turkish) + '\\n- ' bullet formatting after dots.
 */
export function correctTypography(
  input: string,
  options?: import("./types").TypoCorrectionOptions | import("./types").TypoChannelMode,
): EngineResult<TypoCorrectionResult> {
  const channel: import("./types").TypoChannelMode =
    typeof options === "string" ? options : options?.channel ?? "push";

  // 1. Run base typo rules (quotes, dashes, spaces, invisibles, ellipses)
  let baseOutput = input;
  const baseChanges: TypoChange[] = [];
  let baseTotalChanges = 0;

  for (const rule of RULES) {
    const matches = baseOutput.match(rule.pattern);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      baseOutput = baseOutput.replace(rule.pattern, rule.replacement);
      baseChanges.push({ rule: rule.id, count });
      baseTotalChanges += count;
    }
  }

  // 2. Compute channel-specific outputs from base
  // SMS: Base typo clean + Turkish to ASCII
  const smsAscii = convertTurkishToAscii(baseOutput);
  const smsOutput = smsAscii.output;

  // PUSH: Base typo clean (preserves Turkish)
  const pushOutput = baseOutput;

  // Mobil Şube: Base typo clean + sentence bullet formatting
  const mobilSubeFormatted = formatMobilSubeSentences(baseOutput);
  const mobilSubeOutput = mobilSubeFormatted.output;

  // 3. Assemble active channel's output and change tracking
  let activeOutput = pushOutput;
  const activeChanges: TypoChange[] = [...baseChanges];
  let activeTotalChanges = baseTotalChanges;

  if (channel === "sms") {
    activeOutput = smsOutput;
    if (smsAscii.count > 0) {
      activeChanges.push({ rule: "turkish-ascii", count: smsAscii.count });
      activeTotalChanges += smsAscii.count;
    }
  } else if (channel === "mobil-sube") {
    activeOutput = mobilSubeOutput;
    if (mobilSubeFormatted.count > 0) {
      activeChanges.push({ rule: "sentence-bullet", count: mobilSubeFormatted.count });
      activeTotalChanges += mobilSubeFormatted.count;
    }
  }

  return {
    ok: true,
    value: {
      output: activeOutput,
      totalChanges: activeTotalChanges,
      changes: activeChanges,
      channel,
      channelOutputs: {
        sms: smsOutput,
        push: pushOutput,
        "mobil-sube": mobilSubeOutput,
      },
    },
  };
}
