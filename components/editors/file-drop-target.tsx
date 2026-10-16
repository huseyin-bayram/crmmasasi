"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileUp } from "lucide-react";

interface FileDropTargetProps {
  onFile: (file: File) => void;
  /** Text shown while a file is dragged over the target. */
  label: string;
  children: ReactNode;
}

/** Makes an editor area accept a dropped file, with a clear drop overlay. */
export function FileDropTarget({ onFile, label, children }: FileDropTargetProps) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  function hasFiles(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  return (
    <div
      className="absolute inset-0"
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setActive(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setActive(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setActive(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      {children}
      {active ? (
        <div className="pointer-events-none absolute inset-1.5 flex items-center justify-center gap-2 rounded border-2 border-dashed border-brand-700 bg-brand-50/95 text-sm font-medium text-brand-900">
          <FileUp aria-hidden="true" className="size-4" />
          {label}
        </div>
      ) : null}
    </div>
  );
}
