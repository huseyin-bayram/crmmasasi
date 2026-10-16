/**
 * Deterministic date utilities for Ongoing & Real-time workspace.
 * Avoids any timezone shifting (uses UTC midnight boundaries).
 */

export function parseExcelDate(val: unknown): Date | null {
  if (val === undefined || val === null || val === "") return null;

  // 1. Number: Excel serial date (days since 1899-12-30)
  if (typeof val === "number" && !isNaN(val)) {
    if (val < 1) return null; // Invalid serial
    const wholeDays = Math.floor(val);
    const fraction = val - wholeDays;

    // Excel day count starting 1899-12-30
    const ms = (wholeDays - 25569) * 86400 * 1000 + Math.round(fraction * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Already Date
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // 3. String parsing
  const str = String(val).trim();
  if (!str) return null;

  // DD.MM.YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const d = new Date(Date.UTC(year, month, day, hour, minute));
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const minute = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const d = new Date(Date.UTC(year, month, day, hour, minute));
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback native Date.parse
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTurkishDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "-";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

export function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getDaysDifference(d1: Date, d2: Date): number {
  const m1 = toUtcMidnight(d1).getTime();
  const m2 = toUtcMidnight(d2).getTime();
  return Math.round((m2 - m1) / (1000 * 60 * 60 * 24));
}

/**
 * Parses time strings like "Every 09:07", "09:00", "14:30" and extracts the hour (0-23).
 */
export function extractExecutionHour(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(?:^|\b)(\d{1,2}):(\d{2})\b/);
  if (match) {
    const hour = parseInt(match[1], 10);
    return hour >= 0 && hour <= 23 ? hour : null;
  }
  return null;
}
