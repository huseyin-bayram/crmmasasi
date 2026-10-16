"use client";

import type { DerivedStatus, CampaignChannel } from "@/lib/excel-workspace";
import { cn } from "@/lib/cn";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  Calendar,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface StatusBadgeProps {
  status: DerivedStatus | string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, className, size = "sm" }: StatusBadgeProps) {
  let text = label;
  let bg = "bg-canvas text-ink-muted border-line";
  let icon = <Clock className="size-3 shrink-0" />;

  switch (status) {
    case "completed":
      text = text || "Tamamlandı";
      bg = "bg-emerald-50 text-emerald-800 border-emerald-200";
      icon = <CheckCircle2 className="size-3 shrink-0 text-emerald-600" />;
      break;
    case "action_today":
      text = text || "Bugün Aksiyon";
      bg = "bg-amber-50 text-amber-900 border-amber-300 font-semibold";
      icon = <AlertCircle className="size-3 shrink-0 text-amber-600" />;
      break;
    case "delayed":
      text = text || "Gecikmiş";
      bg = "bg-rose-50 text-rose-800 border-rose-300 font-semibold";
      icon = <AlertTriangle className="size-3 shrink-0 text-rose-600" />;
      break;
    case "blocked":
      text = text || "Blokeli";
      bg = "bg-red-50 text-red-900 border-red-300 font-semibold";
      icon = <Ban className="size-3 shrink-0 text-red-600" />;
      break;
    case "upcoming":
      text = text || "Yaklaşan";
      bg = "bg-sky-50 text-sky-800 border-sky-200";
      icon = <Calendar className="size-3 shrink-0 text-sky-600" />;
      break;
    case "cancelled":
      text = text || "İptal";
      bg = "bg-stone-100 text-stone-600 border-stone-200 line-through opacity-80";
      icon = <Ban className="size-3 shrink-0 text-stone-500" />;
      break;
    case "review_required":
      text = text || "Kontrol Gerekli";
      bg = "bg-purple-50 text-purple-800 border-purple-200";
      icon = <HelpCircle className="size-3 shrink-0 text-purple-600" />;
      break;
    default:
      text = text || status;
      bg = "bg-canvas text-ink-muted border-line";
      icon = <Clock className="size-3 shrink-0" />;
  }

  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[11px] gap-1" : "px-2 py-1 text-xs gap-1.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium whitespace-nowrap",
        sizeClasses,
        bg,
        className,
      )}
    >
      {icon}
      <span>{text}</span>
    </span>
  );
}

interface ChannelBadgeProps {
  channel: CampaignChannel | string;
  className?: string;
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  let badgeStyle = "bg-slate-100 text-slate-800 border-slate-200";

  switch (channel) {
    case "SMS":
      badgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
      break;
    case "PUSH":
    case "Mobil Bildirim":
      badgeStyle = "bg-indigo-50 text-indigo-800 border-indigo-200";
      break;
    case "E-posta":
      badgeStyle = "bg-violet-50 text-violet-800 border-violet-200";
      break;
    case "Şube":
      badgeStyle = "bg-teal-50 text-teal-800 border-teal-200";
      break;
    case "ATM":
      badgeStyle = "bg-cyan-50 text-cyan-800 border-cyan-200";
      break;
    case "Çağrı Merkezi":
      badgeStyle = "bg-amber-50 text-amber-900 border-amber-200";
      break;
    case "Web Pop-up":
      badgeStyle = "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200";
      break;
    case "İnternet":
      badgeStyle = "bg-sky-50 text-sky-800 border-sky-200";
      break;
    case "IVN":
      badgeStyle = "bg-orange-50 text-orange-900 border-orange-200";
      break;
    default:
      badgeStyle = "bg-stone-100 text-stone-700 border-stone-200";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide border whitespace-nowrap",
        badgeStyle,
        className,
      )}
    >
      {channel}
    </span>
  );
}
