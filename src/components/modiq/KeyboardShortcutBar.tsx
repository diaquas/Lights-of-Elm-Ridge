"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "modiq-shortcut-bar-dismissed";

function getWasDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

const SHORTCUTS = [
  { keys: "Alt+N", label: "Next" },
  { keys: "Alt+Enter", label: "Accept" },
  { keys: "Alt+S", label: "Skip" },
  { keys: "Ctrl+Z", label: "Undo" },
] as const;

export function KeyboardShortcutBar() {
  const storedDismissed = useSyncExternalStore(subscribe, getWasDismissed, () => false);
  const [forceVisible, setForceVisible] = useState(false);
  const [localDismissed, setLocalDismissed] = useState(false);

  const visible = forceVisible || (!storedDismissed && !localDismissed);
  const showToggle = !visible && (storedDismissed || localDismissed);

  const dismiss = useCallback(() => {
    setForceVisible(false);
    setLocalDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage unavailable
    }
  }, []);

  const show = useCallback(() => {
    setForceVisible(true);
    setLocalDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <>
      {/* Shortcut bar */}
      {visible && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-surface border-t border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            {SHORTCUTS.map(({ keys, label }) => (
              <span key={keys} className="text-[11px] text-foreground/30 flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-foreground/5 border border-foreground/10 rounded text-[10px] text-foreground/50 font-mono">
                  {keys}
                </kbd>
                <span>{label}</span>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-foreground/20 hover:text-foreground/50 transition-colors text-sm leading-none px-1"
            aria-label="Dismiss keyboard shortcuts"
          >
            &times;
          </button>
        </div>
      )}

      {/* "?" toggle button — shown when bar is dismissed */}
      {showToggle && (
        <button
          type="button"
          onClick={show}
          className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full bg-surface border border-border text-foreground/30 hover:text-foreground/60 hover:border-foreground/20 text-sm font-bold transition-all duration-200 flex items-center justify-center shadow-lg"
          aria-label="Show keyboard shortcuts"
          title="Keyboard shortcuts"
        >
          ?
        </button>
      )}
    </>
  );
}
