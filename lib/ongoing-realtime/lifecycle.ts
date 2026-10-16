import {
  DeploymentStatus,
  LifecycleStatus,
  OngoingCadence,
  ScenarioType,
  ExpiryConcentration,
} from "./types";
import {
  formatTurkishDate,
  getDaysDifference,
  toUtcMidnight,
} from "./date-utils";

/**
 * Normalizes scenario type from raw string.
 */
export function normalizeScenarioType(raw: string): {
  type: ScenarioType;
  normalized: string;
} {
  const trimmed = (raw || "").trim();
  const lower = trimmed.toLowerCase();

  if (lower === "ongoing" || lower === "on-going" || lower.startsWith("ong")) {
    return { type: "Ongoing", normalized: "Ongoing" };
  }
  if (
    lower === "real-time" ||
    lower === "realtime" ||
    lower === "real time" ||
    lower.startsWith("real")
  ) {
    return { type: "Real-time", normalized: "Real-time" };
  }
  if (lower === "onboarding" || lower.startsWith("onb")) {
    return { type: "Onboarding", normalized: "Onboarding" };
  }
  if (lower === "burn") {
    return { type: "Burn", normalized: "Burn" };
  }
  if (lower === "bulk") {
    return { type: "Bulk", normalized: "Bulk" };
  }

  return { type: "Other", normalized: trimmed || "Bilinmiyor" };
}

/**
 * Normalizes deployment status from raw string.
 */
export function normalizeDeploymentStatus(raw: string): DeploymentStatus {
  const trimmed = (raw || "").trim().toLowerCase();
  if (!trimmed || trimmed === "-" || trimmed === "null" || trimmed === "undefined") {
    return "Missing";
  }

  // Deployed terms
  if (
    trimmed === "deployed" ||
    trimmed === "aktif" ||
    trimmed === "yayında" ||
    trimmed === "live" ||
    trimmed === "prod" ||
    trimmed === "production"
  ) {
    return "Deployed";
  }

  // Undeployed terms
  if (
    trimmed === "undeployed" ||
    trimmed === "pasif" ||
    trimmed === "durduruldu" ||
    trimmed === "draft" ||
    trimmed === "taslak" ||
    trimmed === "test" ||
    trimmed === "geliştirme"
  ) {
    return "Undeployed";
  }

  return "Missing";
}

/**
 * Normalizes Period to Ongoing Cadence.
 */
export function normalizeCadence(periodRaw: string): OngoingCadence {
  const trimmed = (periodRaw || "").trim().toLowerCase();
  if (trimmed.includes("daily") || trimmed.includes("günlük") || trimmed.includes("gunluk")) {
    return "Daily";
  }
  if (trimmed.includes("weekly") || trimmed.includes("haftalık") || trimmed.includes("haftalik")) {
    return "Weekly";
  }
  if (trimmed.includes("monthly") || trimmed.includes("aylık") || trimmed.includes("aylik")) {
    return "Monthly";
  }
  if (trimmed.includes("passive") || trimmed.includes("pasif")) {
    return "Passive Audience";
  }
  if (trimmed.includes("non-scheduled") || trimmed.includes("plansız") || trimmed === "-") {
    return "Non-scheduled";
  }
  return "Other";
}

/**
 * Calculates deterministic lifecycle state given start date, end date, and today.
 */
export function evaluateLifecycle(
  startDate: Date | null,
  endDate: Date | null,
  today: Date = new Date(),
): {
  status: LifecycleStatus;
  daysUntilExpiry: number | null;
  isExpiring30: boolean;
  isExpiring90: boolean;
  isLongRunning: boolean;
  hasInvalidDateOrder: boolean;
  hasMissingDates: boolean;
} {
  const todayUtc = toUtcMidnight(today);
  const startUtc = startDate ? toUtcMidnight(startDate) : null;
  const endUtc = endDate ? toUtcMidnight(endDate) : null;

  const hasMissingDates = !startUtc || !endUtc;
  const hasInvalidDateOrder = Boolean(startUtc && endUtc && endUtc.getTime() < startUtc.getTime());

  // Check long running
  const isLongRunning = Boolean(
    endUtc &&
      (endUtc.getUTCFullYear() >= 2030 ||
        (startUtc && getDaysDifference(startUtc, endUtc) > 365 * 3)),
  );

  if (!startUtc || !endUtc || hasInvalidDateOrder) {
    return {
      status: "Not Started",
      daysUntilExpiry: null,
      isExpiring30: false,
      isExpiring90: false,
      isLongRunning,
      hasInvalidDateOrder,
      hasMissingDates,
    };
  }

  const daysUntilExpiry = getDaysDifference(todayUtc, endUtc);
  const isExpiring30 = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  const isExpiring90 = daysUntilExpiry >= 0 && daysUntilExpiry <= 90;

  let status: LifecycleStatus;
  if (daysUntilExpiry < 0) {
    status = "Expired";
  } else if (todayUtc.getTime() < startUtc.getTime()) {
    status = "Not Started";
  } else if (isExpiring30) {
    status = "Expiring <= 30";
  } else if (isExpiring90) {
    status = "Expiring 31-90";
  } else if (isLongRunning) {
    status = "Long-running";
  } else {
    status = "Active";
  }

  return {
    status,
    daysUntilExpiry,
    isExpiring30,
    isExpiring90,
    isLongRunning,
    hasInvalidDateOrder,
    hasMissingDates,
  };
}

/**
 * Detects whether a large concentration of active scenarios share the exact same end date.
 */
export function detectExpiryConcentration(
  scenarios: Array<{
    endDate: Date | null;
    endDateFormatted: string;
    scenarioName: string;
    lifecycleStatus: LifecycleStatus;
  }>,
  minShare = 0.15,
): ExpiryConcentration | null {
  const activeScenarios = scenarios.filter(
    (s) => s.endDate && s.lifecycleStatus !== "Expired",
  );
  if (activeScenarios.length < 5) return null;

  const countsByDate: Record<
    string,
    { date: Date; count: number; scenarioNames: string[] }
  > = {};

  for (const s of activeScenarios) {
    if (!s.endDate) continue;
    const key = s.endDateFormatted;
    if (!countsByDate[key]) {
      countsByDate[key] = { date: s.endDate, count: 0, scenarioNames: [] };
    }
    countsByDate[key].count++;
    countsByDate[key].scenarioNames.push(s.scenarioName);
  }

  let largestCluster: {
    dateFormatted: string;
    date: Date;
    count: number;
    scenarioNames: string[];
  } | null = null;

  for (const [key, item] of Object.entries(countsByDate)) {
    if (!largestCluster || item.count > largestCluster.count) {
      largestCluster = {
        dateFormatted: key,
        date: item.date,
        count: item.count,
        scenarioNames: item.scenarioNames,
      };
    }
  }

  if (largestCluster) {
    const percentage = Math.round(
      (largestCluster.count / activeScenarios.length) * 100,
    );
    if (percentage >= minShare * 100 && largestCluster.count >= 4) {
      return {
        dateFormatted: largestCluster.dateFormatted,
        date: largestCluster.date,
        count: largestCluster.count,
        percentage,
        scenarioNames: largestCluster.scenarioNames,
      };
    }
  }

  return null;
}
