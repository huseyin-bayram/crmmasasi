/**
 * Type definitions for the Ongoing & Real-time CRM Scenario Estate Workspace.
 * Zero Campaign Data Egress: strictly browser-side in-memory representation.
 */

export type ScenarioType = "Ongoing" | "Real-time" | "Onboarding" | "Burn" | "Bulk" | "Other";

export type DeploymentStatus = "Deployed" | "Undeployed" | "Missing";

export type LifecycleStatus =
  | "Active"
  | "Not Started"
  | "Expired"
  | "Expiring <= 30"
  | "Expiring 31-90"
  | "Long-running";

export type OngoingCadence =
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Passive Audience"
  | "Non-scheduled"
  | "Other";

export type GovernanceSeverity = "CRITICAL" | "REVIEW" | "PLANNING" | "INFO";

export interface GovernanceFlag {
  id: string;
  severity: GovernanceSeverity;
  rule: string;
  title: string;
  explanation: string;
}

export interface ScenarioRecord {
  id: string;
  scenarioType: ScenarioType;
  rawScenarioType: string;
  scenarioName: string;
  campaignName: string; // SCENARIO COVERAGE / CAMPAIGN NAME
  statusRaw: string;
  deploymentStatus: DeploymentStatus;
  
  // Dates
  startDateRaw: string;
  endDateRaw: string;
  startDate: Date | null;
  endDate: Date | null;
  startDateFormatted: string;
  endDateFormatted: string;
  hasInvalidDateOrder: boolean;
  hasMissingDates: boolean;

  // Lifecycle
  lifecycleStatus: LifecycleStatus;
  daysUntilExpiry: number | null;
  isExpiring30: boolean;
  isExpiring90: boolean;
  isLongRunning: boolean;

  // Targeting & Cadence
  segmentOrEvent: string; // SEGMENT / REAL-TIME EVENT
  normalizedSegmentOrEvent: string;
  periodRaw: string;
  cadence: OngoingCadence;
  executionTime: string;

  // Business metadata
  product: string;
  burnRaw: string;
  burnLinkedScenario: string | null;
  burnNote: string | null;
  businessUnit: string;
  description: string;

  // Enriched derived metadata
  detectedCampaignId: string | null;
  detectedVersion: string | null;

  // Dependencies
  upstreamScenarioName: string | null;
  downstreamScenarioNames: string[];
  siblingScenarioNames: string[];

  // Audience cluster
  sharedAudienceCluster: {
    segment: string;
    scenarioNames: string[];
    count: number;
  } | null;

  // Calendar executions (if calendar sheet present)
  calendarExecutions: CalendarExecution[];

  // Governance flags
  flags: GovernanceFlag[];
  criticalCount: number;
  reviewCount: number;
  planningCount: number;
  infoCount: number;
}

export interface CalendarExecution {
  date: Date | null;
  dateRaw: string;
  dateFormatted: string;
  scenarioName: string;
  timeRaw: string;
  hour: number | null; // 0-23
}

export interface ExpiryConcentration {
  dateFormatted: string;
  date: Date;
  count: number;
  percentage: number;
  scenarioNames: string[];
}

export interface SharedAudienceCluster {
  segment: string;
  scenarios: ScenarioRecord[];
  count: number;
}

export interface TriggerStat {
  trigger: string;
  count: number;
  percentage: number;
  scenarios: ScenarioRecord[];
  products: Record<string, number>;
  businessUnits: Record<string, number>;
}

export interface OngoingRealtimeSummary {
  totalScenarios: number;
  ongoingCount: number;
  realtimeCount: number;
  registryCount: number; // Onboarding, Burn, Bulk
  
  // Deployment health
  deployedCount: number;
  undeployedCount: number;
  missingStatusCount: number;
  
  // Matrix combinations
  activeAndDeployedCount: number;
  activeButUndeployedCount: number;
  expiredButDeployedCount: number; // CRITICAL zombie deployments
  notStartedCount: number;
  
  // Expiry
  expiring30Count: number;
  expiring90Count: number;
  expiryConcentration: ExpiryConcentration | null;

  // Calendar / Today
  todayExecutionsCount: number;

  // Governance
  criticalIssuesCount: number;
  reviewIssuesCount: number;
  planningIssuesCount: number;
  infoIssuesCount: number;

  // Deterministic summary text
  executiveSummaryText: string;
}

export interface OngoingRealtimeWorkbookState {
  fileName: string;
  loadedAt: Date;
  scenarios: ScenarioRecord[]; // Primary universe (Ongoing + Real-time)
  registry: Record<string, ScenarioRecord>; // All records for relationship lookup
  calendar: CalendarExecution[];
  summary: OngoingRealtimeSummary;
  availableProducts: string[];
  availableBusinessUnits: string[];
  availableSegments: string[];
  availableTriggers: string[];
  availablePeriods: string[];
}

export interface ScenarioFilterState {
  searchQuery: string;
  scenarioType: "ALL" | "Ongoing" | "Real-time";
  deploymentStatus: "ALL" | DeploymentStatus;
  lifecycleStatus: "ALL" | LifecycleStatus;
  product: string; // 'ALL' or specific
  businessUnit: string; // 'ALL' or specific
  period: string; // 'ALL' or specific
  triggerOrEvent: string; // 'ALL' or specific
  governanceSeverity: "ALL" | GovernanceSeverity;
  quickFilter:
    | "ALL"
    | "ACTIVE_DEPLOYED"
    | "ACTIVE_UNDEPLOYED"
    | "EXPIRED_DEPLOYED"
    | "EXPIRING_30"
    | "EXPIRING_90"
    | "TODAY_SCHEDULED"
    | "GOVERNANCE_CRITICAL"
    | "GOVERNANCE_REVIEW"
    | "SHARED_AUDIENCE"
    | "HAS_DEPENDENCY";
}

export type ActiveTab =
  | "overview"
  | "ongoing"
  | "realtime"
  | "control-center"
  | "all-scenarios";
