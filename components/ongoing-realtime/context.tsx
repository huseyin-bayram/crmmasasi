"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import {
  ActiveTab,
  OngoingRealtimeWorkbookState,
  ScenarioFilterState,
  ScenarioRecord,
} from "@/lib/ongoing-realtime/types";
import { parseOngoingRealtimeWorkbook } from "@/lib/ongoing-realtime/parser";
import { generateSampleOngoingRealtimeWorkbook } from "@/lib/ongoing-realtime/sample-data";

interface OngoingRealtimeContextValue {
  workbookState: OngoingRealtimeWorkbookState | null;
  isLoading: boolean;
  error: string | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  filters: ScenarioFilterState;
  setFilter: (partial: Partial<ScenarioFilterState>) => void;
  resetFilters: () => void;
  filteredScenarios: ScenarioRecord[];
  selectedScenario: ScenarioRecord | null;
  setSelectedScenario: (scenario: ScenarioRecord | null) => void;
  drillDown: (filterPartial: Partial<ScenarioFilterState>, targetTab?: ActiveTab) => void;
  loadFile: (data: ArrayBuffer | Uint8Array, fileName: string) => void;
  loadSample: () => void;
  closeExcel: () => void;
}

const DEFAULT_FILTERS: ScenarioFilterState = {
  searchQuery: "",
  scenarioType: "ALL",
  deploymentStatus: "ALL",
  lifecycleStatus: "ALL",
  product: "ALL",
  businessUnit: "ALL",
  period: "ALL",
  triggerOrEvent: "ALL",
  governanceSeverity: "ALL",
  quickFilter: "ALL",
};

const OngoingRealtimeContext = createContext<OngoingRealtimeContextValue | null>(null);

export function OngoingRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [workbookState, setWorkbookState] = useState<OngoingRealtimeWorkbookState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [filters, setFilters] = useState<ScenarioFilterState>(DEFAULT_FILTERS);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioRecord | null>(null);

  const loadFile = useCallback((data: ArrayBuffer | Uint8Array, fileName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const state = parseOngoingRealtimeWorkbook(data, fileName);
      setWorkbookState(state);
      setFilters(DEFAULT_FILTERS);
      setSelectedScenario(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workbook yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSample = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const sampleBytes = generateSampleOngoingRealtimeWorkbook();
      const state = parseOngoingRealtimeWorkbook(sampleBytes, "Ornek_Ongoing_Realtime.xlsx");
      setWorkbookState(state);
      setFilters(DEFAULT_FILTERS);
      setSelectedScenario(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Örnek veriler yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeExcel = useCallback(() => {
    setWorkbookState(null);
    setSelectedScenario(null);
    setFilters(DEFAULT_FILTERS);
    setError(null);
  }, []);

  const setFilter = useCallback((partial: Partial<ScenarioFilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const drillDown = useCallback(
    (filterPartial: Partial<ScenarioFilterState>, targetTab: ActiveTab = "all-scenarios") => {
      setFilters((prev) => ({ ...prev, ...filterPartial }));
      setActiveTab(targetTab);
    },
    [],
  );

  // Filtered scenarios calculation
  const filteredScenarios = useMemo(() => {
    if (!workbookState) return [];

    return workbookState.scenarios.filter((s) => {
      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.trim().toLowerCase();
        const matchesQuery =
          s.scenarioName.toLowerCase().includes(query) ||
          s.campaignName.toLowerCase().includes(query) ||
          (s.detectedCampaignId && s.detectedCampaignId.toLowerCase().includes(query)) ||
          s.segmentOrEvent.toLowerCase().includes(query) ||
          s.product.toLowerCase().includes(query) ||
          s.businessUnit.toLowerCase().includes(query) ||
          (s.description && s.description.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // 2. Scenario Type
      if (filters.scenarioType !== "ALL" && s.scenarioType !== filters.scenarioType) {
        return false;
      }

      // 3. Deployment Status
      if (
        filters.deploymentStatus !== "ALL" &&
        s.deploymentStatus !== filters.deploymentStatus
      ) {
        return false;
      }

      // 4. Lifecycle Status
      if (
        filters.lifecycleStatus !== "ALL" &&
        s.lifecycleStatus !== filters.lifecycleStatus
      ) {
        return false;
      }

      // 5. Product
      if (filters.product !== "ALL" && s.product !== filters.product) {
        return false;
      }

      // 6. Business Unit
      if (filters.businessUnit !== "ALL" && s.businessUnit !== filters.businessUnit) {
        return false;
      }

      // 7. Period
      if (filters.period !== "ALL" && s.periodRaw !== filters.period) {
        return false;
      }

      // 8. Trigger / Event
      if (
        filters.triggerOrEvent !== "ALL" &&
        s.segmentOrEvent !== filters.triggerOrEvent
      ) {
        return false;
      }

      // 9. Governance Severity
      if (filters.governanceSeverity !== "ALL") {
        const hasSeverity = s.flags.some((f) => f.severity === filters.governanceSeverity);
        if (!hasSeverity) return false;
      }

      // 10. Quick Filters
      if (filters.quickFilter === "ACTIVE_DEPLOYED") {
        const isAct =
          s.lifecycleStatus === "Active" ||
          s.lifecycleStatus === "Expiring <= 30" ||
          s.lifecycleStatus === "Expiring 31-90" ||
          s.lifecycleStatus === "Long-running";
        if (!(isAct && s.deploymentStatus === "Deployed")) return false;
      } else if (filters.quickFilter === "ACTIVE_UNDEPLOYED") {
        const isAct =
          s.lifecycleStatus === "Active" ||
          s.lifecycleStatus === "Expiring <= 30" ||
          s.lifecycleStatus === "Expiring 31-90" ||
          s.lifecycleStatus === "Long-running";
        if (!(isAct && s.deploymentStatus === "Undeployed")) return false;
      } else if (filters.quickFilter === "EXPIRED_DEPLOYED") {
        if (!(s.lifecycleStatus === "Expired" && s.deploymentStatus === "Deployed")) return false;
      } else if (filters.quickFilter === "EXPIRING_30") {
        if (!s.isExpiring30) return false;
      } else if (filters.quickFilter === "EXPIRING_90") {
        if (!s.isExpiring90) return false;
      } else if (filters.quickFilter === "GOVERNANCE_CRITICAL") {
        if (s.criticalCount === 0) return false;
      } else if (filters.quickFilter === "GOVERNANCE_REVIEW") {
        if (s.reviewCount === 0) return false;
      } else if (filters.quickFilter === "SHARED_AUDIENCE") {
        if (!s.sharedAudienceCluster || s.sharedAudienceCluster.count <= 1) return false;
      } else if (filters.quickFilter === "HAS_DEPENDENCY") {
        if (!s.upstreamScenarioName && s.downstreamScenarioNames.length === 0) return false;
      }

      return true;
    });
  }, [workbookState, filters]);

  const value = useMemo(
    () => ({
      workbookState,
      isLoading,
      error,
      activeTab,
      setActiveTab,
      filters,
      setFilter,
      resetFilters,
      filteredScenarios,
      selectedScenario,
      setSelectedScenario,
      drillDown,
      loadFile,
      loadSample,
      closeExcel,
    }),
    [
      workbookState,
      isLoading,
      error,
      activeTab,
      filters,
      setFilter,
      resetFilters,
      filteredScenarios,
      selectedScenario,
      drillDown,
      loadFile,
      loadSample,
      closeExcel,
    ],
  );

  return (
    <OngoingRealtimeContext.Provider value={value}>
      {children}
    </OngoingRealtimeContext.Provider>
  );
}

export function useOngoingRealtime() {
  const ctx = useContext(OngoingRealtimeContext);
  if (!ctx) {
    throw new Error("useOngoingRealtime must be used within an OngoingRealtimeProvider");
  }
  return ctx;
}
