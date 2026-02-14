"use client";

import { useEffect } from "react";

interface KeyboardShortcutConfig {
  onTab: () => void;
  onEnter: () => void;
  onSkip: () => void;
  onUndo: () => void;
  enabled: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutConfig): void {
  useEffect(() => {
    if (!config.enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Alt+N: next item (replaces Tab hijacking to preserve standard keyboard navigation)
      if (e.key === "n" && e.altKey) {
        e.preventDefault();
        config.onTab();
      }

      // Alt+Enter: accept/confirm mapping
      if (e.key === "Enter" && e.altKey) {
        e.preventDefault();
        config.onEnter();
      }

      // Alt+S: skip current item
      if ((e.key === "s" || e.key === "S") && e.altKey) {
        e.preventDefault();
        config.onSkip();
      }

      // Ctrl/Cmd+Z: undo (unchanged)
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        config.onUndo();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [config]);
}
