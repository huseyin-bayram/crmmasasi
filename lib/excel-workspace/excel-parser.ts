import * as XLSX from "xlsx";
import type {
  CampaignOperation,
  CampaignRequest,
  WorkspaceState,
  ColumnMappingConfig,
} from "./types";
import { normalizeChannel } from "./constants";
import { normalizeExcelDate, getTodayDateOnly } from "./date-normalizer";
import { autoMapHeaders, type MappingResult } from "./column-mapper";
import { evaluateDerivedStatus } from "./status-engine";
import { validateOperationRow, checkDuplicateKeys } from "./data-quality";

export interface ParseExcelOptions {
  fileName?: string;
  fileSize?: number;
  savedMappingConfig?: ColumnMappingConfig | null;
  manualMappingOverrides?: Record<string, string>;
  todayDate?: import("./types").DateOnly; // allows injecting date for tests
}

export type ParseExcelResult =
  | {
      ok: true;
      state: WorkspaceState;
      mappingResult: MappingResult;
    }
  | {
      ok: false;
      error: "EMPTY_FILE" | "NO_SHEET" | "UNMAPPED_COLUMNS" | "PARSE_ERROR";
      message: string;
      mappingResult?: MappingResult;
    };

/**
 * Parses an Excel ArrayBuffer client-side using SheetJS (XLSX).
 * Adheres strictly to Zero Campaign Data Egress (Section G & Amendment 7).
 */
export function parseExcelWorkbook(
  data: ArrayBuffer | Uint8Array,
  options: ParseExcelOptions = {},
): ParseExcelResult {
  try {
    const workbook = XLSX.read(data, {
      type: "array",
      cellDates: false,
      dense: true,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        ok: false,
        error: "NO_SHEET",
        message: "Excel dosyasında okunabilir çalışma sayfası bulunamadı.",
      };
    }

    // Smart sheet selection: prioritize campaign plan sheet, fallback to first sheet
    let targetSheetName = workbook.SheetNames[0];
    const preferredSheet = workbook.SheetNames.find((s) =>
      /kampanya[\s_-]*plan/i.test(s) || /kampanya/i.test(s),
    );
    if (preferredSheet) {
      targetSheetName = preferredSheet;
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      return {
        ok: false,
        error: "NO_SHEET",
        message: "Çalışma sayfası açılamadı.",
      };
    }

    // Convert to array of rows
    const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (rawMatrix.length < 2) {
      return {
        ok: false,
        error: "EMPTY_FILE",
        message: "Excel dosyasında veri satırı bulunamadı (yalnızca başlık veya boş).",
      };
    }

    const rawHeaders = (rawMatrix[0] as unknown[]).map((h) => String(h || "").trim());
    const mappingResult = autoMapHeaders(rawHeaders, options.savedMappingConfig);

    // Apply any manual overrides from the UI
    if (options.manualMappingOverrides) {
      Object.assign(mappingResult.mappings, options.manualMappingOverrides);
      mappingResult.unmappedRequired = mappingResult.unmappedRequired.filter(
        (req) => !mappingResult.mappings[req],
      );
      mappingResult.isComplete = mappingResult.unmappedRequired.length === 0;
    }

    if (!mappingResult.isComplete) {
      return {
        ok: false,
        error: "UNMAPPED_COLUMNS",
        message: `Zorunlu alanlar eşleştirilemedi: ${mappingResult.unmappedRequired.join(", ")}`,
        mappingResult,
      };
    }

    const colMap = mappingResult.mappings;

    function getVal(row: unknown[], field: string): string {
      const headerName = colMap[field];
      if (!headerName) return "";
      const colIndex = rawHeaders.indexOf(headerName);
      if (colIndex === -1) return "";
      const cellVal = row[colIndex];
      return cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : "";
    }

    function getRaw(row: unknown[], field: string): unknown {
      const headerName = colMap[field];
      if (!headerName) return undefined;
      const colIndex = rawHeaders.indexOf(headerName);
      if (colIndex === -1) return undefined;
      return row[colIndex];
    }

    const operations: CampaignOperation[] = [];

    // Parse each data row
    for (let i = 1; i < rawMatrix.length; i++) {
      const row = rawMatrix[i] as unknown[];
      const excelRowIndex = i + 1; // 1-indexed (Excel row number)

      // Skip completely empty rows
      const hasAnyContent = row.some((c) => c !== "" && c !== null && c !== undefined);
      if (!hasAnyContent) continue;

      const cmsCode = getVal(row, "cmsCode");
      const campaignName = getVal(row, "campaignName");
      const rawChannel = getVal(row, "channel");
      const channel = normalizeChannel(rawChannel);

      const startDate = normalizeExcelDate(getRaw(row, "startDate"));
      const endDate = normalizeExcelDate(getRaw(row, "endDate"));

      const content = getVal(row, "content");
      const targetAudience = getVal(row, "targetAudience");
      const requestingUnit = getVal(row, "requestingUnit");
      const requester = getVal(row, "requester");
      const owner = getVal(row, "owner");
      const sourceStatus = getVal(row, "sourceStatus");
      const note = getVal(row, "note");
      const pegaStatus = getVal(row, "pegaStatus");
      const campaignPurpose = getVal(row, "campaignPurpose");
      const campaignProduct = getVal(row, "campaignProduct");
      const cardCampaignCode = getVal(row, "cardCampaignCode");
      const advantagePackageNo = getVal(row, "advantagePackageNo");

      // Amendment 1: Separate rowId (technical) from businessKey (operational)
      const rowId = `row-${excelRowIndex}`;
      const safeCms = cmsCode || "UNKNOWN";
      const businessKey = `${safeCms}::${channel}`;

      const preOp = {
        rowId,
        businessKey,
        cmsCode,
        campaignName,
        channel,
        rawChannel,
        startDate,
        endDate,
        content,
        targetAudience,
        requestingUnit,
        requester,
        owner,
        sourceStatus,
        note,
        pegaStatus,
        campaignPurpose,
        campaignProduct,
        cardCampaignCode,
        advantagePackageNo,
        excelRowIndex,
      };

      const qualityIssues = validateOperationRow(preOp);
      const hasCriticalIssue = qualityIssues.some((issue) => issue.severity === "error");

      const statusExplanation = evaluateDerivedStatus({
        sourceStatus,
        startDate,
        note,
        pegaStatus,
        hasCriticalIssue,
        today: options.todayDate,
      });

      operations.push({
        ...preOp,
        derivedStatus: statusExplanation.status,
        statusExplanation,
        qualityIssues,
      });
    }

    // Check for duplicate business keys (Amendment 1 - preserves all rows, attaches quality issue)
    checkDuplicateKeys(operations);

    // Aggregate into CampaignRequests grouped by CMS Code (Amendment 2)
    const requestsMap = new Map<string, CampaignRequest>();

    for (const op of operations) {
      const cms = op.cmsCode.trim() || `UNKNOWN-${op.rowId}`;
      let req = requestsMap.get(cms);

      if (!req) {
        req = {
          cmsCode: op.cmsCode || "Belirtilmemiş",
          campaignName: op.campaignName || "Belirtilmemiş",
          operations: [],
          channelCount: 0,
          requestingUnits: [],
          requesters: [],
          owners: [],
          hasBlocker: false,
          hasDelay: false,
          isAllCompleted: true,
        };
        requestsMap.set(cms, req);
      }

      req.operations.push(op);
      req.channelCount = req.operations.length;

      if (op.requestingUnit && !req.requestingUnits.includes(op.requestingUnit)) {
        req.requestingUnits.push(op.requestingUnit);
      }
      if (op.requester && !req.requesters.includes(op.requester)) {
        req.requesters.push(op.requester);
      }
      if (op.owner && !req.owners.includes(op.owner)) {
        req.owners.push(op.owner);
      }

      if (op.derivedStatus === "blocked") req.hasBlocker = true;
      if (op.derivedStatus === "delayed") req.hasDelay = true;
      if (op.derivedStatus !== "completed" && op.derivedStatus !== "cancelled") {
        req.isAllCompleted = false;
      }
    }

    // Extract unique lookup arrays for filtering
    const availableOwners = Array.from(
      new Set(operations.map((o) => o.owner).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "tr"));

    const availableChannels = Array.from(
      new Set(operations.map((o) => o.channel)),
    ).sort((a, b) => a.localeCompare(b, "tr"));

    const availableUnits = Array.from(
      new Set(operations.map((o) => o.requestingUnit).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "tr"));

    // Collect all quality issues across operations
    const allQualityIssues = operations.flatMap((o) => o.qualityIssues);

    const state: WorkspaceState = {
      fileName: options.fileName || "Kampanya_Plani.xlsx",
      fileSize: options.fileSize || 0,
      loadedAt: new Date(),
      schemaFingerprint: mappingResult.schemaFingerprint,
      totalRowCount: rawMatrix.length - 1,
      validRowCount: operations.length,
      operations,
      requests: requestsMap,
      availableOwners,
      availableChannels,
      availableUnits,
      qualityIssues: allQualityIssues,
    };

    return {
      ok: true,
      state,
      mappingResult,
    };
  } catch (err) {
    return {
      ok: false,
      error: "PARSE_ERROR",
      message: err instanceof Error ? err.message : "Excel dosyası çözümlenemedi.",
    };
  }
}
