import { toolCategories } from "./categories";
import { getVisibleTools } from "./registry";
import type { ToolDefinition } from "./types";

export interface ToolGroup {
  id: string;
  label: string;
  tools: readonly ToolDefinition[];
}

/**
 * Below this number of tools a single flat "Araçlar" group is clearer than
 * many one-item category groups. Above it, tools are grouped by category.
 */
export const CATEGORY_GROUPING_THRESHOLD = 7;

export function getToolGroups(
  tools: readonly ToolDefinition[] = getVisibleTools(),
): ToolGroup[] {
  if (tools.length < CATEGORY_GROUPING_THRESHOLD) {
    return [{ id: "all", label: "Araçlar", tools }];
  }

  const byCategory = new Map<string, ToolDefinition[]>();
  for (const tool of tools) {
    const list = byCategory.get(tool.category) ?? [];
    list.push(tool);
    byCategory.set(tool.category, list);
  }

  return Object.values(toolCategories)
    .sort((a, b) => a.order - b.order)
    .filter((category) => byCategory.has(category.id))
    .map((category) => ({
      id: category.id,
      label: category.label,
      tools: byCategory.get(category.id) ?? [],
    }));
}
