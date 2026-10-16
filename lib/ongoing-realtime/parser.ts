import * as XLSX from "xlsx";
import {
  CalendarExecution,
  OngoingRealtimeSummary,
  OngoingRealtimeWorkbookState,
  ScenarioRecord,
} from "./types";
import {
  extractExecutionHour,
  formatTurkishDate,
  parseExcelDate,
  toUtcMidnight,
} from "./date-utils";
import {
  detectExpiryConcentration,
  evaluateLifecycle,
  normalizeCadence,
  normalizeDeploymentStatus,
  normalizeScenarioType,
} from "./lifecycle";
import { enrichScenarioMetadata } from "./enrichment";
import {
  parseBurnField,
  parseFeederSyntax,
  resolveDependencyGraph,
} from "./dependencies";
import { evaluateGovernanceRules } from "./governance";

/**
 * Normalizes header string to clean lookup key.
 */
function cleanHeader(header: unknown): string {
  if (typeof header !== "string") return "";
  return header.replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Maps row object values by fuzzy header match.
 */
function extractRowFields(row: Record<string, unknown>, headers: string[]) {
  const getVal = (candidates: string[]): string => {
    for (const cand of candidates) {
      for (const h of headers) {
        if (cleanHeader(h) === cand.toUpperCase()) {
          const val = row[h];
          if (val !== undefined && val !== null) return String(val).trim();
        }
      }
    }
    return "";
  };

  const getRawVal = (candidates: string[]): unknown => {
    for (const cand of candidates) {
      for (const h of headers) {
        if (cleanHeader(h) === cand.toUpperCase()) {
          const val = row[h];
          if (val !== undefined && val !== null) return val;
        }
      }
    }
    return undefined;
  };

  return {
    rawScenarioType: getVal(["SCENARIO TYPE", "SENARYO TIPI", "SENARYO TÜRÜ", "TYPE"]),
    scenarioName: getVal(["SCENARIO NAME", "SENARYO ADI", "SCENARIONAME", "NAME"]),
    statusRaw: getVal(["STATUS", "STATÜ", "STATU", "DURUM"]),
    campaignName: getVal([
      "SCENARIO COVERAGE / CAMPAIGN NAME",
      "SCENARIO COVERAGE",
      "CAMPAIGN NAME",
      "KAMPANYA ADI",
      "COVERAGE",
    ]),
    startDateRaw: getRawVal(["START DATE", "BAŞLANGIÇ TARIHI", "BASLANGIC TARIHI", "START"]),
    endDateRaw: getRawVal(["END DATE", "BITIŞ TARIHI", "BITIS TARIHI", "END"]),
    segmentOrEvent: getVal([
      "SEGMENT / REAL-TIME EVENT",
      "SEGMENT",
      "REAL-TIME EVENT",
      "REALTIME EVENT",
      "EVENT",
      "HEDEF KITLE",
    ]),
    periodRaw: getVal(["PERIOD", "PERIYOT", "FREKANS", "CADENCE"]),
    executionTime: getVal(["EXECUTION TIME", "ÇALIŞMA ZAMANI", "CALISMA ZAMANI", "SAAT"]),
    product: getVal(["PRODUCT", "ÜRÜN", "URUN"]),
    burnRaw: getVal(["BURN", "BURN SENARYOSU", "BURN SCENARIO"]),
    businessUnit: getVal(["İŞ BIRIMI", "IS BIRIMI", "BUSINESS UNIT", "BU", "BIRIM"]),
    description: getVal(["AÇIKLAMA", "ACIKLAMA", "DESCRIPTION", "NOT", "NOTES"]),
  };
}

/**
 * 100% Client-Side Workbook Parser.
 * Privacy Guarantee: zero bytes leaving the browser memory.
 */
export function parseOngoingRealtimeWorkbook(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
  today: Date = new Date(),
): OngoingRealtimeWorkbookState {
  const wb = XLSX.read(data, { type: "array", cellDates: false });

  // Locate sheets case-insensitively
  const findSheet = (target: string) => {
    const name = wb.SheetNames.find((s) => s.trim().toUpperCase() === target.toUpperCase());
    return name ? wb.Sheets[name] : null;
  };

  const scenarioSheet = findSheet("SCENARIOS") || wb.Sheets[wb.SheetNames[0]];
  if (!scenarioSheet) {
    throw new Error("Workbook içinde SCENARIOS çalışma sayfası bulunamadı.");
  }

  // Parse SCENARIOS rows
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(scenarioSheet, {
    raw: true,
    defval: "",
  });

  const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

  // Parse CALENDAR rows if available
  const calendarSheet = findSheet("CALENDAR");
  const calendarExecutions: CalendarExecution[] = [];

  if (calendarSheet) {
    const calRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(calendarSheet, {
      raw: true,
      defval: "",
    });
    const calHeaders = calRows.length > 0 ? Object.keys(calRows[0]) : [];

    for (const r of calRows) {
      const getCalVal = (candidates: string[]) => {
        for (const cand of candidates) {
          for (const h of calHeaders) {
            if (cleanHeader(h) === cand.toUpperCase()) {
              return r[h];
            }
          }
        }
        return undefined;
      };

      const dateRaw = getCalVal(["TARIH", "DATE", "EXECUTION DATE"]);
      const scName = String(getCalVal(["SCENARIO NAME", "SENARYO ADI", "NAME"]) || "").trim();
      const timeRaw = String(getCalVal(["TETIKLENME SAATI / TIPI", "TIME", "SAAT", "TETIKLENME"]) || "").trim();

      if (scName) {
        const parsedDate = parseExcelDate(dateRaw);
        calendarExecutions.push({
          date: parsedDate,
          dateRaw: String(dateRaw ?? ""),
          dateFormatted: formatTurkishDate(parsedDate),
          scenarioName: scName,
          timeRaw,
          hour: extractExecutionHour(timeRaw),
        });
      }
    }
  }

  // Step 1: Preliminary record extraction
  const preliminaryRecords: Array<{
    id: string;
    scenarioType: ScenarioRecord["scenarioType"];
    rawScenarioType: string;
    scenarioName: string;
    campaignName: string;
    statusRaw: string;
    deploymentStatus: ScenarioRecord["deploymentStatus"];
    startDateRaw: string;
    endDateRaw: string;
    startDate: Date | null;
    endDate: Date | null;
    startDateFormatted: string;
    endDateFormatted: string;
    hasInvalidDateOrder: boolean;
    hasMissingDates: boolean;
    lifecycleStatus: ScenarioRecord["lifecycleStatus"];
    daysUntilExpiry: number | null;
    isExpiring30: boolean;
    isExpiring90: boolean;
    isLongRunning: boolean;
    segmentOrEvent: string;
    normalizedSegmentOrEvent: string;
    periodRaw: string;
    cadence: ScenarioRecord["cadence"];
    executionTime: string;
    product: string;
    burnRaw: string;
    burnLinkedScenario: string | null;
    burnNote: string | null;
    businessUnit: string;
    description: string;
    detectedCampaignId: string | null;
    detectedVersion: string | null;
    upstreamScenarioName: string | null;
  }> = [];

  const nameCounts: Record<string, number> = {};

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const fields = extractRowFields(raw, headers);

    // Skip empty filler rows
    if (!fields.scenarioName && !fields.rawScenarioType && !fields.campaignName) {
      continue;
    }

    const { type: scenarioType, normalized: normalizedType } = normalizeScenarioType(
      fields.rawScenarioType,
    );
    const deploymentStatus = normalizeDeploymentStatus(fields.statusRaw);
    const startDate = parseExcelDate(fields.startDateRaw);
    const endDate = parseExcelDate(fields.endDateRaw);

    const lifecycle = evaluateLifecycle(startDate, endDate, today);
    const cadence = normalizeCadence(fields.periodRaw);
    const enrichment = enrichScenarioMetadata(fields.scenarioName, fields.campaignName);
    const burnInfo = parseBurnField(fields.burnRaw);

    // Upstream dependency check: look in description, segment, or burn
    const feederFromDesc = parseFeederSyntax(fields.description);
    const feederFromSeg = parseFeederSyntax(fields.segmentOrEvent);
    const upstreamScenarioName =
      feederFromDesc.upstreamScenarioName || feederFromSeg.upstreamScenarioName || null;

    if (fields.scenarioName) {
      nameCounts[fields.scenarioName] = (nameCounts[fields.scenarioName] || 0) + 1;
    }

    preliminaryRecords.push({
      id: `sc-${i + 1}-${fields.scenarioName || "noname"}`,
      scenarioType,
      rawScenarioType: fields.rawScenarioType || normalizedType,
      scenarioName: fields.scenarioName || `Adsız Senaryo #${i + 1}`,
      campaignName: fields.campaignName || fields.scenarioName || "Tanımsız Kampanya",
      statusRaw: fields.statusRaw,
      deploymentStatus,
      startDateRaw: String(fields.startDateRaw ?? ""),
      endDateRaw: String(fields.endDateRaw ?? ""),
      startDate,
      endDate,
      startDateFormatted: formatTurkishDate(startDate),
      endDateFormatted: formatTurkishDate(endDate),
      hasInvalidDateOrder: lifecycle.hasInvalidDateOrder,
      hasMissingDates: lifecycle.hasMissingDates,
      lifecycleStatus: lifecycle.status,
      daysUntilExpiry: lifecycle.daysUntilExpiry,
      isExpiring30: lifecycle.isExpiring30,
      isExpiring90: lifecycle.isExpiring90,
      isLongRunning: lifecycle.isLongRunning,
      segmentOrEvent: fields.segmentOrEvent,
      normalizedSegmentOrEvent: fields.segmentOrEvent.trim(),
      periodRaw: fields.periodRaw,
      cadence,
      executionTime: fields.executionTime,
      product: fields.product,
      burnRaw: fields.burnRaw,
      burnLinkedScenario: burnInfo.burnLinkedScenario,
      burnNote: burnInfo.burnNote,
      businessUnit: fields.businessUnit,
      description: fields.description,
      detectedCampaignId: enrichment.detectedCampaignId,
      detectedVersion: enrichment.detectedVersion,
      upstreamScenarioName,
    });
  }

  // Detect duplicate names
  const duplicateNames = new Set(
    Object.keys(nameCounts).filter((name) => nameCounts[name] > 1),
  );

  // Step 2: Build dependency graph
  const { downstreamMap, siblingMap } = resolveDependencyGraph(
    preliminaryRecords.map((r) => ({
      scenarioName: r.scenarioName,
      upstreamScenarioName: r.upstreamScenarioName,
    })),
  );

  // Step 3: Build shared audience clusters
  const audienceClusters: Record<string, string[]> = {};
  for (const r of preliminaryRecords) {
    const seg = r.normalizedSegmentOrEvent;
    if (seg && seg !== "-" && seg !== "Other") {
      if (!audienceClusters[seg]) audienceClusters[seg] = [];
      if (!audienceClusters[seg].includes(r.scenarioName)) {
        audienceClusters[seg].push(r.scenarioName);
      }
    }
  }

  // Expiry concentration check
  const expiryConcentration = detectExpiryConcentration(preliminaryRecords);

  // Step 4: Map calendar executions per scenario
  const calByScenario: Record<string, CalendarExecution[]> = {};
  for (const cal of calendarExecutions) {
    if (!calByScenario[cal.scenarioName]) {
      calByScenario[cal.scenarioName] = [];
    }
    calByScenario[cal.scenarioName].push(cal);
  }

  // Step 5: Full record creation & governance flag evaluation
  const allScenarioNames = new Set(preliminaryRecords.map((r) => r.scenarioName));
  const fullRecords: ScenarioRecord[] = [];
  const registry: Record<string, ScenarioRecord> = {};

  for (const pre of preliminaryRecords) {
    const sharedNames = audienceClusters[pre.normalizedSegmentOrEvent] || [];
    const sharedAudienceCluster =
      sharedNames.length > 1
        ? {
            segment: pre.normalizedSegmentOrEvent,
            scenarioNames: sharedNames,
            count: sharedNames.length,
          }
        : null;

    const downstream = downstreamMap[pre.scenarioName] || [];
    const siblings = siblingMap[pre.scenarioName] || [];
    const calList = calByScenario[pre.scenarioName] || [];

    const baseRecord = {
      ...pre,
      downstreamScenarioNames: downstream,
      siblingScenarioNames: siblings,
      sharedAudienceCluster,
      calendarExecutions: calList,
    };

    const flags = evaluateGovernanceRules(
      baseRecord,
      allScenarioNames,
      duplicateNames,
      expiryConcentration,
    );

    const criticalCount = flags.filter((f) => f.severity === "CRITICAL").length;
    const reviewCount = flags.filter((f) => f.severity === "REVIEW").length;
    const planningCount = flags.filter((f) => f.severity === "PLANNING").length;
    const infoCount = flags.filter((f) => f.severity === "INFO").length;

    const fullRecord: ScenarioRecord = {
      ...baseRecord,
      flags,
      criticalCount,
      reviewCount,
      planningCount,
      infoCount,
    };

    registry[fullRecord.scenarioName] = fullRecord;
    fullRecords.push(fullRecord);
  }

  // Primary universe: Ongoing or Real-time
  const primaryUniverse = fullRecords.filter(
    (r) => r.scenarioType === "Ongoing" || r.scenarioType === "Real-time",
  );

  // Step 6: Summary and KPI aggregation
  const ongoingCount = primaryUniverse.filter((r) => r.scenarioType === "Ongoing").length;
  const realtimeCount = primaryUniverse.filter((r) => r.scenarioType === "Real-time").length;
  const deployedCount = primaryUniverse.filter((r) => r.deploymentStatus === "Deployed").length;
  const undeployedCount = primaryUniverse.filter((r) => r.deploymentStatus === "Undeployed").length;
  const missingStatusCount = primaryUniverse.filter((r) => r.deploymentStatus === "Missing").length;

  const isTimelineActive = (r: ScenarioRecord) =>
    r.lifecycleStatus === "Active" ||
    r.lifecycleStatus === "Expiring <= 30" ||
    r.lifecycleStatus === "Expiring 31-90" ||
    r.lifecycleStatus === "Long-running";

  const activeAndDeployedCount = primaryUniverse.filter(
    (r) => isTimelineActive(r) && r.deploymentStatus === "Deployed",
  ).length;

  const activeButUndeployedCount = primaryUniverse.filter(
    (r) => isTimelineActive(r) && r.deploymentStatus === "Undeployed",
  ).length;

  const expiredButDeployedCount = primaryUniverse.filter(
    (r) => r.lifecycleStatus === "Expired" && r.deploymentStatus === "Deployed",
  ).length;

  const notStartedCount = primaryUniverse.filter(
    (r) => r.lifecycleStatus === "Not Started",
  ).length;

  const expiring30Count = primaryUniverse.filter((r) => r.isExpiring30).length;
  const expiring90Count = primaryUniverse.filter((r) => r.isExpiring90).length;

  // Today scheduled count: calendar sheet or daily cadence
  let todayExecutionsCount = 0;
  const todayUtc = toUtcMidnight(today);

  if (calendarExecutions.length > 0) {
    const todayCal = calendarExecutions.filter(
      (c) => c.date && toUtcMidnight(c.date).getTime() === todayUtc.getTime(),
    );
    todayExecutionsCount = todayCal.length > 0 ? todayCal.length : calendarExecutions.length;
  } else {
    todayExecutionsCount = primaryUniverse.filter(
      (r) => r.scenarioType === "Ongoing" && r.cadence === "Daily" && r.deploymentStatus === "Deployed",
    ).length;
  }

  // Issues count across primary universe
  let criticalIssuesCount = 0;
  let reviewIssuesCount = 0;
  let planningIssuesCount = 0;
  let infoIssuesCount = 0;

  for (const r of primaryUniverse) {
    criticalIssuesCount += r.criticalCount;
    reviewIssuesCount += r.reviewCount;
    planningIssuesCount += r.planningCount;
    infoIssuesCount += r.infoCount;
  }

  // Deterministic executive summary text
  const parts: string[] = [];
  parts.push(
    `Portföyde ${primaryUniverse.length} adet senaryo tespit edildi (${ongoingCount} Ongoing, ${realtimeCount} Real-time).`,
  );

  if (activeAndDeployedCount > 0) {
    parts.push(`${activeAndDeployedCount} senaryo aktif takvimde ve canlı (Deployed) durumda.`);
  }

  if (activeButUndeployedCount > 0) {
    parts.push(
      `${activeButUndeployedCount} aktif tarihli senaryo Undeployed durumda (operasyonel teyit önerilir).`,
    );
  }

  if (expiredButDeployedCount > 0) {
    parts.push(
      `DİKKAT: ${expiredButDeployedCount} senaryo resmi bitiş tarihi geçmiş olmasına rağmen Deployed olarak görünüyor.`,
    );
  }

  if (expiryConcentration) {
    parts.push(
      `Aktif senaryoların %${expiryConcentration.percentage}'i (${expiryConcentration.count} senaryo) ${expiryConcentration.dateFormatted} tarihinde aynı anda sona eriyor (yenileme planlaması gerekli).`,
    );
  } else if (expiring30Count > 0) {
    parts.push(`${expiring30Count} senaryo 30 gün içinde sona erecek.`);
  }

  const executiveSummaryText = parts.join(" ");

  const summary: OngoingRealtimeSummary = {
    totalScenarios: primaryUniverse.length,
    ongoingCount,
    realtimeCount,
    registryCount: fullRecords.length - primaryUniverse.length,
    deployedCount,
    undeployedCount,
    missingStatusCount,
    activeAndDeployedCount,
    activeButUndeployedCount,
    expiredButDeployedCount,
    notStartedCount,
    expiring30Count,
    expiring90Count,
    expiryConcentration,
    todayExecutionsCount,
    criticalIssuesCount,
    reviewIssuesCount,
    planningIssuesCount,
    infoIssuesCount,
    executiveSummaryText,
  };

  // Distinct filter options
  const unique = (arr: (string | undefined)[]) =>
    Array.from(new Set(arr.filter(Boolean) as string[])).sort();

  return {
    fileName,
    loadedAt: new Date(),
    scenarios: primaryUniverse,
    registry,
    calendar: calendarExecutions,
    summary,
    availableProducts: unique(primaryUniverse.map((s) => s.product)),
    availableBusinessUnits: unique(primaryUniverse.map((s) => s.businessUnit)),
    availableSegments: unique(
      primaryUniverse.filter((s) => s.scenarioType === "Ongoing").map((s) => s.segmentOrEvent),
    ),
    availableTriggers: unique(
      primaryUniverse.filter((s) => s.scenarioType === "Real-time").map((s) => s.segmentOrEvent),
    ),
    availablePeriods: unique(primaryUniverse.map((s) => s.periodRaw)),
  };
}
