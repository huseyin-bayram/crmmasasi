import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  parseExcelWorkbook,
  getTodayDateOnly,
  createDateOnly,
  isBeforeDay,
  isAfterDay,
  daysDiff,
  type CampaignOperation,
  type WorkspaceState,
} from "../lib/excel-workspace";

function createBuffer(rows: unknown[][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

test("Workspace UI Logic: 1. Excel loading and owner extraction", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"],
    ["CMS-100", "Mevduat Kampanyası", "SMS", "10.06.2025", "Hüseyin Bayram"],
    ["CMS-200", "Kredi Kartı", "PUSH", "11.06.2025", "İzel Beydemir"],
    ["CMS-300", "Mobil Kampanya", "Mobil", "12.06.2025", "Uğur Bingöl"],
  ];
  const buffer = createBuffer(data);
  const result = parseExcelWorkbook(buffer);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.state.validRowCount, 3);
  assert.equal(result.state.availableOwners.length, 3);
  assert.ok(result.state.availableOwners.includes("Hüseyin Bayram"));
  assert.ok(result.state.availableOwners.includes("İzel Beydemir"));
  assert.ok(result.state.availableOwners.includes("Uğur Bingöl"));
});

test("Workspace UI Logic: 2. My Work owner filtering", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"],
    ["CMS-100", "Mevduat Kampanyası", "SMS", "10.06.2025", "Hüseyin Bayram"],
    ["CMS-200", "Kredi Kartı", "PUSH", "11.06.2025", "İzel Beydemir"],
    ["CMS-300", "Mobil Kampanya", "Mobil", "12.06.2025", "Hüseyin Bayram"],
  ];
  const buffer = createBuffer(data);
  const result = parseExcelWorkbook(buffer);
  if (!result.ok) return;

  const targetOwner = "Hüseyin Bayram";
  const filtered = result.state.operations.filter(
    (op) => op.owner?.trim().toLowerCase() === targetOwner.toLowerCase(),
  );

  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((op) => op.owner === targetOwner));
});

test("Workspace UI Logic: 3. My Work channel and search filtering", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu"],
    ["CMS-100", "Emekli Maaş Promosyonu", "SMS", "10.06.2025", "Ali"],
    ["CMS-200", "Genç Kart İndirimi", "PUSH", "11.06.2025", "Ali"],
    ["CMS-300", "Emekli Özel Kredi", "PUSH", "12.06.2025", "Ali"],
  ];
  const buffer = createBuffer(data);
  const result = parseExcelWorkbook(buffer);
  if (!result.ok) return;

  // Search by keyword "emekli"
  const searchResults = result.state.operations.filter((op) =>
    op.campaignName.toLowerCase().includes("emekli"),
  );
  assert.equal(searchResults.length, 2);

  // Filter by channel PUSH
  const pushResults = result.state.operations.filter((op) => op.channel === "PUSH");
  assert.equal(pushResults.length, 2);

  // Combined search + channel
  const combined = result.state.operations.filter(
    (op) => op.campaignName.toLowerCase().includes("emekli") && op.channel === "PUSH",
  );
  assert.equal(combined.length, 1);
  assert.equal(combined[0].cmsCode, "CMS-300");
});

test("Workspace UI Logic: 4. Daily Brief and My Work status grouping", () => {
  const today = createDateOnly(2025, 6, 15)!; // fixed today for deterministic test

  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Bitiş Tarihi", "Sorumlu", "Durum", "Not"],
    // 1. Bugün Aksiyon (startDate === today)
    ["CMS-01", "Bugün Başlayan", "SMS", "15.06.2025", "20.06.2025", "Ali", "", ""],
    // 2. Geciken (startDate < today, endDate < today, not completed)
    ["CMS-02", "Gecikmiş Kampanya", "PUSH", "01.06.2025", "10.06.2025", "Ali", "", ""],
    // 3. Blokeli (note says PEGA bekleniyor)
    ["CMS-03", "Blokeli Kampanya", "SMS", "15.06.2025", "20.06.2025", "Ali", "", "PEGA talebi henüz gelmedi"],
    // 4. Devam Eden (startDate < today, endDate >= today, not completed)
    ["CMS-04", "Aktif Devam Eden", "Mobil", "10.06.2025", "20.06.2025", "Ali", "", ""],
    // 5. Yaklaşan (startDate within 3 days: 17.06.2025 is 2 days ahead)
    ["CMS-05", "Yakın Kampanya", "E-posta", "17.06.2025", "25.06.2025", "Ali", "", ""],
    // 6. Uzak Gelecek (startDate 10 days ahead: 25.06.2025)
    ["CMS-06", "Uzak Kampanya", "Şube", "25.06.2025", "30.06.2025", "Ali", "", ""],
    // 7. Tamamlanan
    ["CMS-07", "Tamamlanan İş", "ATM", "01.06.2025", "05.06.2025", "Ali", "Tamamlandı", ""],
  ];

  const buffer = createBuffer(data);
  const result = parseExcelWorkbook(buffer, { todayDate: today });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const ops = result.state.operations;

  // Status assertions
  const opToday = ops.find((o) => o.cmsCode === "CMS-01")!;
  assert.equal(opToday.derivedStatus, "action_today");

  const opDelayed = ops.find((o) => o.cmsCode === "CMS-02")!;
  assert.equal(opDelayed.derivedStatus, "delayed");

  const opBlocked = ops.find((o) => o.cmsCode === "CMS-03")!;
  assert.equal(opBlocked.derivedStatus, "blocked");
  assert.ok(opBlocked.statusExplanation.reason.includes("PEGA"));

  const opActive = ops.find((o) => o.cmsCode === "CMS-04")!;
  // Check Devam Eden rule: startDate < today && endDate >= today && not completed/cancelled
  const isDevamEden =
    opActive.startDate &&
    isBeforeDay(opActive.startDate, today) &&
    opActive.endDate &&
    !isBeforeDay(opActive.endDate, today) &&
    opActive.derivedStatus !== "completed" &&
    opActive.derivedStatus !== "cancelled";
  assert.ok(isDevamEden, "CMS-04 should qualify as Devam Eden");

  // Daily Brief: Upcoming within 3 days check
  const opUpcomingNear = ops.find((o) => o.cmsCode === "CMS-05")!;
  const diffNear = daysDiff(today, opUpcomingNear.startDate!);
  assert.equal(diffNear, 2);
  assert.ok(diffNear >= 1 && diffNear <= 3, "CMS-05 should be within 3 days");

  const opUpcomingFar = ops.find((o) => o.cmsCode === "CMS-06")!;
  const diffFar = daysDiff(today, opUpcomingFar.startDate!);
  assert.equal(diffFar, 10);
  assert.ok(diffFar > 3, "CMS-06 should not be in the next 3 days brief");

  const opCompleted = ops.find((o) => o.cmsCode === "CMS-07")!;
  assert.equal(opCompleted.derivedStatus, "completed");
});

test("Workspace UI Logic: 5. Detail Drawer multi-channel aggregation for same CMS", () => {
  const data = [
    ["CMS Kodu", "Kampanya Adı", "Kanal", "Başlangıç Tarihi", "Sorumlu", "Durum"],
    ["CMS-5555", "Çoklu Kanal Kampanyası", "SMS", "10.06.2025", "Hüseyin Bayram", "Tamamlandı"],
    ["CMS-5555", "Çoklu Kanal Kampanyası", "PUSH", "10.06.2025", "Uğur Bingöl", "Gecikmiş"],
    ["CMS-5555", "Çoklu Kanal Kampanyası", "Şube", "10.06.2025", "İzel Beydemir", ""],
  ];
  const buffer = createBuffer(data);
  const result = parseExcelWorkbook(buffer);
  if (!result.ok) return;

  const targetCms = "CMS-5555";
  const relatedChannels = result.state.operations.filter(
    (o) => o.cmsCode.toLowerCase() === targetCms.toLowerCase(),
  );

  assert.equal(relatedChannels.length, 3);
  const channels = relatedChannels.map((c) => c.channel);
  assert.ok(channels.includes("SMS"));
  assert.ok(channels.includes("PUSH"));
  assert.ok(channels.includes("Şube"));

  // Sorumlular ayrı görünmeli
  const owners = relatedChannels.map((c) => c.owner);
  assert.ok(owners.includes("Hüseyin Bayram"));
  assert.ok(owners.includes("Uğur Bingöl"));
  assert.ok(owners.includes("İzel Beydemir"));
});

test("Workspace UI Logic: 6. Invalid Excel and Empty State error handling", () => {
  // Empty array
  const emptyBuffer = createBuffer([]);
  const emptyRes = parseExcelWorkbook(emptyBuffer);
  assert.equal(emptyRes.ok, false);
  assert.equal(emptyRes.error, "EMPTY_FILE");

  // Missing required column headers (with at least 1 data row)
  const missingHeadersBuffer = createBuffer([
    ["SadeceBirKolon", "BaşkaKolon"],
    ["Deger1", "Deger2"],
  ]);
  const missingRes = parseExcelWorkbook(missingHeadersBuffer);
  assert.equal(missingRes.ok, false);
  assert.equal(missingRes.error, "UNMAPPED_COLUMNS");
});
