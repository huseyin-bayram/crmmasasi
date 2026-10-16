import type { Metadata } from "next";
import { ToastProvider } from "@/components/feedback/toast-provider";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { appConfig } from "@/lib/app-config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: `%s | ${appConfig.name} - ${appConfig.organization}`,
    default: `${appConfig.name} | ${appConfig.organization}`,
  },
  description: appConfig.description,
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/crm-masa-logo.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <ToastProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
