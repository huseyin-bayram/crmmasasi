import type { DateOnly } from "./types";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Creates a validated DateOnly object.
 * Returns null if the date components are invalid.
 */
export function createDateOnly(year: number, month: number, day: number): DateOnly | null {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 1990 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Day sanity check: if day exceeds days in month (e.g. 31/09), clamp to last day of month
  const daysInMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);

  return {
    year,
    month,
    day: safeDay,
    isoString: `${year}-${pad(month)}-${pad(safeDay)}`,
  };
}

/**
 * Parses an Excel serial date number (e.g. 45444).
 * Uses UTC date calculations to avoid local timezone shifts (Amendment 3).
 */
export function parseExcelSerialDate(serial: number): DateOnly | null {
  if (typeof serial !== "number" || isNaN(serial) || serial <= 0) return null;

  const wholeDays = Math.floor(serial);
  // Excel base: Dec 30, 1899 (handles 1900 leap year bug)
  const msPerDay = 86400000;
  // Unix epoch (1970-01-01) is 25569 days after Excel day 0
  const unixMs = (wholeDays - 25569) * msPerDay;
  const d = new Date(unixMs);

  return createDateOnly(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Parses any incoming date representation into a canonical DateOnly.
 * Supports:
 * - Excel serial number
 * - JavaScript Date
 * - DD.MM.YYYY / D.M.YYYY
 * - DD/MM/YYYY / D/M/YYYY
 * - YYYY-MM-DD
 */
export function normalizeExcelDate(val: unknown): DateOnly | null {
  if (val === null || val === undefined || val === "") return null;

  // 1. Number -> Excel serial date
  if (typeof val === "number") {
    return parseExcelSerialDate(val);
  }

  // 2. JS Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    // If constructed with midnight UTC, use UTC date components; otherwise use local date components
    if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
      return createDateOnly(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate());
    }
    return createDateOnly(val.getFullYear(), val.getMonth() + 1, val.getDate());
  }

  // 3. String parsing
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Numeric string (e.g. "45444")
    if (/^\d{5}$/.test(trimmed)) {
      return parseExcelSerialDate(parseInt(trimmed, 10));
    }

    // DD.MM.YYYY or D.M.YYYY
    const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
      const day = parseInt(dotMatch[1], 10);
      const month = parseInt(dotMatch[2], 10);
      const year = parseInt(dotMatch[3], 10);
      return createDateOnly(year, month, day);
    }

    // DD/MM/YYYY or D/M/YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      return createDateOnly(year, month, day);
    }

    // ISO: YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      return createDateOnly(year, month, day);
    }
  }

  return null;
}

/**
 * Returns today's local date as a canonical DateOnly.
 */
export function getTodayDateOnly(): DateOnly {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    isoString: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  };
}

/**
 * Compares two DateOnly objects leksikografik olarak (YYYY-MM-DD).
 * Returns:
 *  - negative if a < b
 *  - 0 if a == b
 *  - positive if a > b
 */
export function compareDates(a: DateOnly, b: DateOnly): number {
  return a.isoString.localeCompare(b.isoString);
}

export function isSameDay(a: DateOnly, b: DateOnly): boolean {
  return a.isoString === b.isoString;
}

export function isBeforeDay(a: DateOnly, b: DateOnly): boolean {
  return a.isoString < b.isoString;
}

export function isAfterDay(a: DateOnly, b: DateOnly): boolean {
  return a.isoString > b.isoString;
}

/**
 * Calculates calendar day difference (b - a).
 * Positive if b is after a, negative if b is before a.
 * Uses UTC dates to guarantee zero timezone shift.
 */
export function daysDiff(a: DateOnly, b: DateOnly): number {
  const utcA = Date.UTC(a.year, a.month - 1, a.day);
  const utcB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((utcB - utcA) / 86400000);
}

/**
 * Formats DateOnly as DD.MM.YYYY for UI display.
 */
export function formatDateOnly(date: DateOnly | null | undefined): string {
  if (!date) return "—";
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(date.day)}.${pad(date.month)}.${date.year}`;
}
