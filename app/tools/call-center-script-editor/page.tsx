import type { Metadata } from "next";
import { ToolPage } from "@/components/tools/tool-page";
import { CallCenterScriptWorkspace } from "@/components/tools/call-center-script-workspace";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("call-center-script-editor");

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function CallCenterScriptEditorPage() {
  return (
    <ToolPage toolId="call-center-script-editor" layout="flow">
      <CallCenterScriptWorkspace />
    </ToolPage>
  );
}
