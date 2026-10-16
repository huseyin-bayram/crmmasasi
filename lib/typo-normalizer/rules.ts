import type { TypoRuleId } from "./types";

/**
 * Human-readable description of each normalization category.
 * Used by the UI to show — before and after a run — exactly which
 * character groups the tool touches. The replacement tables themselves
 * belong to the engine and will be added in the engine phase.
 */
export interface TypoRuleCategory {
  id: TypoRuleId;
  label: string;
  /** Short visual sample: source characters → target. */
  sample: string;
}

export const TYPO_RULE_CATEGORIES: readonly TypoRuleCategory[] = [
  { id: "smart-apostrophe", label: "Akıllı kesme işareti", sample: "’ ‘ ´ ` → '" },
  { id: "smart-quote", label: "Akıllı çift tırnak", sample: "“ ” „ « » → ''" },
  { id: "long-dash", label: "Uzun tire", sample: "— – ― → -" },
  { id: "ellipsis", label: "Üç nokta", sample: "… → ..." },
  { id: "non-breaking-space", label: "Bölünmez boşluk", sample: "NBSP → boşluk" },
  { id: "invisible", label: "Görünmez karakter", sample: "ZWSP, ZWJ, ZWNJ" },
  { id: "turkish-ascii", label: "Türkçe karakter dönüşümü (SMS)", sample: "Â,ç,ğ,ı,ö,ş,ü → A,c,g,i,o,s,u" },
  { id: "sentence-bullet", label: "Cümle başı kaçış ifadesi (Mobil Şube)", sample: ". Kelime → . \\n- Kelime" },
];

/** Never transliterated or altered. */
export const PROTECTED_TURKISH_CHARACTERS = [
  "ç", "Ç", "ğ", "Ğ", "ı", "İ", "ö", "Ö", "ş", "Ş", "ü", "Ü",
] as const;
