import type { ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";
import type { FeedbackTone } from "@/lib/tools/engine";
import { cn } from "@/lib/cn";

const toneConfig: Record<FeedbackTone, { icon: typeof Info; className: string; srLabel: string }> = {
  success: { icon: CircleCheck, className: "border-success-line bg-success-bg [&>svg]:text-success", srLabel: "Başarılı" },
  warning: { icon: TriangleAlert, className: "border-warning-line bg-warning-bg [&>svg]:text-warning", srLabel: "Uyarı" },
  error: { icon: CircleX, className: "border-danger-line bg-danger-bg [&>svg]:text-danger", srLabel: "Hata" },
  info: { icon: Info, className: "border-info-line bg-info-bg [&>svg]:text-info", srLabel: "Bilgi" },
};

interface InlineAlertProps {
  tone: FeedbackTone;
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
  id?: string;
}

/**
 * Persistent message placed next to the content it concerns.
 * Used for errors and warnings (never auto-dismissed).
 */
export function InlineAlert({ tone, title, children, onDismiss, className, id }: InlineAlertProps) {
  const { icon: Icon, className: toneClass, srLabel } = toneConfig[tone];
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-ui text-ink", toneClass, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          <span className="sr-only">{srLabel}: </span>
          {title}
        </p>
        {children ? <div className="mt-0.5 text-ink-muted">{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 rounded p-0.5 text-ink-subtle hover:bg-black/5 hover:text-ink"
          aria-label="Mesajı kapat"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
