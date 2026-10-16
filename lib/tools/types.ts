/**
 * Core types for the tool platform.
 * The registry (./registry.ts) is the single source of truth for every tool;
 * navigation, the launcher and tool page headers are all derived from it.
 */

export type ToolCategoryId =
  | "content"
  | "email"
  | "sms"
  | "push"
  | "call-center"
  | "links"
  | "quality";

/**
 * - `available`: fully working tool.
 * - `preview`:   workspace UI is ready, processing engine is still in development.
 * - `planned`:   registered for roadmap purposes, never shown in navigation.
 */
export type ToolStatus = "available" | "preview" | "planned";

/** Where user content is processed. Shown to users as a trust signal. */
export type ToolDataHandling = "client" | "server-urls";

/** Icon keys are resolved to components in `components/tools/tool-icon.tsx`. */
export type ToolIconName = "file-code" | "type" | "link" | "headphones";

export interface ToolDefinition {
  /** Stable identifier, also the last URL segment. */
  id: string;
  name: string;
  /** One-line description used in the launcher and tool page header. */
  description: string;
  path: `/tools/${string}`;
  icon: ToolIconName;
  category: ToolCategoryId;
  status: ToolStatus;
  dataHandling: ToolDataHandling;
  /** Optional search terms for a future launcher filter / command menu. */
  keywords?: readonly string[];
}

export interface ToolCategory {
  id: ToolCategoryId;
  label: string;
  order: number;
}
