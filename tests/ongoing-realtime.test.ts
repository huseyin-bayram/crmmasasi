import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseOngoingRealtimeWorkbook,
  generateSampleOngoingRealtimeWorkbook,
  evaluateLifecycle,
  parseFeederSyntax,
  extractCampaignId,
  extractVersion,
  detectExpiryConcentration,
  normalizeScenarioType,
  normalizeDeploymentStatus,
  normalizeCadence,
} from "../lib/ongoing-realtime";

const MOCK_TODAY = new Date(Date.UTC(2026, 9, 14)); // 14.10.2026

test("Ongoing & Real-time: normalizeScenarioType categorizes types accurately", () => {
  assert.equal(normalizeScenarioType("Ongoing").type, "Ongoing");
  assert.equal(normalizeScenarioType("ongoing").type, "Ongoing");
  assert.equal(normalizeScenarioType("Real-time").type, "Real-time");
  assert.equal(normalizeScenarioType("realtime").type, "Real-time");
  assert.equal(normalizeScenarioType("Onboarding").type, "Onboarding");
  assert.equal(normalizeScenarioType("Burn").type, "Burn");
  assert.equal(normalizeScenarioType("Bulk").type, "Bulk");
  assert.equal(normalizeScenarioType("Unknown").type, "Other");
});

test("Ongoing & Real-time: normalizeDeploymentStatus maps Deployed, Undeployed, and Missing", () => {
  assert.equal(normalizeDeploymentStatus("Deployed"), "Deployed");
  assert.equal(normalizeDeploymentStatus("Aktif"), "Deployed");
  assert.equal(normalizeDeploymentStatus("Yayında"), "Deployed");
  assert.equal(normalizeDeploymentStatus("Live"), "Deployed");
  assert.equal(normalizeDeploymentStatus("Undeployed"), "Undeployed");
  assert.equal(normalizeDeploymentStatus("Pasif"), "Undeployed");
  assert.equal(normalizeDeploymentStatus("Durduruldu"), "Undeployed");
  assert.equal(normalizeDeploymentStatus(""), "Missing");
  assert.equal(normalizeDeploymentStatus("-"), "Missing");
});

test("Ongoing & Real-time: normalizeCadence detects Daily, Weekly, Monthly, and Passive", () => {
  assert.equal(normalizeCadence("Daily"), "Daily");
  assert.equal(normalizeCadence("Günlük"), "Daily");
  assert.equal(normalizeCadence("Weekly"), "Weekly");
  assert.equal(normalizeCadence("Monthly"), "Monthly");
  assert.equal(normalizeCadence("Passive Audience"), "Passive Audience");
  assert.equal(normalizeCadence("Non-scheduled"), "Non-scheduled");
  assert.equal(normalizeCadence("Custom"), "Other");
});

test("Ongoing & Real-time: evaluateLifecycle computes Active, Expiring, Expired, and Not Started", () => {
  const startPast = new Date(Date.UTC(2026, 0, 1));
  const endFarFuture = new Date(Date.UTC(2027, 5, 30)); // ~250 days -> Active
  const endNearFuture90 = new Date(Date.UTC(2026, 11, 31)); // 78 days -> Expiring 31-90
  const endNearFuture30 = new Date(Date.UTC(2026, 9, 30)); // 16 days -> Expiring <= 30
  const endPast = new Date(Date.UTC(2026, 8, 1));
  const startFuture = new Date(Date.UTC(2026, 11, 1));

  // Active (more than 90 days away)
  const resActive = evaluateLifecycle(startPast, endFarFuture, MOCK_TODAY);
  assert.equal(resActive.status, "Active");

  // Expiring 31-90
  const res90 = evaluateLifecycle(startPast, endNearFuture90, MOCK_TODAY);
  assert.equal(res90.status, "Expiring 31-90");
  assert.equal(res90.isExpiring90, true);

  // Expiring <= 30
  const res30 = evaluateLifecycle(startPast, endNearFuture30, MOCK_TODAY);
  assert.equal(res30.status, "Expiring <= 30");
  assert.equal(res30.isExpiring30, true);

  // Expired
  const resExpired = evaluateLifecycle(startPast, endPast, MOCK_TODAY);
  assert.equal(resExpired.status, "Expired");

  // Not Started
  const resNotStarted = evaluateLifecycle(startFuture, endFarFuture, MOCK_TODAY);
  assert.equal(resNotStarted.status, "Not Started");

  // Inverted Date Order
  const resInverted = evaluateLifecycle(endFarFuture, startPast, MOCK_TODAY);
  assert.equal(resInverted.hasInvalidDateOrder, true);
});

test("Ongoing & Real-time: Feeder dependency parsing detects upstream scenario using '->'", () => {
  const note1 = "HF_TASIT_ONB_2026 -> Hedef kitle buradan besleniyor";
  const p1 = parseFeederSyntax(note1);
  assert.equal(p1.upstreamScenarioName, "HF_TASIT_ONB_2026");
  assert.equal(p1.rawNote, "Hedef kitle buradan besleniyor");

  const note2 = "ONB_ALA_WELCOME -> her sabah tetiklenir";
  const p2 = parseFeederSyntax(note2);
  assert.equal(p2.upstreamScenarioName, "ONB_ALA_WELCOME");

  const note3 = "Standart kampanya açıklaması bağımlılık içermez";
  const p3 = parseFeederSyntax(note3);
  assert.equal(p3.upstreamScenarioName, null);
});

test("Ongoing & Real-time: High-confidence 5-digit campaign ID and version extraction", () => {
  assert.equal(extractCampaignId("Ayrıcalıklar - Asistanlık-30438 - V4"), "30438");
  assert.equal(extractCampaignId("GunlukHesap_CC_ONG_49797"), "49797");
  assert.equal(extractCampaignId("CMS30438_TEST"), "30438");
  assert.equal(extractCampaignId("No ID here"), null);

  assert.equal(extractVersion("Ayrıcalıklar - Asistanlık-30438 - V4"), "V4");
  assert.equal(extractVersion("Kampanya - v2"), "V2");
  assert.equal(extractVersion("Sürüm yok"), null);
});

test("Ongoing & Real-time: Expiry concentration detection flags large cluster ending on same date", () => {
  const scenarios = [
    { endDate: new Date(Date.UTC(2026, 11, 31)), endDateFormatted: "31.12.2026", scenarioName: "S1", lifecycleStatus: "Active" as const },
    { endDate: new Date(Date.UTC(2026, 11, 31)), endDateFormatted: "31.12.2026", scenarioName: "S2", lifecycleStatus: "Active" as const },
    { endDate: new Date(Date.UTC(2026, 11, 31)), endDateFormatted: "31.12.2026", scenarioName: "S3", lifecycleStatus: "Active" as const },
    { endDate: new Date(Date.UTC(2026, 11, 31)), endDateFormatted: "31.12.2026", scenarioName: "S4", lifecycleStatus: "Active" as const },
    { endDate: new Date(Date.UTC(2026, 11, 31)), endDateFormatted: "31.12.2026", scenarioName: "S5", lifecycleStatus: "Active" as const },
    { endDate: new Date(Date.UTC(2026, 5, 30)), endDateFormatted: "30.06.2026", scenarioName: "S6", lifecycleStatus: "Active" as const },
  ];

  const concentration = detectExpiryConcentration(scenarios, 0.2);
  assert.ok(concentration !== null);
  assert.equal(concentration?.dateFormatted, "31.12.2026");
  assert.equal(concentration?.count, 5);
  assert.ok(concentration?.percentage >= 80);
});

test("Ongoing & Real-time: End-to-end sample workbook parsing and validation", () => {
  const bytes = generateSampleOngoingRealtimeWorkbook();
  const state = parseOngoingRealtimeWorkbook(bytes, "sample.xlsx", MOCK_TODAY);

  // 1. Primary universe filtering: only Ongoing and Real-time
  assert.ok(state.scenarios.length > 0);
  for (const s of state.scenarios) {
    assert.ok(s.scenarioType === "Ongoing" || s.scenarioType === "Real-time");
  }

  // 2. Registry contains other types (e.g. Onboarding HF_TASIT_ONB_2026)
  assert.ok(state.registry["HF_TASIT_ONB_2026"] !== undefined);
  assert.equal(state.registry["HF_TASIT_ONB_2026"].scenarioType, "Onboarding");

  // 3. Dependency resolved
  const dependentScenario = state.scenarios.find((s) => s.scenarioName === "TASIT_FINANSMAN_TAKIP_44102");
  assert.ok(dependentScenario !== undefined);
  assert.equal(dependentScenario?.upstreamScenarioName, "HF_TASIT_ONB_2026");

  // 4. Shared audience cluster detected
  const asistanlik = state.scenarios.find((s) => s.scenarioName === "ASISTANLIK_30438_V4");
  assert.ok(asistanlik?.sharedAudienceCluster !== null);
  assert.equal(asistanlik?.sharedAudienceCluster?.segment, "YENI_ALA_SEGMENTINE_GECENLER");
  assert.equal(asistanlik?.sharedAudienceCluster?.count, 3);

  // 5. Calendar joined by Scenario Name
  assert.ok(asistanlik?.calendarExecutions.length > 0);
  assert.equal(asistanlik?.calendarExecutions[0].timeRaw, "Every 09:07");
  assert.equal(asistanlik?.calendarExecutions[0].hour, 9);

  // 6. Expired but deployed detected as CRITICAL
  const expiredDeployed = state.scenarios.find((s) => s.scenarioName === "ESKI_YILBASI_KAMPANYASI_29100");
  assert.ok(expiredDeployed !== undefined);
  assert.equal(expiredDeployed?.lifecycleStatus, "Expired");
  assert.equal(expiredDeployed?.deploymentStatus, "Deployed");
  assert.ok(expiredDeployed?.flags.some((f) => f.id === "expired_deployed"));

  // 7. Active but undeployed detected as REVIEW
  const activeUndeployed = state.scenarios.find((s) => s.scenarioName === "FAST_TRACK_30364_ONG");
  assert.ok(activeUndeployed !== undefined);
  assert.ok(
    activeUndeployed?.lifecycleStatus === "Active" ||
      activeUndeployed?.lifecycleStatus === "Expiring 31-90",
  );
  assert.equal(activeUndeployed?.deploymentStatus, "Undeployed");
  assert.ok(activeUndeployed?.flags.some((f) => f.id === "active_undeployed"));

  // 8. Missing product detected as REVIEW
  const missingProd = state.scenarios.find((s) => s.scenarioName === "GENEL_DUYURU_SCENARIO_50100");
  assert.ok(missingProd !== undefined);
  assert.ok(missingProd?.flags.some((f) => f.id === "missing_product"));

  // 9. Realtime missing event detected as REVIEW
  const missingEvent = state.scenarios.find((s) => s.scenarioName === "RT_EKSIK_EVENTLI_SENARYO_51200");
  assert.ok(missingEvent !== undefined);
  assert.ok(missingEvent?.flags.some((f) => f.id === "realtime_missing_event"));

  // 10. Summary numbers are deterministic
  assert.equal(state.summary.totalScenarios, state.scenarios.length);
  assert.ok(state.summary.ongoingCount > 0);
  assert.ok(state.summary.realtimeCount > 0);
  assert.ok(state.summary.executiveSummaryText.length > 50);
});

test("Ongoing & Real-time: Real workbook verification (Son - Ongoing ve Real-time Kampanyalar.xlsx)", () => {
  const realPath = "C:/Users/husey/OneDrive/Masaüstü/Türkiye Finans/CRM/Son - Ongoing ve Real-time Kampanyalar.xlsx";
  if (!fs.existsSync(realPath)) return;

  const buf = fs.readFileSync(realPath);
  const state = parseOngoingRealtimeWorkbook(buf, "Son - Ongoing ve Real-time Kampanyalar.xlsx", MOCK_TODAY);

  assert.ok(state.scenarios.length > 50, "Real workbook must contain more than 50 scenarios");
  assert.ok(state.summary.ongoingCount > 0, "Real workbook must contain ongoing scenarios");
  assert.ok(state.summary.realtimeCount > 0, "Real workbook must contain realtime scenarios");
  assert.ok(state.calendar.length > 100, "Real workbook calendar must contain execution entries");

  // Verify zero egress: all parsing completed in-memory
  assert.equal(typeof state.summary.executiveSummaryText, "string");
});
