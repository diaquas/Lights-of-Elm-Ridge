"use client";

import { useState, useCallback } from "react";
import type {
  BeatiqSession,
  BeatTrack,
  TrackCategory,
} from "@/lib/beatiq/types";
import {
  generateMultiTrackXtiming,
  buildXtimingFilename,
  downloadXtiming,
} from "@/lib/beatiq/xtiming-generator";

interface EditorScreenProps {
  session: BeatiqSession;
  onReset: () => void;
}

const CATEGORY_LABELS: Record<TrackCategory, string> = {
  drums: "Drums",
  melodic: "Melodic",
  structure: "Structure",
};

const CATEGORY_ORDER: TrackCategory[] = ["drums", "melodic", "structure"];

export default function EditorScreen({ session, onReset }: EditorScreenProps) {
  const { tracks, metadata, stats } = session;
  const [enabledTracks, setEnabledTracks] = useState<Record<string, boolean>>(
    () => Object.fromEntries(tracks.map((t) => [t.id, t.enabled])),
  );
  const [activeCategory, setActiveCategory] = useState<TrackCategory | "all">(
    "all",
  );

  const toggleTrack = useCallback((id: string) => {
    setEnabledTracks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const filteredTracks =
    activeCategory === "all"
      ? tracks
      : tracks.filter((t) => t.category === activeCategory);

  const enabledCount = Object.values(enabledTracks).filter(Boolean).length;

  const handleExport = useCallback(() => {
    if (!metadata) return;

    const tracksToExport = tracks
      .filter((t) => enabledTracks[t.id])
      .map((t) => ({ ...t, enabled: true }));

    if (tracksToExport.length === 0) return;

    const xml = generateMultiTrackXtiming(tracksToExport);
    const filename = buildXtimingFilename(metadata.artist, metadata.title);
    downloadXtiming(xml, filename);
  }, [tracks, enabledTracks, metadata]);

  const handleExportCategory = useCallback(
    (category: TrackCategory) => {
      if (!metadata) return;

      const tracksToExport = tracks
        .filter((t) => t.category === category && enabledTracks[t.id])
        .map((t) => ({ ...t, enabled: true }));

      if (tracksToExport.length === 0) return;

      const xml = generateMultiTrackXtiming(tracksToExport);
      const suffix = CATEGORY_LABELS[category];
      const filename = buildXtimingFilename(
        metadata.artist,
        `${metadata.title}_${suffix}`,
      );
      downloadXtiming(xml, filename);
    },
    [tracks, enabledTracks, metadata],
  );

  return (
    <div className="space-y-6">
      {/* Stats Banner */}
      {stats && metadata && (
        <div className="rounded-xl bg-surface border border-border p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-foreground font-medium">{metadata.title}</p>
              <p className="text-foreground/50 text-sm">{metadata.artist}</p>
            </div>
            <div className="flex gap-4 ml-auto text-sm">
              <StatBadge label="BPM" value={String(stats.bpm)} />
              <StatBadge label="Tracks" value={String(stats.trackCount)} />
              <StatBadge label="Marks" value={String(stats.totalMarks)} />
            </div>
          </div>

          {/* FPS Recommendation */}
          {stats.hasSubFrameEvents && (
            <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm">
              <span className="text-amber-500 font-medium">
                Fast events detected:
              </span>{" "}
              <span className="text-foreground/70">
                Set your xLights sequence to{" "}
                <strong className="text-foreground">
                  {stats.recommendedFps}fps or higher
                </strong>{" "}
                for accurate drum fill resolution.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <TabButton
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        >
          All ({tracks.length})
        </TabButton>
        {CATEGORY_ORDER.map((cat) => {
          const count = tracks.filter((t) => t.category === cat).length;
          if (count === 0) return null;
          return (
            <TabButton
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </TabButton>
          );
        })}
      </div>

      {/* Track List */}
      <div className="rounded-xl bg-surface border border-border divide-y divide-border">
        {filteredTracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            enabled={enabledTracks[track.id]}
            onToggle={() => toggleTrack(track.id)}
          />
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Primary: Download All */}
        <button
          onClick={handleExport}
          disabled={enabledCount === 0}
          className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 ${
            enabledCount > 0
              ? "bg-accent hover:bg-accent-secondary text-white shadow-lg shadow-accent/20"
              : "bg-surface-light text-foreground/30 cursor-not-allowed"
          }`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Download All ({enabledCount} tracks)
        </button>

        {/* Secondary: New Song */}
        <button
          onClick={onReset}
          className="px-6 py-3.5 rounded-xl font-medium bg-surface hover:bg-surface-light text-foreground/50 hover:text-foreground/70 border border-border transition-all duration-200"
        >
          New Song
        </button>
      </div>

      {/* Category Download Buttons */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((cat) => {
          const count = tracks.filter(
            (t) => t.category === cat && enabledTracks[t.id],
          ).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => handleExportCategory(cat)}
              className="px-4 py-2 rounded-lg text-sm bg-surface hover:bg-surface-light text-foreground/50 hover:text-foreground/70 border border-border transition-colors"
            >
              Download {CATEGORY_LABELS[cat]} only
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function TrackRow({
  track,
  enabled,
  onToggle,
}: {
  track: BeatTrack;
  enabled: boolean;
  onToggle: () => void;
}) {
  const markCount = track.marks.length + (track.labeledMarks?.length || 0);
  const categoryColor =
    track.category === "drums"
      ? "text-accent"
      : track.category === "melodic"
        ? "text-blue-400"
        : "text-green-400";

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          enabled
            ? "bg-accent border-accent"
            : "border-foreground/20 hover:border-foreground/40"
        }`}
      >
        {enabled && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium truncate">
          {track.name}
        </p>
        <p className={`text-xs ${categoryColor} opacity-70`}>
          {CATEGORY_LABELS[track.category]}
        </p>
      </div>

      {/* Mark count */}
      <div className="text-right flex-shrink-0">
        <p className="text-foreground/50 text-sm font-mono">{markCount}</p>
        <p className="text-foreground/25 text-xs">
          {track.labeledMarks && track.labeledMarks.length > 0
            ? "sections"
            : "hits"}
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-accent text-white"
          : "bg-surface text-foreground/50 hover:text-foreground/70 hover:bg-surface-light"
      }`}
    >
      {children}
    </button>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-foreground font-mono font-medium">{value}</p>
      <p className="text-foreground/30 text-xs uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
