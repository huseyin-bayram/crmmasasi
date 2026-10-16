import type { Metadata } from "next";
import { OngoingRealtimeProvider } from "@/components/ongoing-realtime/context";
import { OngoingRealtimeWorkspace } from "@/components/ongoing-realtime/workspace";

export const metadata: Metadata = {
  title: "Ongoing & Real-time Senaryo Yönetimi - CRM Masası",
  description:
    "Ongoing ve Real-time CRM scenario estate mimarisi, deployment sağlığı, tetikleyici manzarası ve yönetişim kontrol merkezi.",
};

export default function OngoingRealtimePage() {
  return (
    <OngoingRealtimeProvider>
      <OngoingRealtimeWorkspace />
    </OngoingRealtimeProvider>
  );
}
