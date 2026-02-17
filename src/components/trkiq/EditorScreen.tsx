"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  TrkiqSession,
  TrkiqStats,
  BeatTrack,
  TrackCategory,
} from "@/lib/trkiq/types";
import type { VocalTrack } from "@/lib/lyriq/types";
import {
  generateCombinedXtiming,
  buildTrkiqFilename,
  downloadXtiming,
} from "@/lib/trkiq/xtiming-export";

interface EditorScreenProps {
  session: TrkiqSession;
  onReset: () => void;
}

type FilterTab = "all" | "drums" | "melodic" | "structure" | "vocals";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  drums: "Drums",
  melodic: "Melodic",
  structure: "Structure",
  vocals: "Vocals",
};

export default function EditorScreen({ session, onReset }: EditorScreenProps) {
  const { beatTracks, vocalTracks, metadata, beatStats, lyriqStats } = session;

  const [enabledBeats, setEnabledBeats] = useState<Record<string, boolean>>(
    () => Object.fromEntries(beatTracks.map((t) => [t.id, t.enabled])),
  );
  const [enabledVocals, setEnabledVocals] = useState<Record<string, boolean>>(
    () => Object.fromEntries(vocalTracks.map((t, i) => [`vocal-${i}`, true])),
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const toggleBeat = useCallback((id: string) => {
    setEnabledBeats((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleVocal = useCallback((key: string) => {
    setEnabledVocals((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const combined: TrkiqStats = useMemo(
    () => ({
      bpm: beatStats?.bpm || 0,
      instrumentTracks: beatTracks.length,
      vocalTracks: vocalTracks.length,
      totalMarks: beatStats?.totalMarks || 0,
      totalWords: lyriqStats?.totalWords || 0,
      totalPhonemes: lyriqStats?.totalPhonemes || 0,
      durationMs: beatStats?.durationMs || 0,
      usedStems: session.stemsAvailable,
    }),
    [beatTracks, vocalTracks, beatStats, lyriqStats, session.stemsAvailable],
  );

  const filteredBeatTracks =
    activeTab === "all" || activeTab === "vocals"
      ? activeTab === "vocals"
        ? []
        : beatTracks
      : beatTracks.filter((t) => t.category === activeTab);

  const showVocals = activeTab === "all" || activeTab === "vocals";

  const totalEnabled =
    Object.values(enabledBeats).filter(Boolean).length +
    Object.values(enabledVocals).filter(Boolean).length;

  const handleExport = useCallback(() => {
    if (!metadata) return;

    const tracksToExport = beatTracks
      .filter((t) => enabledBeats[t.id])
      .map((t) => ({ ...t, enabled: true }));

    const vocalsToExport = vocalTracks.filter(
      (_, i) => enabledVocals[`vocal-${i}`],
    );

    if (tracksToExport.length === 0 && vocalsToExport.length === 0) return;

    const xml = generateCombinedXtiming(tracksToExport, vocalsToExport);
    const filename = buildTrkiqFilename(metadata.artist, metadata.title);
    downloadXtiming(xml, filename);
  }, [beatTracks, vocalTracks, enabledBeats, enabledVocals, metadata]);

  return (
    <div className="space-y-6">
      {/* Stats Banner */}
      {metadata && (
        <div className="rounded-xl bg-surface border border-border p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-foreground font-medium">{metadata.title}</p>
              <p className="text-foreground/50 text-sm">{metadata.artist}</p>
            </div>
            <div className="flex gap-4 ml-auto text-sm">
              <StatBadge label="BPM" value={String(combined.bpm)} />
              <StatBadge
                label="Tracks"
                value={String(combined.instrumentTracks + combined.vocalTracks)}
              />
              {combined.totalWords > 0 && (
                <StatBadge label="Words" value={String(combined.totalWords)} />
              )}
              <StatBadge label="Marks" value={String(combined.totalMarks)} />
            </div>
          </div>

          {/* Stems indicator */}
          <div className="mt-3 flex gap-2">
            {combined.usedStems ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                AI Stem Separation
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/40 text-xs font-medium">
                Client-side analysis
              </span>
            )}
            {combined.totalWords > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                Singing faces included
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {(
          ["all", "drums", "melodic", "structure", "vocals"] as FilterTab[]
        ).map((tab) => {
          let count = 0;
          if (tab === "all") count = beatTracks.length + vocalTracks.length;
          else if (tab === "vocals") count = vocalTracks.length;
          else count = beatTracks.filter((t) => t.category === tab).length;

          if (count === 0 && tab !== "all") return null;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-accent text-white"
                  : "bg-surface text-foreground/50 hover:text-foreground/70 hover:bg-surface-light"
              }`}
            >
              {TAB_LABELS[tab]} ({count})
            </button>
          );
        })}
      </div>

      {/* Track List */}
      <div className="rounded-xl bg-surface border border-border divide-y divide-border">
        {/* Beat tracks */}
        {filteredBeatTracks.map((track) => (
          <BeatTrackRow
            key={track.id}
            track={track}
            enabled={enabledBeats[track.id]}
            onToggle={() => toggleBeat(track.id)}
          />
        ))}

        {/* Vocal tracks */}
        {showVocals &&
          vocalTracks.map((track, i) => (
            <VocalTrackRow
              key={`vocal-${i}`}
              track={track}
              enabled={enabledVocals[`vocal-${i}`]}
              onToggle={() => toggleVocal(`vocal-${i}`)}
            />
          ))}

        {filteredBeatTracks.length === 0 &&
          !(showVocals && vocalTracks.length > 0) && (
            <div className="px-5 py-8 text-center text-foreground/30 text-sm">
              No tracks in this category
            </div>
          )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExport}
          disabled={totalEnabled === 0}
          className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 ${
            totalEnabled > 0
              ? "bg-accent hover:bg-accent-secondary text-white shadow-lg shadow-accent/20"
              : "bg-surface-light text-foreground/30 cursor-not-allowed"
          }`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Download .xtiming ({totalEnabled} tracks)
        </button>

        <button
          onClick={onReset}
          className="px-6 py-3.5 rounded-xl font-medium bg-surface hover:bg-surface-light text-foreground/50 hover:text-foreground/70 border border-border transition-all duration-200"
        >
          New Song
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<TrackCategory, string> = {
  drums: "Drums",
  melodic: "Melodic",
  structure: "Structure",
};

function BeatTrackRow({
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
      <Checkbox checked={enabled} onToggle={onToggle} />
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium truncate">
          {track.name}
        </p>
        <p className={`text-xs ${categoryColor} opacity-70`}>
          {CATEGORY_LABELS[track.category]}
        </p>
      </div>
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

function VocalTrackRow({
  track,
  enabled,
  onToggle,
}: {
  track: VocalTrack;
  enabled: boolean;
  onToggle: () => void;
}) {
  const wordCount = track.phrases.reduce((sum, p) => sum + p.words.length, 0);
  const phonemeCount = track.phrases.reduce(
    (sum, p) => sum + p.words.reduce((ws, w) => ws + w.phonemes.length, 0),
    0,
  );

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <Checkbox checked={enabled} onToggle={onToggle} />
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium truncate">
          {track.label}
        </p>
        <p className="text-xs text-purple-400 opacity-70">Vocals</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-foreground/50 text-sm font-mono">{wordCount}</p>
        <p className="text-foreground/25 text-xs">
          words / {phonemeCount} phonemes
        </p>
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        checked
          ? "bg-accent border-accent"
          : "border-foreground/20 hover:border-foreground/40"
      }`}
    >
      {checked && (
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
