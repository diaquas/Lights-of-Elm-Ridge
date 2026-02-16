"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const STORAGE_KEY = "modiq_session";
const SAVE_DEBOUNCE_MS = 2000;

export interface PersistedSession {
  /** Timestamp of last save */
  savedAt: number;
  /** Sequence slug for identifying the session */
  sequenceSlug: string;
  /** Serialized mapping state */
  state: {
    assignments: Record<string, string | null>;
    skipped: string[];
    overrides: string[];
    sourceDestLinks: Record<string, string[]>;
  };
}

/**
 * Auto-saves mapping state to localStorage every 2 seconds (debounced).
 * Provides a way to check for and restore a previous session.
 */
export function useSessionPersistence(
  sequenceSlug: string,
  getSerializedState: () => PersistedSession["state"],
  deps: unknown[],
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save on every meaningful change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const session: PersistedSession = {
          savedAt: Date.now(),
          sequenceSlug,
          state: getSerializedState(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // localStorage full or unavailable — silently skip
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Clear saved session (after export or explicit reset)
  const clearSavedSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { clearSavedSession };
}

/**
 * Check for a saved session in localStorage.
 * Returns the session if it exists, matches the sequence, and is recent (< 24 hours).
 */
export function getSavedSession(
  sequenceSlug: string,
): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: PersistedSession = JSON.parse(raw);
    // Must match the same sequence
    if (session.sequenceSlug !== sequenceSlug) return null;
    // Must be within 24 hours
    const age = Date.now() - session.savedAt;
    if (age > 24 * 60 * 60 * 1000) return null;
    // Basic validation
    if (!session.state || typeof session.state.sourceDestLinks !== "object")
      return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Hook that checks for a restorable session and provides UI state for the prompt.
 */
export function useSessionRestore(sequenceSlug: string) {
  const [pendingRestore, setPendingRestore] = useState<PersistedSession | null>(
    () => getSavedSession(sequenceSlug),
  );

  const dismiss = useCallback(() => {
    setPendingRestore(null);
  }, []);

  const clearAndDismiss = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPendingRestore(null);
  }, []);

  return { pendingRestore, dismiss, clearAndDismiss };
}
