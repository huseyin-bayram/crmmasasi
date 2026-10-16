import type { DateOnly, DerivedStatus, StatusExplanation } from "./types";
import { isBeforeDay, isSameDay, getTodayDateOnly } from "./date-normalizer";
import { checkBlockerStatus } from "./blocker-engine";
import { normalizeTurkishText } from "./constants";

export interface StatusEvaluationInput {
  sourceStatus: string;
  startDate: DateOnly | null;
  note: string;
  pegaStatus?: string;
  hasCriticalIssue?: boolean;
  today?: DateOnly; // allows injecting test dates
}

/**
 * Calculates deterministic derived operational status with explainable reasons.
 * Section D of Architecture Specification v1.1.0.
 */
export function evaluateDerivedStatus(input: StatusEvaluationInput): StatusExplanation {
  const { sourceStatus = "", startDate, note = "", pegaStatus = "", hasCriticalIssue = false } = input;
  const today = input.today ?? getTodayDateOnly();

  const normalizedSource = normalizeTurkishText(sourceStatus);
  const normalizedNote = normalizeTurkishText(note);
  const normalizedPega = normalizeTurkishText(pegaStatus);

  // 1. Tamamlandı (Highest precedence)
  if (
    normalizedSource.includes("tamamlandi") ||
    normalizedSource.includes("tamamlandı") ||
    normalizedSource.includes("yapildi") ||
    normalizedSource.includes("yapıldı") ||
    normalizedSource.includes("gonderildi") ||
    normalizedSource.includes("gönderildi") ||
    normalizedSource.includes("bitti")
  ) {
    return {
      status: "completed",
      label: "Tamamlandı",
      reason: `Excel Durum alanı '${sourceStatus.trim()}' olarak işaretlenmiş.`,
      badgeTone: "success",
    };
  }

  // 2. İptal (Turkish-aware matching for "İptal", "İptal Edildi", etc.)
  if (
    normalizedSource.includes("iptal") ||
    normalizedSource.includes("vazgecildi") ||
    normalizedSource.includes("cikartildi") ||
    normalizedPega.includes("iptal edildi") ||
    normalizedNote.includes("iptal edildi")
  ) {
    const reason = normalizedSource.includes("iptal")
      ? `Excel Durum alanı '${sourceStatus.trim()}' olarak işaretlenmiş.`
      : `Operasyonel not/PEGA alanında iptal bilgisi tespit edildi.`;
    return {
      status: "cancelled",
      label: "İptal",
      reason,
      badgeTone: "neutral",
    };
  }

  // 3. Kontrol Gerekli (Veri kalitesi problemi)
  if (hasCriticalIssue || !startDate) {
    return {
      status: "review_required",
      label: "Kontrol Gerekli",
      reason: "Kritik veri eksikliği: Başlangıç tarihi veya kanal bilgisi geçersiz.",
      badgeTone: "info",
    };
  }

  // 4. Blokeli (Phrase-based blocker detection)
  const blocker = checkBlockerStatus(note, sourceStatus, pegaStatus);
  if (blocker.isBlocked && blocker.blockerReason) {
    return {
      status: "blocked",
      label: "Blokeli",
      reason: blocker.blockerReason,
      badgeTone: "danger",
    };
  }

  // 5. Gecikmiş (startDate < today)
  if (isBeforeDay(startDate, today)) {
    return {
      status: "delayed",
      label: "Gecikmiş",
      reason: `Başlangıç tarihi geçti (${startDate.isoString}) ancak Durum alanı boş/tamamlanmamış.`,
      badgeTone: "danger",
    };
  }

  // 6. Bugün Aksiyon (startDate == today)
  if (isSameDay(startDate, today)) {
    return {
      status: "action_today",
      label: "Bugün Aksiyon",
      reason: "Kampanya başlangıç tarihi bugün. Aksiyon bekleniyor.",
      badgeTone: "warning",
    };
  }

  // 7. Yaklaşan (startDate > today)
  return {
    status: "upcoming",
    label: "Yaklaşan",
    reason: `Kampanya başlangıç tarihi (${startDate.isoString}) henüz gelmedi.`,
    badgeTone: "info",
  };
}
