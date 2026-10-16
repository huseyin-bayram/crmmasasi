"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonSize } from "@/components/ui/button";
import { useToast } from "@/components/feedback/toast-provider";
import { copyToClipboard } from "@/lib/clipboard";

interface CopyButtonProps {
  text: string;
  /** Accessible name, e.g. "HTML kodunu kopyala". */
  ariaLabel: string;
  size?: ButtonSize;
  /** Custom toast message upon copy. Defaults to "Panoya kopyalandı.". */
  successMessage?: string;
  /** Called when the clipboard is blocked so the caller can select the text. */
  onCopyFailed?: () => void;
}

/**
 * Copy action with in-place confirmation ("Kopyalandı") plus a subtle toast.
 * Fixed width prevents layout shift when the label changes.
 */
export function CopyButton({ text, ariaLabel, size = "sm", successMessage = "Panoya kopyalandı.", onCopyFailed }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useToast();

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handleCopy() {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      notify({ tone: "success", message: successMessage });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } else {
      onCopyFailed?.();
      notify({
        tone: "error",
        message: "Kopyalanamadı: tarayıcı panoya erişime izin vermedi. Sonuç seçildi, Ctrl+C ile kopyalayabilirsiniz.",
      });
    }
  }

  return (
    <Button
      variant="secondary"
      size={size}
      icon={copied ? Check : Copy}
      onClick={handleCopy}
      disabled={!text}
      aria-label={ariaLabel}
      title={text ? undefined : "Kopyalanacak sonuç yok"}
      className="min-w-[104px]"
    >
      {copied ? "Kopyalandı" : "Kopyala"}
    </Button>
  );
}
