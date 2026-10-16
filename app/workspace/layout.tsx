import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { OperationDetailDrawer } from "@/components/workspace/operation-detail-drawer";
import { DataQualityModal } from "@/components/workspace/data-quality-modal";

export const metadata = {
  title: "Çalışma Alanı",
  description: "Türkiye Finans CRM Kampanya Operasyonları Çalışma Alanı",
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex flex-col min-h-dvh bg-canvas">
        <WorkspaceHeader />
        <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {children}
        </div>
        <OperationDetailDrawer />
        <DataQualityModal />
      </div>
    </AppShell>
  );
}
