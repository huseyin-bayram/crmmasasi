import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextEditorProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** id of the visible pane heading that labels this editor. */
  labelledBy: string;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * Plain, predictable text editor. Monospace so that look-alike characters
 * (’ vs ', – vs -) are distinguishable. Spellcheck/autocorrect are disabled
 * so the browser never changes campaign text on its own.
 */
export function TextEditor({ labelledBy, className, readOnly, ref, ...props }: TextEditorProps) {
  return (
    <textarea
      ref={ref}
      aria-labelledby={labelledBy}
      readOnly={readOnly}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      className={cn(
        "absolute inset-0 block size-full resize-none px-3 py-2.5 font-mono text-[13px] leading-5 text-ink focus:outline-none focus-visible:outline-none",
        readOnly ? "bg-surface-muted" : "bg-surface",
        className,
      )}
      {...props}
    />
  );
}
