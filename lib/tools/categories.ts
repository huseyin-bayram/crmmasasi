import type { ToolCategory, ToolCategoryId } from "./types";

/**
 * All categories the platform knows about. Categories without tools are
 * never rendered, so adding one here has no visible effect until a tool uses it.
 */
export const toolCategories: Record<ToolCategoryId, ToolCategory> = {
  content: { id: "content", label: "İçerik", order: 10 },
  email: { id: "email", label: "E-posta", order: 20 },
  sms: { id: "sms", label: "SMS", order: 30 },
  push: { id: "push", label: "Push", order: 40 },
  "call-center": { id: "call-center", label: "Çağrı Merkezi", order: 50 },
  links: { id: "links", label: "Bağlantılar", order: 60 },
  quality: { id: "quality", label: "Kalite Kontrol", order: 70 },
};

export function getCategory(id: ToolCategoryId): ToolCategory {
  return toolCategories[id];
}
