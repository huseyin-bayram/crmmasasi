"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  WorkspaceState,
  CampaignOperation,
  DataQualityIssue,
  DateOnly,
} from "@/lib/excel-workspace";
import { parseExcelWorkbook, getTodayDateOnly, normalizeTurkishText } from "@/lib/excel-workspace";

const STORAGE_KEY_SELECTED_OWNER = "crm_workspace_selected_owner";

export interface WorkspaceContextValue {
  state: WorkspaceState | null;
  selectedOwner: string | null;
  selectedOperation: CampaignOperation | null;
  isQualityModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  today: DateOnly;
  loadWorkbook: (file: File) => Promise<{ success: boolean; error?: string }>;
  closeWorkbook: () => void;
  setSelectedOwner: (owner: string | null) => void;
  selectOperation: (op: CampaignOperation | null) => void;
  setIsQualityModalOpen: (open: boolean) => void;
  getRelatedOperations: (cmsCode: string) => CampaignOperation[];
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [selectedOwner, setSelectedOwnerState] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<CampaignOperation | null>(null);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<DateOnly>({
    year: 2026,
    month: 10,
    day: 12,
    isoString: "2026-10-12",
  });

  // Client-side date initialization to prevent Next.js 16 prerender date errors
  useEffect(() => {
    setToday(getTodayDateOnly());
  }, []);

  // Restore owner preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SELECTED_OWNER);
      if (saved) {
        setSelectedOwnerState(saved);
      }
    } catch {
      // Storage might be restricted in some iframe contexts
    }
  }, []);

  const setSelectedOwner = useCallback((owner: string | null) => {
    setSelectedOwnerState(owner);
    try {
      if (owner) {
        localStorage.setItem(STORAGE_KEY_SELECTED_OWNER, owner);
      } else {
        localStorage.removeItem(STORAGE_KEY_SELECTED_OWNER);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const loadWorkbook = useCallback(
    async (file: File): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const result = parseExcelWorkbook(buffer, {
          fileName: file.name,
          fileSize: file.size,
        });

        if (!result.ok) {
          setError(result.message);
          setIsLoading(false);
          return { success: false, error: result.message };
        }

        setState(result.state);

        // Auto-select owner if saved owner is found in available owners
        const saved = localStorage.getItem(STORAGE_KEY_SELECTED_OWNER);
        if (saved && result.state.availableOwners.includes(saved)) {
          setSelectedOwnerState(saved);
        } else if (result.state.availableOwners.length > 0 && !selectedOwner) {
          // If no owner previously chosen, don't force or pick first
          setSelectedOwnerState(result.state.availableOwners[0]);
        }

        setIsLoading(false);
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Excel dosyası işlenirken beklenmeyen bir hata oluştu.";
        setError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }
    },
    [selectedOwner],
  );

  /**
   * Excel'i Kapat:
   * Clears operations, requests, campaign contents, target audiences, notes, and workbook state from RAM.
   * Leaves user preference `selectedOwner` intact in localStorage.
   */
  const closeWorkbook = useCallback(() => {
    setState(null);
    setSelectedOperation(null);
    setIsQualityModalOpen(false);
    setError(null);
  }, []);

  const selectOperation = useCallback((op: CampaignOperation | null) => {
    setSelectedOperation(op);
  }, []);

  const getRelatedOperations = useCallback(
    (cmsCode: string): CampaignOperation[] => {
      if (!state || !cmsCode) return [];
      const trimmed = normalizeTurkishText(cmsCode);
      return state.operations.filter(
        (op) => normalizeTurkishText(op.cmsCode) === trimmed,
      );
    },
    [state],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        state,
        selectedOwner,
        selectedOperation,
        isQualityModalOpen,
        isLoading,
        error,
        today,
        loadWorkbook,
        closeWorkbook,
        setSelectedOwner,
        selectOperation,
        setIsQualityModalOpen,
        getRelatedOperations,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
