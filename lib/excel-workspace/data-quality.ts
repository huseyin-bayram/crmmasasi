import type { CampaignOperation, DataQualityIssue } from "./types";
import { isBeforeDay, isAfterDay, getTodayDateOnly } from "./date-normalizer";

/**
 * Validates a single operation row and collects data quality issues.
 * Section E of Architecture Specification v1.1.0.
 */
export function validateOperationRow(op: Omit<CampaignOperation, "qualityIssues" | "derivedStatus" | "statusExplanation">): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  // 1. Missing CMS Code (Error)
  if (!op.cmsCode || !op.cmsCode.trim()) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "cmsCode",
      severity: "error",
      code: "ERR_MISSING_CMS",
      message: "CMS talep kodu boş.",
    });
  }

  // 2. Missing Channel (Error)
  if (!op.rawChannel || !op.rawChannel.trim()) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "channel",
      severity: "error",
      code: "ERR_MISSING_CHANNEL",
      message: "Kanal bilgisi belirtilmemiş.",
    });
  }

  // 3. Missing or invalid start date (Error)
  if (!op.startDate) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "startDate",
      severity: "error",
      code: "ERR_INVALID_START_DATE",
      message: "Başlangıç tarihi geçersiz veya eksik.",
    });
  }

  // 4. Date order conflict: startDate > endDate (Error)
  if (op.startDate && op.endDate && isAfterDay(op.startDate, op.endDate)) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "endDate",
      severity: "error",
      code: "ERR_DATE_ORDER",
      message: `Bitiş tarihi (${op.endDate.isoString}) başlangıç tarihinden (${op.startDate.isoString}) önce olamaz.`,
    });
  }

  // 5. Missing owner (Warning)
  if (!op.owner || !op.owner.trim()) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "owner",
      severity: "warning",
      code: "WARN_MISSING_OWNER",
      message: "Sorumlu (CRM Sorumlusu) atanmamış.",
    });
  }

  // 6. Missing campaign name (Warning)
  if (!op.campaignName || !op.campaignName.trim()) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "campaignName",
      severity: "warning",
      code: "WARN_MISSING_NAME",
      message: "Kampanya adı belirtilmemiş.",
    });
  }

  // 7. Future completed campaign (Warning)
  const today = getTodayDateOnly();
  if (
    op.startDate &&
    isAfterDay(op.startDate, today) &&
    /tamamlandı|tamamlandi|yapıldı|bitti/i.test(op.sourceStatus || "")
  ) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "sourceStatus",
      severity: "warning",
      code: "WARN_FUTURE_COMPLETED",
      message: "Gelecek başlangıç tarihli bir kampanya 'Tamamlandı' olarak işaretlenmiş.",
    });
  }

  // 8. Unknown Channel (Info)
  if (op.channel === "Diğer" && op.rawChannel) {
    issues.push({
      rowId: op.rowId,
      excelRowNumber: op.excelRowIndex,
      field: "channel",
      severity: "info",
      code: "INFO_UNKNOWN_CHANNEL",
      message: `Standart dışı kanal adı: "${op.rawChannel}".`,
    });
  }

  return issues;
}

/**
 * Checks for duplicate business keys (CMS + Channel) across all operations (Amendment 1).
 * Never overwrites either row; marks both with ERR_DUPLICATE_KEY.
 */
export function checkDuplicateKeys(operations: CampaignOperation[]): void {
  const counts = new Map<string, number>();

  for (const op of operations) {
    if (op.businessKey && !op.businessKey.startsWith("UNKNOWN::")) {
      counts.set(op.businessKey, (counts.get(op.businessKey) || 0) + 1);
    }
  }

  for (const op of operations) {
    const count = counts.get(op.businessKey) || 0;
    if (count > 1) {
      op.qualityIssues.push({
        rowId: op.rowId,
        excelRowNumber: op.excelRowIndex,
        cmsCode: op.cmsCode,
        channel: op.channel,
        field: "businessKey",
        severity: "error",
        code: "ERR_DUPLICATE_KEY",
        message: `Mükerrer operasyon: '${op.businessKey}' kombinasyonuna sahip ${count} adet satır bulundu.`,
      });
    }
  }
}
