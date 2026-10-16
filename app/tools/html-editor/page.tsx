import type { Metadata } from "next";
import { ToolPage } from "@/components/tools/tool-page";
import { HtmlEditorWorkspace } from "@/components/tools/html-editor-workspace";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("html-editor");

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function HtmlEditorPage() {
  return (
    <ToolPage toolId="html-editor" layout="fill">
      <HtmlEditorWorkspace />
    </ToolPage>
  );
}
