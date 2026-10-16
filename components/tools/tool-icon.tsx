import { FileCode, Headphones, Link2, Type, type LucideProps } from "lucide-react";
import type { ToolIconName } from "@/lib/tools/types";

const icons: Record<ToolIconName, typeof FileCode> = {
  "file-code": FileCode,
  type: Type,
  link: Link2,
  headphones: Headphones,
};

interface ToolIconProps extends LucideProps {
  name: ToolIconName;
}

/** Resolves a registry icon key to its component (keeps the registry serializable). */
export function ToolIcon({ name, ...props }: ToolIconProps) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" strokeWidth={1.75} {...props} />;
}
