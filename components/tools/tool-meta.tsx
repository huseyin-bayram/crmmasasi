import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ToolDataHandling, ToolStatus } from "@/lib/tools/types";

export function ToolStatusBadge({ status }: { status: ToolStatus }) {
  if (status === "available") return null;
  if (status === "preview") {
    return (
      <Badge tone="info" title="Arayüz kullanıma hazır; işleme motoru geliştiriliyor.">
        Önizleme
      </Badge>
    );
  }
  return <Badge tone="neutral">Planlandı</Badge>;
}

const dataHandlingText: Record<ToolDataHandling, string> = {
  client: "Tarayıcıda işlenir · İçerik kaydedilmez",
  "server-urls": "Yalnızca bağlantı adresleri sunucuya gönderilir · İçerik kaydedilmez",
};

/** Small trust signal telling users where their campaign content goes. */
export function DataHandlingNote({ mode }: { mode: ToolDataHandling }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
      <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-brand-700" strokeWidth={2} />
      {dataHandlingText[mode]}
    </p>
  );
}
