"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useModiqSessions,
  type MappingSessionRow,
  type XmapFileRow,
} from "@/hooks/useModiqSessions";

// ─── Helpers ─────────────────────────────────────────

function getCoverageColor(pct: number): string {
  if (pct >= 90) return "text-green-400";
  if (pct >= 70) return "text-amber-400";
  if (pct >= 50) return "text-orange-400";
  return "text-red-400";
}

function getCoverageBg(pct: number): string {
  if (pct >= 90) return "bg-green-400";
  if (pct >= 70) return "bg-amber-400";
  if (pct >= 50) return "bg-orange-400";
  return "bg-red-400";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceLabel(type: string): string {
  return type === "elm-ridge" ? "Elm Ridge" : "Other Vendor";
}

// ─── Component ───────────────────────────────────────

export function ModiqHistorySection() {
  const sessions = useModiqSessions();
  const [history, setHistory] = useState<MappingSessionRow[]>([]);
  const [xmapFiles, setXmapFiles] = useState<XmapFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress">("all");
  const [deletingXmap, setDeletingXmap] = useState<string | null>(null);
  const [abandoningSession, setAbandoningSession] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    if (sessions.isLoading) return;
    if (!sessions.userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      const [h, x] = await Promise.all([
        sessions.fetchHistory(),
        sessions.fetchXmapFiles(),
      ]);
      if (!cancelled) {
        setHistory(h);
        setXmapFiles(x);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.isLoading, sessions.userId]);

  // ── Stats ──────────────────────────────────────────

  const stats = useMemo(() => {
    const completed = history.filter((s) => s.status === "completed");
    const totalMappings = completed.length;
    const totalItemsMapped = completed.reduce((sum, s) => sum + s.mapped_count, 0);
    const avgCoverage =
      completed.length > 0
        ? Math.round(completed.reduce((sum, s) => sum + s.coverage_percent, 0) / completed.length)
        : 0;
    return { totalMappings, totalItemsMapped, avgCoverage, xmapCount: xmapFiles.length };
  }, [history, xmapFiles]);

  // ── Active (in-progress) session ───────────────────

  const activeSession = useMemo(
    () => history.find((s) => s.status === "in_progress") ?? null,
    [history],
  );

  // ── Filtered history ───────────────────────────────

  const filteredHistory = useMemo(() => {
    let items = history;
    if (statusFilter !== "all") {
      items = items.filter((s) => s.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.sequence_title.toLowerCase().includes(q) ||
          s.layout_filename.toLowerCase().includes(q),
      );
    }
    return items;
  }, [history, statusFilter, search]);

  // ── xmap lookup by session ─────────────────────────

  const xmapBySession = useMemo(() => {
    const map = new Map<string, XmapFileRow[]>();
    for (const x of xmapFiles) {
      if (!x.session_id) continue;
      const arr = map.get(x.session_id) ?? [];
      arr.push(x);
      map.set(x.session_id, arr);
    }
    return map;
  }, [xmapFiles]);

  // ── Actions ────────────────────────────────────────

  const handleDownloadXmap = useCallback((xmap: XmapFileRow) => {
    const blob = new Blob([xmap.content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = xmap.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDeleteXmap = useCallback(
    async (xmapId: string) => {
      setDeletingXmap(xmapId);
      await sessions.deleteXmapFile(xmapId);
      setXmapFiles((prev) => prev.filter((x) => x.id !== xmapId));
      setDeletingXmap(null);
    },
    [sessions],
  );

  const handleAbandon = useCallback(
    async (sessionId: string) => {
      setAbandoningSession(sessionId);
      await sessions.abandonSession(sessionId);
      setHistory((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: "abandoned" as const } : s)),
      );
      setAbandoningSession(null);
    },
    [sessions],
  );

  // ── Loading state ──────────────────────────────────

  if (loading || sessions.isLoading) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border mb-8">
        <h2 className="text-xl font-bold mb-4">ModIQ Mapping History</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-3 border-accent border-t-transparent rounded-full" />
          <span className="ml-3 text-foreground/60 text-sm">Loading mapping data...</span>
        </div>
      </div>
    );
  }

  // ── No user / no sessions ──────────────────────────

  if (!sessions.userId) {
    return null;
  }

  if (history.length === 0 && xmapFiles.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-6 border border-border mb-8">
        <h2 className="text-xl font-bold mb-4">ModIQ Mapping History</h2>
        <div className="text-center py-8 text-foreground/60">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mb-4">No mapping sessions yet.</p>
          <Link
            href="/modiq"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            Start Mapping
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-6 border border-border mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">ModIQ Mapping History</h2>
        <Link
          href="/modiq"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Mapping
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Completed"
          value={stats.totalMappings}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Items Mapped"
          value={stats.totalItemsMapped}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          }
        />
        <StatCard
          label="Avg Coverage"
          value={`${stats.avgCoverage}%`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          }
        />
        <StatCard
          label="xmap Files"
          value={stats.xmapCount}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  In Progress
                </span>
                <span className="text-xs text-foreground/40">{sourceLabel(activeSession.source_type)}</span>
              </div>
              <p className="font-semibold text-sm truncate">{activeSession.sequence_title}</p>
              <p className="text-xs text-foreground/50 truncate">{activeSession.layout_filename}</p>

              {/* Progress bar */}
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getCoverageBg(activeSession.coverage_percent)}`}
                    style={{ width: `${Math.min(100, activeSession.coverage_percent)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium tabular-nums ${getCoverageColor(activeSession.coverage_percent)}`}>
                  {activeSession.coverage_percent}%
                </span>
              </div>
              <p className="text-[11px] text-foreground/40 mt-1">
                {activeSession.mapped_count} of {activeSession.total_count} items mapped
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/modiq"
                className="px-3 py-1.5 text-sm bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
              >
                Resume
              </Link>
              <button
                type="button"
                onClick={() => handleAbandon(activeSession.id)}
                disabled={abandoningSession === activeSession.id}
                className="px-3 py-1.5 text-sm text-foreground/50 hover:text-foreground border border-border hover:border-foreground/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {abandoningSession === activeSession.id ? "..." : "Discard"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/50 text-foreground placeholder:text-foreground/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/50 text-foreground"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
        </select>
      </div>

      {/* History Table */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-6 text-foreground/40 text-sm">
          {search || statusFilter !== "all"
            ? "No sessions match your filters."
            : "No mapping sessions found."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider border-b border-border">
                <th className="pb-2 pr-4 font-medium">Sequence</th>
                <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Source</th>
                <th className="pb-2 pr-4 font-medium">Coverage</th>
                <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Status</th>
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredHistory.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  xmaps={xmapBySession.get(session.id) ?? []}
                  onDownloadXmap={handleDownloadXmap}
                  onDeleteXmap={handleDeleteXmap}
                  deletingXmap={deletingXmap}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Standalone xmap files (not linked to a session) */}
      {xmapFiles.some((x) => !x.session_id) && (
        <div className="mt-6 pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground/60 mb-3">Standalone xmap Files</h3>
          <div className="space-y-2">
            {xmapFiles
              .filter((x) => !x.session_id)
              .map((xmap) => (
                <div
                  key={xmap.id}
                  className="flex items-center justify-between gap-3 py-2 px-3 bg-background rounded-lg border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{xmap.filename}</p>
                    <p className="text-xs text-foreground/40">
                      {xmap.sequence_title} &middot; {xmap.item_count} items &middot;{" "}
                      {formatDate(xmap.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadXmap(xmap)}
                      className="p-1.5 text-foreground/40 hover:text-accent transition-colors"
                      aria-label="Download xmap"
                      title="Download xmap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteXmap(xmap.id)}
                      disabled={deletingXmap === xmap.id}
                      className="p-1.5 text-foreground/20 hover:text-red-400 transition-colors disabled:opacity-50"
                      aria-label="Delete xmap"
                      title="Delete xmap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-background rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-2 text-foreground/40 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Session Row ─────────────────────────────────────

function SessionRow({
  session,
  xmaps,
  onDownloadXmap,
  onDeleteXmap,
  deletingXmap,
}: {
  session: MappingSessionRow;
  xmaps: XmapFileRow[];
  onDownloadXmap: (xmap: XmapFileRow) => void;
  onDeleteXmap: (id: string) => void;
  deletingXmap: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-foreground/[0.02] transition-colors">
        <td className="py-3 pr-4">
          <div className="min-w-0">
            <p className="font-medium truncate max-w-[200px]">{session.sequence_title}</p>
            <p className="text-xs text-foreground/40 truncate max-w-[200px]">
              {session.layout_filename}
            </p>
          </div>
        </td>
        <td className="py-3 pr-4 hidden sm:table-cell">
          <span className="text-xs text-foreground/50">{sourceLabel(session.source_type)}</span>
        </td>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getCoverageBg(session.coverage_percent)}`}
                style={{ width: `${Math.min(100, session.coverage_percent)}%` }}
              />
            </div>
            <span className={`text-xs font-medium tabular-nums ${getCoverageColor(session.coverage_percent)}`}>
              {session.coverage_percent}%
            </span>
          </div>
          <p className="text-[10px] text-foreground/30 mt-0.5">
            {session.mapped_count}/{session.total_count}
          </p>
        </td>
        <td className="py-3 pr-4 hidden sm:table-cell">
          <StatusBadge status={session.status} />
        </td>
        <td className="py-3 pr-4">
          <p className="text-xs text-foreground/60">{formatDate(session.updated_at)}</p>
          <p className="text-[10px] text-foreground/30">{formatTime(session.updated_at)}</p>
        </td>
        <td className="py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {xmaps.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 text-foreground/40 hover:text-accent transition-colors"
                aria-label={`${xmaps.length} xmap file${xmaps.length > 1 ? "s" : ""}`}
                title={`${xmaps.length} xmap file${xmaps.length > 1 ? "s" : ""}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {xmaps.length > 1 && (
                  <span className="text-[9px] ml-0.5">{xmaps.length}</span>
                )}
              </button>
            )}
            {session.status === "in_progress" && (
              <Link
                href="/modiq"
                className="p-1.5 text-foreground/40 hover:text-accent transition-colors"
                aria-label="Resume mapping"
                title="Resume mapping"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded xmap files */}
      {expanded && xmaps.length > 0 && (
        <tr>
          <td colSpan={6} className="pb-3">
            <div className="ml-4 space-y-1.5">
              {xmaps.map((xmap) => (
                <div
                  key={xmap.id}
                  className="flex items-center justify-between gap-3 py-1.5 px-3 bg-background/50 rounded border border-border/30"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate">{xmap.filename}</span>
                    <span className="text-[10px] text-foreground/30 ml-2">
                      {xmap.item_count} items &middot; {formatDate(xmap.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDownloadXmap(xmap)}
                      className="p-1 text-foreground/40 hover:text-accent transition-colors"
                      aria-label="Download"
                      title="Download"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteXmap(xmap.id)}
                      disabled={deletingXmap === xmap.id}
                      className="p-1 text-foreground/20 hover:text-red-400 transition-colors disabled:opacity-50"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Status Badge ────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400 rounded-full">
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Completed
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          In Progress
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-foreground/5 text-foreground/40 rounded-full">
          {status}
        </span>
      );
  }
}
