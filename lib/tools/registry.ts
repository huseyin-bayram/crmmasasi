import type { ToolDefinition } from "./types";

/**
 * Tool Registry — the single source of truth.
 *
 * To add a tool:
 *   1. Add an entry below.
 *   2. Create `app/tools/<id>/page.tsx` that renders `<ToolPage toolId="<id>">`.
 * Sidebar, launcher, breadcrumbs and metadata pick it up automatically.
 */
export const toolRegistry = [
  {
    id: "html-editor",
    name: "HTML Editor",
    description: "E-posta HTML kaynak kodunu kampanya sistemlerine uygun ve güvenli hale getirir.",
    path: "/tools/html-editor",
    icon: "file-code",
    category: "email",
    status: "available",
    dataHandling: "client",
    keywords: ["html", "e-posta", "email", "şablon", "temizle", "dönüştür"],
  },
  {
    id: "typo-correction",
    name: "Typo Correction",
    description:
      "Metinlerde gönderim ve kampanya sistemlerinde sorun oluşturabilecek karakterleri güvenli biçime dönüştürür.",
    path: "/tools/typo-correction",
    icon: "type",
    category: "content",
    status: "available",
    dataHandling: "client",
    keywords: ["karakter", "tırnak", "kesme", "tire", "sms", "push", "unicode"],
  },
  {
    id: "link-checker",
    name: "Link Checker",
    description:
      "Bağlantıları tarayıcıda ayıklar; yerel Python kontrol raporundan HTTP durumlarını ve yönlendirmeleri gösterir.",
    path: "/tools/link-checker",
    icon: "link",
    category: "links",
    status: "available",
    dataHandling: "client",
    keywords: ["link", "url", "bağlantı", "yönlendirme", "redirect", "404"],
  },
  {
    id: "call-center-script-editor",
    name: "CC Script Editor",
    description:
      "Word formatındaki çağrı merkezi scriptlerini EVAM'a uygun HTML yapısına dönüştürür, standart şablonu ve zorunlu Page etiketlerini yönetir.",
    path: "/tools/call-center-script-editor",
    icon: "headphones",
    category: "call-center",
    status: "available",
    dataHandling: "client",
    keywords: ["call center", "çağrı merkezi", "script", "evam", "word", "docx", "page1", "page2", "approvepage"],
  },
] as const satisfies readonly ToolDefinition[];

export type ToolId = (typeof toolRegistry)[number]["id"];

const allTools: readonly ToolDefinition[] = toolRegistry;

/** Tools that should be visible to users (excludes `planned`). */
export function getVisibleTools(): readonly ToolDefinition[] {
  return allTools.filter((tool) => tool.status !== "planned");
}

export function getTool(id: ToolId): ToolDefinition {
  const tool = allTools.find((t) => t.id === id);
  if (!tool) {
    throw new Error(`Unknown tool id: ${id}`);
  }
  return tool;
}

export function findToolByPath(pathname: string): ToolDefinition | undefined {
  return allTools.find(
    (tool) => pathname === tool.path || pathname.startsWith(`${tool.path}/`),
  );
}
