import type { Metadata } from "next";
import { ToolPage } from "@/components/tools/tool-page";
import { LinkCheckerWorkspace } from "@/components/tools/link-checker-workspace";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("link-checker");

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function LinkCheckerPage() {
  return (
    <ToolPage toolId="link-checker" layout="fill">
      <LinkCheckerWorkspace />
    </ToolPage>
  );
}
