"use client";

import { useEffect, useRef } from "react";

/**
 * Binds Ctrl+Enter (Cmd+Enter on macOS) to the tool's primary action
 * while the tool page is mounted.
 */
export function usePrimaryShortcut(handler: () => void): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.repeat) {
        event.preventDefault();
        handlerRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
