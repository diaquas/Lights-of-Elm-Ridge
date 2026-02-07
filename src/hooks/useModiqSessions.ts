"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────

export interface MappingSessionRow {
  id: string;
  source_type: "elm-ridge" | "other-vendor";
  sequence_slug: string | null;
  sequence_title: string;
  layout_filename: string;
  current_phase: string;
  mapped_count: number;
  total_count: number;
  coverage_percent: number;
  state_data: SerializedMappingState;
  status: "in_progress" | "completed" | "abandoned";
  created_at: string;
  updated_at: string;
}

export interface XmapFileRow {
  id: string;
  session_id: string | null;
  filename: string;
  sequence_title: string;
  layout_filename: string;
  item_count: number;
  coverage_percent: number;
  content: string;
  created_at: string;
}

/** Serializable subset of mapping state for session recovery */
export interface SerializedMappingState {
  /** dest model name → source model name (or null for cleared) */
  assignments: Record<string, string | null>;
  /** Set of skipped dest model names */
  skipped: string[];
  /** Set of overridden dest model names */
  overrides: string[];
  /** Source → dest links (source name → dest name[]) */
  sourceDestLinks: Record<string, string[]>;
  /** Names rejected during auto-accept */
  autoAcceptRejected: string[];
}

// ─── Hook ───────────────────────────────────────────────

export function useModiqSessions() {
  const [activeSession, setActiveSession] = useState<MappingSessionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHashRef = useRef<string>("");

  // Load the most recent in-progress session on mount
  useEffect(() => {
    async function loadActiveSession() {
      const supabase = createClient();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("mapping_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveSession(data as MappingSessionRow);
      }
      setIsLoading(false);
    }

    loadActiveSession();
  }, []);

  // ── Create a new session ──────────────────────────────
  const createSession = useCallback(
    async (params: {
      sourceType: "elm-ridge" | "other-vendor";
      sequenceSlug: string | null;
      sequenceTitle: string;
      layoutFilename: string;
      totalCount: number;
    }): Promise<string | null> => {
      const supabase = createClient();
      if (!supabase || !userId) return null;

      // Abandon any existing in-progress session
      await supabase
        .from("mapping_sessions")
        .update({ status: "abandoned" })
        .eq("user_id", userId)
        .eq("status", "in_progress");

      const { data, error } = await supabase
        .from("mapping_sessions")
        .insert({
          user_id: userId,
          source_type: params.sourceType,
          sequence_slug: params.sequenceSlug,
          sequence_title: params.sequenceTitle,
          layout_filename: params.layoutFilename,
          total_count: params.totalCount,
          state_data: {
            assignments: {},
            skipped: [],
            overrides: [],
            sourceDestLinks: {},
            autoAcceptRejected: [],
          },
        })
        .select("id")
        .single();

      if (error || !data) return null;
      return data.id;
    },
    [userId],
  );

  // ── Debounced auto-save ───────────────────────────────
  const saveSession = useCallback(
    (
      sessionId: string,
      state: SerializedMappingState,
      progress: { mappedCount: number; coveragePercent: number; currentPhase: string },
    ) => {
      // Simple hash to avoid redundant saves
      const hash = JSON.stringify({ state, progress });
      if (hash === lastHashRef.current) return;
      lastHashRef.current = hash;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        const supabase = createClient();
        if (!supabase) return;

        await supabase
          .from("mapping_sessions")
          .update({
            state_data: state,
            mapped_count: progress.mappedCount,
            coverage_percent: progress.coveragePercent,
            current_phase: progress.currentPhase,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      }, 1000); // 1s debounce
    },
    [],
  );

  // ── Complete a session ────────────────────────────────
  const completeSession = useCallback(async (sessionId: string) => {
    const supabase = createClient();
    if (!supabase) return;

    await supabase
      .from("mapping_sessions")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    setActiveSession(null);
  }, []);

  // ── Abandon a session ─────────────────────────────────
  const abandonSession = useCallback(async (sessionId: string) => {
    const supabase = createClient();
    if (!supabase) return;

    await supabase
      .from("mapping_sessions")
      .update({
        status: "abandoned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    setActiveSession(null);
  }, []);

  // ── Save xmap file ────────────────────────────────────
  const saveXmapFile = useCallback(
    async (params: {
      sessionId: string | null;
      filename: string;
      sequenceTitle: string;
      layoutFilename: string;
      itemCount: number;
      coveragePercent: number;
      content: string;
    }) => {
      const supabase = createClient();
      if (!supabase || !userId) return null;

      const { data, error } = await supabase
        .from("xmap_files")
        .insert({
          user_id: userId,
          session_id: params.sessionId,
          filename: params.filename,
          sequence_title: params.sequenceTitle,
          layout_filename: params.layoutFilename,
          item_count: params.itemCount,
          coverage_percent: params.coveragePercent,
          content: params.content,
        })
        .select("id")
        .single();

      if (error || !data) return null;
      return data.id;
    },
    [userId],
  );

  // ── Fetch mapping history ─────────────────────────────
  const fetchHistory = useCallback(async (): Promise<MappingSessionRow[]> => {
    const supabase = createClient();
    if (!supabase || !userId) return [];

    const { data } = await supabase
      .from("mapping_sessions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["completed", "in_progress"])
      .order("updated_at", { ascending: false });

    return (data ?? []) as MappingSessionRow[];
  }, [userId]);

  // ── Fetch xmap files ──────────────────────────────────
  const fetchXmapFiles = useCallback(async (): Promise<XmapFileRow[]> => {
    const supabase = createClient();
    if (!supabase || !userId) return [];

    const { data } = await supabase
      .from("xmap_files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return (data ?? []) as XmapFileRow[];
  }, [userId]);

  // ── Delete xmap file ──────────────────────────────────
  const deleteXmapFile = useCallback(async (xmapId: string) => {
    const supabase = createClient();
    if (!supabase) return;

    await supabase
      .from("xmap_files")
      .delete()
      .eq("id", xmapId);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    activeSession,
    isLoading,
    userId,
    createSession,
    saveSession,
    completeSession,
    abandonSession,
    saveXmapFile,
    fetchHistory,
    fetchXmapFiles,
    deleteXmapFile,
  };
}
