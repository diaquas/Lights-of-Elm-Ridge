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
      // Skip if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        config.onTab();
      }

      if (e.key === "Enter") {
        e.preventDefault();
        config.onEnter();
      }

      if (e.key === "s" || e.key === "S") {
        if (!e.ctrlKey && !e.metaKey) {
          config.onSkip();
        }
      }

      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        config.onUndo();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [config]);
}
