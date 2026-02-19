"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  TrkiqSession,
  TrkiqStats,
  BeatTrack,
  TrackCategory,
  TrackSource,
} from "@/lib/trkiq/types";
import type { VocalTrack, VocalSource } from "@/lib/lyriq/types";
import {
  generateCombinedXtiming,
  buildTrkiqFilename,
  downloadXtiming,
} from "@/lib/trkiq/xtiming-export";

interface EditorScreenProps {
  session: TrkiqSession;
  onReset: () => void;
}

type FilterTab = "all" | "drums" | "melodic" | "structure" | "singing-faces";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  drums: "Drums",
  melodic: "Melodic",
  structure: "Structure",
  "singing-faces": "Singing Faces",
};

export default function EditorScreen({ session, onReset }: EditorScreenProps) {
  const { beatTracks, vocalTracks, metadata, beatStats, lyriqStats, lyrics } =
    session;

  const [enabledBeats, setEnabledBeats] = useState<Record<string, boolean>>(
    () => Object.fromEntries(beatTracks.map((t) => [t.id, t.enabled])),
  );
  const [enabledVocals, setEnabledVocals] = useState<Record<string, boolean>>(
    () => Object.fromEntries(vocalTracks.map((t, i) => [`vocal-${i}`, true])),
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showLyrics, setShowLyrics] = useState(false);

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
      usedStems: session.usedStems,
      usedEssentia: session.usedEssentia,
    }),
    [
      beatTracks,
      vocalTracks,
      beatStats,
      lyriqStats,
      session.usedStems,
      session.usedEssentia,
    ],
  );

  const filteredBeatTracks =
    activeTab === "all" || activeTab === "singing-faces"
      ? activeTab === "singing-faces"
        ? []
        : beatTracks
      : beatTracks.filter((t) => t.category === activeTab);

  const showVocals = activeTab === "all" || activeTab === "singing-faces";

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
              <div className="flex items-center gap-2.5 mb-0.5">
                <span className="text-[15px] font-display font-bold tracking-tight leading-none">
                  <span className="text-foreground">TRK</span>
                  <span className="text-accent">:</span>
                  <span className="text-accent">IQ</span>
                </span>
                <span className="w-px h-4 bg-border" />
                <p className="text-foreground font-medium">{metadata.title}</p>
              </div>
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
            {combined.usedEssentia ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Essentia Beat Detection
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/40 text-xs font-medium">
                Fallback Beat Detection
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
          [
            "all",
            "drums",
            "melodic",
            "structure",
            "singing-faces",
          ] as FilterTab[]
        ).map((tab) => {
          let count = 0;
          if (tab === "all") count = beatTracks.length + vocalTracks.length;
          else if (tab === "singing-faces") count = vocalTracks.length;
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

      {/* Lyrics Preview */}
      {lyrics && lyrics.plainText.trim().length > 0 && (
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-4 h-4 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-foreground/70 text-sm font-medium">
                Lyrics{" "}
                <span className="text-foreground/30 font-normal">
                  (from{" "}
                  {lyrics.source === "lrclib"
                    ? "LRCLIB"
                    : lyrics.source === "user"
                      ? "your input"
                      : "auto-fetch"}
                  )
                </span>
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-foreground/30 transition-transform ${showLyrics ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showLyrics && (
            <div className="px-5 pb-4 border-t border-border pt-3">
              <pre className="text-foreground/60 text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {lyrics.plainText}
              </pre>
              {lyrics.syncedLines && lyrics.syncedLines.length > 0 && (
                <p className="text-foreground/25 text-xs mt-3">
                  {lyrics.syncedLines.length} synced lines available
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
  const label =
    track.labeledMarks && track.labeledMarks.length > 0 ? "sections" : "hits";

  return (
    <div className="flex items-center gap-3 px-5 py-2">
      <Checkbox checked={enabled} onToggle={onToggle} />
      <span className="text-foreground text-sm font-medium truncate flex-1 min-w-0">
        {track.name}
      </span>
      <SourceBadge
        source={track.source}
        confidenceRange={track.confidenceRange}
        kind="beat"
      />
      <span
        className={`text-xs ${categoryColor} opacity-70 flex-shrink-0 hidden sm:inline`}
      >
        {CATEGORY_LABELS[track.category]}
      </span>
      <HitBadge count={markCount} label={label} />
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
    <div className="flex items-center gap-3 px-5 py-2">
      <Checkbox checked={enabled} onToggle={onToggle} />
      <span className="text-foreground text-sm font-medium truncate flex-1 min-w-0">
        {track.label}
      </span>
      <SourceBadge
        source={track.source}
        confidenceRange={track.confidenceRange}
        kind="vocal"
      />
      <span className="text-xs text-purple-400 opacity-70 flex-shrink-0 hidden sm:inline">
        Singing Faces
      </span>
      <HitBadge count={wordCount} label="words" />
      <HitBadge count={phonemeCount} label="phonemes" />
    </div>
  );
}

function formatConfidence(range?: [number, number]): string {
  if (!range) return "";
  const lo = Math.round(range[0] * 100);
  const hi = Math.round(range[1] * 100);
  return lo === hi ? `${lo}%` : `${lo}–${hi}%`;
}

function SourceBadge({
  source,
  confidenceRange,
  kind,
}: {
  source?: TrackSource | VocalSource;
  confidenceRange?: [number, number];
  kind: "beat" | "vocal";
}) {
  if (!source) return null;

  const confLabel = formatConfidence(confidenceRange);
  const avg = confidenceRange
    ? (confidenceRange[0] + confidenceRange[1]) / 2
    : 0;

  // Color based on source type and confidence level
  let color: { text: string; bg: string; border: string; dot: string };
  let label: string;

  if (source === "ai") {
    label = "AI";
    if (avg >= 0.7) {
      color = {
        text: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        dot: "bg-green-400",
      };
    } else {
      color = {
        text: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        dot: "bg-amber-400",
      };
    }
  } else if (source === "local") {
    label = "Local";
    color = {
      text: "text-foreground/50",
      bg: "bg-foreground/5",
      border: "border-foreground/10",
      dot: "bg-foreground/40",
    };
  } else if (source === "synced") {
    label = kind === "vocal" ? "Synced" : "Local";
    color = {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      dot: "bg-amber-400",
    };
  } else {
    label = "Est.";
    color = {
      text: "text-red-400/70",
      bg: "bg-red-500/5",
      border: "border-red-500/10",
      dot: "bg-red-400/60",
    };
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${color.bg} ${color.border} ${color.text} flex-shrink-0`}
      title={`Source: ${source}${confLabel ? ` | Confidence: ${confLabel}` : ""}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
      {label}
      {confLabel && (
        <span className="opacity-70 tabular-nums">{confLabel}</span>
      )}
    </span>
  );
}

function getHitColor(count: number) {
  if (count >= 500)
    return {
      text: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    };
  if (count >= 50)
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    };
  if (count >= 10)
    return {
      text: "text-foreground/50",
      bg: "bg-foreground/5",
      border: "border-foreground/10",
    };
  return {
    text: "text-red-400/70",
    bg: "bg-red-500/5",
    border: "border-red-500/10",
  };
}

function HitBadge({ count, label }: { count: number; label: string }) {
  const { text, bg, border } = getHitColor(count);
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium tabular-nums border ${bg} ${border} ${text} flex-shrink-0`}
      title={`${count.toLocaleString()} ${label}`}
    >
      <svg
        className="w-2 h-2 opacity-70"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {display} {label}
    </span>
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
