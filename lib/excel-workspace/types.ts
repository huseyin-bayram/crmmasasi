/**
 * Core type definitions for CRM Tools Excel Workspace.
 * Adheres strictly to Zero Campaign Data Egress and Architecture Specification v1.1.0.
 */

export interface RawExcelRow {
  [columnName: string]: string | number | Date | null | undefined;
}

export type CampaignChannel =
  | "SMS"
  | "PUSH"
  | "E-posta"
  | "Mobil Bildirim"
  | "Şube"
  | "ATM"
  | "Çağrı Merkezi"
  | "Web Pop-up"
  | "İnternet"
  | "IVN"
  | "Diğer";

/**
 * Calendar-only date representation without time or timezone offset.
 * Prevents UTC conversion shifts (e.g. 1 June shifting to 31 May 21:00 UTC).
 */
export interface DateOnly {
  year: number;
  month: number; // 1 - 12
  day: number;   // 1 - 31
  isoString: string; // "YYYY-MM-DD"
}

export type SourceStatus = string;

export type DerivedStatus =
  | "completed"       // Tamamlandı
  | "cancelled"       // İptal
  | "action_today"    // Bugün Aksiyon
  | "delayed"         // Gecikmiş
  | "upcoming"        // Yaklaşan
  | "blocked"         // Blokeli
  | "review_required";// Kontrol Gerekli (Veri kalitesi problemi)

export interface StatusExplanation {
  status: DerivedStatus;
  label: string;
  reason: string;
  badgeTone: "success" | "warning" | "danger" | "info" | "neutral";
}

export interface DataQualityIssue {
  rowId: string;
  excelRowNumber: number;
  cmsCode?: string;
  channel?: string;
  field: string;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

/**
 * Normalized single operational row.
 * Amendment 1: rowId (technical unique) is separated from businessKey (operational unique).
 */
export interface CampaignOperation {
  /** Technical unique row identity (e.g. "row-14"). Guarantees duplicate Excel rows are never overwritten. */
  rowId: string;

  /** Operational business key: `${cmsCode}::${normalizedChannel}` */
  businessKey: string;

  cmsCode: string;
  campaignName: string;
  channel: CampaignChannel;
  rawChannel: string;

  /** Pure calendar dates (time & timezone immune) */
  startDate: DateOnly | null;
  endDate: DateOnly | null;

  content: string;
  targetAudience: string;
  requestingUnit: string;
  requester: string;
  owner: string; // Sorumlu
  sourceStatus: SourceStatus;
  note: string;

  /** Additional campaign fields present in operational campaign files */
  pegaStatus: string;
  campaignPurpose: string;
  campaignProduct: string;
  cardCampaignCode: string;
  advantagePackageNo: string;

  /** Derived operational status */
  derivedStatus: DerivedStatus;
  statusExplanation: StatusExplanation;
  qualityIssues: DataQualityIssue[];

  /** Original 1-indexed row number in Excel */
  excelRowIndex: number;
}

/**
 * Aggregated campaign request grouped by PEGA CMS Code.
 * Amendment 2: Aggregates arrays for requestingUnits, requesters, and owners
 * without assuming values from the first channel apply to all channels.
 */
export interface CampaignRequest {
  cmsCode: string;
  campaignName: string;
  operations: CampaignOperation[];
  channelCount: number;

  requestingUnits: string[];
  requesters: string[];
  owners: string[];

  hasBlocker: boolean;
  hasDelay: boolean;
  isAllCompleted: boolean;
}

export interface ColumnMappingConfig {
  schemaFingerprint: string;
  mappings: {
    cmsCode: string;
    campaignName: string;
    channel: string;
    startDate: string;
    endDate?: string;
    content?: string;
    targetAudience?: string;
    requestingUnit?: string;
    requester?: string;
    owner: string;
    sourceStatus?: string;
    note?: string;
    pegaStatus?: string;
    campaignPurpose?: string;
    campaignProduct?: string;
    cardCampaignCode?: string;
    advantagePackageNo?: string;
  };
}

export interface WorkspaceState {
  fileName: string | null;
  fileSize: number | null;
  loadedAt: Date | null;
  schemaFingerprint: string | null;
  totalRowCount: number;
  validRowCount: number;
  operations: CampaignOperation[];
  requests: Map<string, CampaignRequest>;
  availableOwners: string[];
  availableChannels: string[];
  availableUnits: string[];
  qualityIssues: DataQualityIssue[];
}
