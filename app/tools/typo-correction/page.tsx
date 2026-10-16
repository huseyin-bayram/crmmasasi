import type { Metadata } from "next";
import { ToolPage } from "@/components/tools/tool-page";
import { TypoCorrectionWorkspace } from "@/components/tools/typo-correction-workspace";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("typo-correction");

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function TypoCorrectionPage() {
  return (
    <ToolPage toolId="typo-correction" layout="fill">
      <TypoCorrectionWorkspace />
    </ToolPage>
  );
}
