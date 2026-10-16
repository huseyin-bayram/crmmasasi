import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  parseExcelWorkbook,
  normalizeExcelDate,
  parseExcelSerialDate,
  checkBlockerStatus,
  evaluateDerivedStatus,
  autoMapHeaders,
  generateSchemaFingerprint,
  type DateOnly,
} from "../lib/excel-workspace";

/** Helper to generate in-memory Excel buffer from array-of-arrays */
function createWorkbookBuffer(rows: unknown[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

test("Excel Workspace: 1. Same CMS with multiple different owners", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"],
    ["CMS-1001", "Ortak Kampanya", "SMS", "01.06.2025", "Hüseyin Bayram"],
    ["CMS-1001", "Ortak Kampanya", "PUSH", "01.06.2025", "Uğur Bingöl"],
  ];
  const buffer = createWorkbookBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const req = result.state.requests.get("CMS-1001");
  assert.ok(req, "Request CMS-1001 should exist");
  assert.equal(req?.channelCount, 2, "Should have 2 channels");
  assert.equal(req?.owners.length, 2, "Should have 2 distinct owners");
  assert.ok(req?.owners.includes("Hüseyin Bayram"));
  assert.ok(req?.owners.includes("Uğur Bingöl"));
});

test("Excel Workspace: 2. Same CMS with different requesting units", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu", "Talep Sahibi Birim"],
    ["CMS-2002", "Bireysel Kredi", "Mobil", "01.06.2025", "İzel Beydemir", "Bireysel Pazarlama"],
    ["CMS-2002", "Bireysel Kredi", "Şube", "01.06.2025", "İzel Beydemir", "Şube Kanal Yönetimi"],
  ];
  const buffer = createWorkbookBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const req = result.state.requests.get("CMS-2002");
  assert.ok(req);
  assert.equal(req?.requestingUnits.length, 2);
  assert.ok(req?.requestingUnits.includes("Bireysel Pazarlama"));
  assert.ok(req?.requestingUnits.includes("Şube Kanal Yönetimi"));
});

test("Excel Workspace: 3. Duplicate CMS + Channel rows are preserved (Amendment 1)", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu", "Not"],
    ["CMS-3003", "Mükerrer Test", "SMS", "01.06.2025", "Ali", "Satır 1"],
    ["CMS-3003", "Mükerrer Test", "SMS", "01.06.2025", "Ali", "Satır 2"],
  ];
  const buffer = createWorkbookBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  // Both rows must be preserved, none overwritten
  assert.equal(result.state.operations.length, 2, "Both duplicate rows must be kept");
  assert.notEqual(result.state.operations[0].rowId, result.state.operations[1].rowId);
  assert.equal(result.state.operations[0].businessKey, "CMS-3003::SMS");
  assert.equal(result.state.operations[1].businessKey, "CMS-3003::SMS");

  // Both should have ERR_DUPLICATE_KEY quality issue
  assert.ok(result.state.operations[0].qualityIssues.some((q) => q.code === "ERR_DUPLICATE_KEY"));
  assert.ok(result.state.operations[1].qualityIssues.some((q) => q.code === "ERR_DUPLICATE_KEY"));
});

test("Excel Workspace: 4. Excel serial dates parsed correctly (Amendment 3)", () => {
  // 45444 = June 1, 2024
  const date = parseExcelSerialDate(45444);
  assert.ok(date);
  assert.equal(date?.year, 2024);
  assert.equal(date?.month, 6);
  assert.equal(date?.day, 1);
  assert.equal(date?.isoString, "2024-06-01");
});

test("Excel Workspace: 5. DD.MM.YYYY parsing (Amendment 3)", () => {
  const date = normalizeExcelDate("19.10.2026");
  assert.ok(date);
  assert.equal(date?.year, 2026);
  assert.equal(date?.month, 10);
  assert.equal(date?.day, 19);
  assert.equal(date?.isoString, "2026-10-19");
});

test("Excel Workspace: 6. No timezone date shift (Amendment 3)", () => {
  // Parsing a date should produce exact same calendar day regardless of local time
  const d1 = normalizeExcelDate("01.06.2025");
  assert.equal(d1?.isoString, "2025-06-01");
  assert.equal(d1?.day, 1);
  assert.equal(d1?.month, 6);

  // JavaScript Date with late evening hour (23:30) must not shift backwards or forwards
  const jsDate = new Date(2025, 5, 1, 23, 30, 0); // local 2025-06-01 23:30
  const d2 = normalizeExcelDate(jsDate);
  assert.equal(d2?.isoString, "2025-06-01");
});

test("Excel Workspace: 7. PEGA waiting note -> blocked (Amendment 4)", () => {
  const check = checkBlockerStatus("PEGA talebi henüz gelmedi");
  assert.equal(check.isBlocked, true);
  assert.ok(check.blockerReason?.includes("PEGA"));
});

test("Excel Workspace: 8. PEGA arrived note -> NOT blocked (Amendment 4)", () => {
  const check = checkBlockerStatus("PEGA talebi geldi, hazır.");
  assert.equal(check.isBlocked, false);
});

test("Excel Workspace: 9. Image waiting note -> blocked (Amendment 4)", () => {
  const check = checkBlockerStatus("Tasarım biriminden görsel bekleniyor.");
  assert.equal(check.isBlocked, true);
  assert.ok(check.blockerReason?.includes("görsel"));
});

test("Excel Workspace: 10. Image completed note -> NOT blocked (Amendment 4)", () => {
  const check = checkBlockerStatus("Görsel tamamlandı.");
  assert.equal(check.isBlocked, false);
});

test("Excel Workspace: 11. Unknown channel normalization", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"],
    ["CMS-5005", "Deneysel Kanal", "VR-Gözlük", "01.06.2025", "Ali"],
  ];
  const buffer = createWorkbookBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const op = result.state.operations[0];
  assert.equal(op.channel, "Diğer");
  assert.equal(op.rawChannel, "VR-Gözlük");
  assert.ok(op.qualityIssues.some((q) => q.code === "INFO_UNKNOWN_CHANNEL"));
});

test("Excel Workspace: 12. Missing owner detected as warning", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"],
    ["CMS-6006", "Sahipsiz Kampanya", "SMS", "01.06.2025", ""],
  ];
  const buffer = createWorkbookBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const op = result.state.operations[0];
  assert.ok(op.qualityIssues.some((q) => q.code === "WARN_MISSING_OWNER"));
});

test("Excel Workspace: 13. Invalid start/end date order detected as error", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Bitiş Tarihi", "Sorumlu"],
    ["CMS-7007", "Tarih Hatası", "SMS", "10.06.2025", "05.06.2025", "Ali"],
  ];
  const buffer = createWorkbookBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const op = result.state.operations[0];
  assert.ok(op.qualityIssues.some((q) => q.code === "ERR_DATE_ORDER"));
});

test("Excel Workspace: 14. Schema mapping change detection via fingerprint (Amendment 5)", () => {
  const headers1 = ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"];
  const headers2 = ["Talep No", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"];

  const fp1 = generateSchemaFingerprint(headers1);
  const fp2 = generateSchemaFingerprint(headers2);

  assert.notEqual(fp1, fp2, "Different column headers must produce different schema fingerprints");

  // Reordered headers with same names produce identical fingerprint
  const headersReordered = ["Kanal", "CMS Kodu", "Sorumlu", "Başlangıç Tarihi", "Kampanya Adı"];
  const fpReordered = generateSchemaFingerprint(headersReordered);
  assert.equal(fp1, fpReordered, "Reordered headers with identical names must yield identical fingerprint");
});

test("Excel Workspace: 15. Turkish 'İptal' status normalization", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu", "Statü"],
    ["CMS-8001", "İptal Kampanya 1", "SMS", "01.10.2026", "Hüseyin Bayram", "İptal"],
    ["CMS-8002", "İptal Kampanya 2", "PUSH", "01.10.2026", "İzel Beydemir", "İPTAL"],
    ["CMS-8003", "İptal Kampanya 3", "E-posta", "01.10.2026", "Ali Serim", "iptal edildi"],
  ];
  const buffer = createWorkbookBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.state.operations.length, 3);
  for (const op of result.state.operations) {
    assert.equal(op.derivedStatus, "cancelled");
    assert.equal(op.statusExplanation.status, "cancelled");
    assert.equal(op.statusExplanation.label, "İptal");
  }
});

