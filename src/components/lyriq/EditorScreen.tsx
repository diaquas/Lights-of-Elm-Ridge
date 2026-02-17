"use client";

import { useState, useCallback } from "react";
import type { LyriqSession, Phrase, PrestonBlairCode } from "@/lib/lyriq/types";
import {
  generateXtiming,
  generateMultiTrackXtiming,
  buildXtimingFilename,
  downloadXtiming,
} from "@/lib/lyriq";

interface EditorScreenProps {
  session: LyriqSession;
  onReset: () => void;
}

/** Color palette for phoneme categories in the timeline. */
const PHONEME_COLORS: Record<PrestonBlairCode, string> = {
  AI: "bg-amber-500/70",
  O: "bg-orange-500/70",
  E: "bg-yellow-500/70",
  U: "bg-rose-500/70",
  etc: "bg-sky-500/40",
  L: "bg-cyan-500/50",
  WQ: "bg-violet-500/50",
  MBP: "bg-indigo-500/50",
  FV: "bg-blue-500/50",
  rest: "bg-foreground/10",
};

const PHONEME_LABELS: Record<PrestonBlairCode, string> = {
  AI: "Wide open",
  O: "Round open",
  E: "Smile",
  U: "Pucker",
  etc: "Consonant",
  L: "Tongue tip",
  WQ: "Kiss",
  MBP: "Lips closed",
  FV: "Lip bite",
  rest: "Rest",
};

/**
 * Screen 3: Editor — Timeline view with phoneme visualization and export.
 */
export default function EditorScreen({ session, onReset }: EditorScreenProps) {
  const { tracks, stats, metadata } = session;
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [selectedPhraseIdx, setSelectedPhraseIdx] = useState<number | null>(
    null,
  );

  const activeTrack = tracks[activeTrackIdx] ?? null;

  const handleExport = useCallback(() => {
    if (!metadata || tracks.length === 0) return;

    const filename = buildXtimingFilename(metadata.artist, metadata.title);

    if (tracks.length === 1) {
      const xml = generateXtiming(tracks[0]);
      downloadXtiming(xml, filename);
    } else {
      const xml = generateMultiTrackXtiming(tracks);
      downloadXtiming(xml, filename);
    }
  }, [tracks, metadata]);

  return (
    <div className="space-y-6">
      {/* Top bar: track selector + stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Track tabs */}
        <div className="flex gap-2">
          {tracks.map((track, i) => (
            <button
              key={track.type}
              onClick={() => setActiveTrackIdx(i)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  i === activeTrackIdx
                    ? "bg-accent text-white"
                    : "bg-surface text-foreground/50 hover:text-foreground/70 hover:bg-surface-light"
                }
              `}
            >
              {track.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 text-xs text-foreground/40">
            <span>{stats.totalWords} words</span>
            <span className="text-foreground/15">|</span>
            <span>{stats.totalPhonemes} phonemes</span>
            {stats.flaggedWords > 0 && (
              <>
                <span className="text-foreground/15">|</span>
                <span className="text-amber-500">
                  {stats.flaggedWords} flagged
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      {activeTrack && (
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          {/* Timeline header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-foreground/60 text-xs font-medium uppercase tracking-wider">
              Timing Editor
            </h3>
            <span className="text-foreground/30 text-xs">
              {activeTrack.phrases.length} phrases
            </span>
          </div>

          {/* Phrase list */}
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto scrollbar-fade">
            {activeTrack.phrases.map((phrase, phraseIdx) => (
              <PhraseRow
                key={phraseIdx}
                phrase={phrase}
                index={phraseIdx}
                isExpanded={selectedPhraseIdx === phraseIdx}
                onToggle={() =>
                  setSelectedPhraseIdx(
                    selectedPhraseIdx === phraseIdx ? null : phraseIdx,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Phoneme Legend */}
      <PhonemeColorLegend />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExport}
          className="
            flex-1 py-3 rounded-xl bg-accent hover:bg-accent-secondary text-white
            font-semibold text-sm transition-colors shadow-lg shadow-accent/20
          "
          style={{ fontFamily: "var(--font-display)" }}
        >
          Export .xtiming
        </button>
        <button
          onClick={onReset}
          className="
            px-6 py-3 rounded-xl bg-surface hover:bg-surface-light text-foreground/50
            hover:text-foreground/70 font-medium text-sm transition-colors border border-border
          "
        >
          New Song
        </button>
      </div>
    </div>
  );
}

/* ── Phrase Row ──────────────────────────────────────────────────── */

function PhraseRow({
  phrase,
  index,
  isExpanded,
  onToggle,
}: {
  phrase: Phrase;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const timeLabel = formatMs(phrase.startMs);

  return (
    <div>
      {/* Phrase header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-light transition-colors text-left"
      >
        <span className="text-foreground/20 text-xs font-mono w-8 shrink-0 text-right">
          {index + 1}
        </span>
        <span className="text-foreground/20 text-xs font-mono w-16 shrink-0">
          {timeLabel}
        </span>
        <span className="text-foreground/80 text-sm flex-1 truncate">
          {phrase.text}
        </span>
        <svg
          className={`w-4 h-4 text-foreground/20 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Expanded: word + phoneme detail */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Words row */}
          <div className="flex flex-wrap gap-1.5">
            {phrase.words.map((word, wi) => (
              <WordChip
                key={wi}
                text={word.text}
                confidence={word.confidence}
                inDictionary={word.inDictionary}
              />
            ))}
          </div>

          {/* Phoneme timeline */}
          <PhonemeTimeline phrase={phrase} />
        </div>
      )}
    </div>
  );
}

/* ── Word Chip ──────────────────────────────────────────────────── */

function WordChip({
  text,
  confidence,
  inDictionary,
}: {
  text: string;
  confidence: number;
  inDictionary: boolean;
}) {
  const borderColor =
    confidence >= 0.8
      ? "border-green-500/30"
      : confidence >= 0.5
        ? "border-amber-500/30"
        : "border-red-500/30";

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs
        bg-surface-light border ${borderColor} text-foreground/70
      `}
      title={`Confidence: ${Math.round(confidence * 100)}%${!inDictionary ? " (G2P fallback)" : ""}`}
    >
      {text}
      {!inDictionary && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
      )}
    </span>
  );
}

/* ── Phoneme Timeline ───────────────────────────────────────────── */

function PhonemeTimeline({ phrase }: { phrase: Phrase }) {
  const phraseDuration = phrase.endMs - phrase.startMs;
  if (phraseDuration <= 0) return null;

  const allPhonemes = phrase.words.flatMap((w) => w.phonemes);

  return (
    <div className="flex h-8 rounded-lg overflow-hidden bg-background border border-border">
      {allPhonemes.map((p, i) => {
        const widthPct = ((p.endMs - p.startMs) / phraseDuration) * 100;
        return (
          <div
            key={i}
            className={`${PHONEME_COLORS[p.code]} flex items-center justify-center border-r border-background/30 last:border-r-0`}
            style={{
              width: `${widthPct}%`,
              minWidth: widthPct > 3 ? undefined : "2px",
            }}
            title={`${p.code} (${p.arpabet}) ${p.endMs - p.startMs}ms`}
          >
            {widthPct > 5 && (
              <span className="text-[9px] font-mono text-white/80 truncate px-0.5">
                {p.code}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Phoneme Color Legend ────────────────────────────────────────── */

function PhonemeColorLegend() {
  const codes: PrestonBlairCode[] = [
    "AI",
    "O",
    "E",
    "U",
    "MBP",
    "FV",
    "L",
    "WQ",
    "etc",
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {codes.map((code) => (
        <div key={code} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm ${PHONEME_COLORS[code]}`} />
          <span className="text-foreground/30 text-[10px] font-mono">
            {code}
          </span>
          <span className="text-foreground/20 text-[10px]">
            {PHONEME_LABELS[code]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}
