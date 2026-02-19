"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  PipelineProgress,
  PipelineStepStatus,
  PipelineSubPhase,
  TrkiqPipelineStep,
  SongMetadata,
  CompletionStats,
} from "@/lib/trkiq/types";

/* ── Props ───────────────────────────────────────────────────────── */

interface ProcessingScreenProps {
  pipeline: PipelineProgress[];
  metadata: SongMetadata | null;
  albumArtUrl: string | null;
  completionStats: CompletionStats | null;
  onReviewDownload?: () => void;
  onNewSong?: () => void;
}

/* ── Step Configuration ──────────────────────────────────────────── */

interface StepConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEP_CONFIG: Record<TrkiqPipelineStep, StepConfig> = {
  decode: {
    title: "Reading your track",
    description: "Learning everything about your audio file before we begin",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12h2l3-9 3 18 3-12 3 6 2-3h4" />
      </svg>
    ),
  },
  stems: {
    title: "Separating instruments",
    description: "AI isolates vocals, drums, bass, guitar, and piano into separate layers",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  analyze: {
    title: "Finding every beat",
    description: "Mapping the tempo, rhythm, and energy of the entire track",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="8" width="4" height="13" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
  },
  lyrics: {
    title: "Syncing the lyrics",
    description: "Matching each word to the exact moment it\u2019s sung",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  generate: {
    title: "Building your timing file",
    description: "Packaging everything into a ready-to-use xLights file",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
};

/* ── Insight Copy (from spec) ────────────────────────────────────── */

const INSIGHTS = [
  { text: "Demucs is an AI model by Meta that can listen to a full mix and pull apart vocals, drums, bass, guitar, and piano \u2014 like unmixing paint.", bold: "Demucs" },
  { text: "Your track is split into 6 overlapping chunks so the AI can process each section carefully and blend them together seamlessly.", bold: "6 overlapping chunks" },
  { text: "Essentia is an open-source audio intelligence toolkit \u2014 it analyzes over 40 different characteristics of your track to nail down tempo, key, and rhythm.", bold: "Essentia" },
  { text: "Beat confidence of 96% means TRK:IQ is almost certain about the tempo \u2014 accurate enough to skip manual tapping for most tracks.", bold: "96%" },
  { text: "Each word in the lyrics is placed within ~50 milliseconds of when it\u2019s actually sung \u2014 that\u2019s more precise than a single frame of video.", bold: "~50 milliseconds" },
  { text: "Your finished file can contain up to 8 timing tracks \u2014 Drums (kick, snare, hi-hat), Vocals, Bass, Guitar, Piano, Beats, Bars, and Song Segments.", bold: "8 timing tracks" },
  { text: "Most light sequences need 800\u20132,000 timing marks. By hand, that\u2019s hours of clicking. TRK:IQ does it in about a minute.", bold: "800\u20132,000 timing marks" },
  { text: "Lyrics are synced by comparing the shape of the singer\u2019s voice against a pronunciation model \u2014 like audio fingerprinting for every word.", bold: "shape of the singer\u2019s voice" },
  { text: "Song Segments detect chorus, verse, bridge, and other sections \u2014 letting you program different lighting moods for each part of the song.", bold: "Song Segments" },
  { text: "The beat grid is verified by comparing each detected hit against a virtual metronome \u2014 ensuring your lights land right on the beat, not a fraction off.", bold: "virtual metronome" },
];

/* ── Overall Progress Calculation ────────────────────────────────── */

const STEP_WEIGHTS: Record<TrkiqPipelineStep, number> = {
  decode: 5,
  stems: 40,
  analyze: 25,
  lyrics: 25,
  generate: 5,
};

function calcOverallProgress(pipeline: PipelineProgress[]): number {
  let total = 0;
  for (const entry of pipeline) {
    const w = STEP_WEIGHTS[entry.step];
    if (entry.status === "done" || entry.status === "skipped") {
      total += w;
    } else if (entry.status === "active" && entry.subProgress != null) {
      total += (w * entry.subProgress) / 100;
    }
  }
  return Math.min(100, Math.round(total));
}

/* ── Main Component ──────────────────────────────────────────────── */

export default function ProcessingScreen({
  pipeline,
  metadata,
  albumArtUrl,
  completionStats,
  onReviewDownload,
  onNewSong,
}: ProcessingScreenProps) {
  const [now, setNow] = useState(() => Date.now());
  const [insightIndex, setInsightIndex] = useState(0);
  const [insightFading, setInsightFading] = useState(false);
  const insightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [artLoaded, setArtLoaded] = useState(false);
  const logEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Tick elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate insights every 7 seconds
  useEffect(() => {
    insightTimerRef.current = setInterval(() => {
      setInsightFading(true);
      setTimeout(() => {
        setInsightIndex((prev) => (prev + 1) % INSIGHTS.length);
        setInsightFading(false);
      }, 400);
    }, 7000);
    return () => {
      if (insightTimerRef.current) clearInterval(insightTimerRef.current);
    };
  }, []);

  const allDone = pipeline.every(
    (p) =>
      p.status === "done" || p.status === "skipped" || p.status === "error",
  );
  const showCompletion = allDone && completionStats !== null;
  const overallPct = showCompletion ? 100 : calcOverallProgress(pipeline);
  const activeStep = pipeline.find((p) => p.status === "active");

  // Find first step that started (for total elapsed)
  const firstStarted = pipeline.find((p) => p.startedAt)?.startedAt;
  const totalElapsed = firstStarted
    ? Math.floor((now - firstStarted) / 1000)
    : 0;

  // Auto-scroll log containers
  const scrollLog = useCallback((step: string) => {
    const el = logEndRefs.current[step];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    if (activeStep) scrollLog(activeStep.step);
  }, [activeStep, activeStep?.logs?.length, scrollLog]);

  // Format duration badge
  const durationStr = metadata?.durationMs
    ? `${Math.floor(metadata.durationMs / 60000)}:${String(Math.floor((metadata.durationMs % 60000) / 1000)).padStart(2, "0")}`
    : null;

  return (
    <div className="relative min-h-[600px]">
      {/* ── Layer 0: Album Art Backdrop ────────────────────── */}
      {albumArtUrl && (
        <div
          className="fixed inset-0 z-0 transition-all duration-[2000ms]"
          style={{
            filter: showCompletion
              ? "blur(100px) saturate(0.15) brightness(0.15)"
              : "blur(90px) saturate(0.25) brightness(0.22)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={albumArtUrl}
            alt=""
            onLoad={() => setArtLoaded(true)}
            className={`w-[130%] h-[130%] object-cover -translate-x-[15%] -translate-y-[15%] transition-opacity duration-[2000ms] ${
              artLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--background)_80%)]" />
        </div>
      )}

      {/* ── Layer 0: Ambient Glow (fallback) ───────────────── */}
      {!albumArtUrl && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-accent/[0.06] blur-[120px] animate-pulse"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/[0.04] blur-[100px] animate-pulse"
            style={{ animationDuration: "12s" }}
          />
        </div>
      )}

      {/* ── Layer 1: Noise Texture ─────────────────────────── */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.035]">
        <svg width="100%" height="100%">
          <filter id="trkiq-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#trkiq-noise)" />
        </svg>
      </div>

      {/* ── Layer 2: Content ───────────────────────────────── */}
      <div className="relative z-[2] max-w-[640px] mx-auto space-y-6">
        {/* ── Track Card ─────────────────────────────────── */}
        {metadata && (
          <div className="relative rounded-xl bg-[#111114] border border-[#222] overflow-hidden">
            {/* Top accent border */}
            <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            <div className="p-5 flex items-center gap-4">
              {/* Album thumb or waveform bars */}
              {albumArtUrl ? (
                <img
                  src={albumArtUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0 animate-[fadeIn_0.8s_ease-out]"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#18181c] flex items-end justify-center gap-[3px] pb-2.5 flex-shrink-0">
                  {[0.5, 0.8, 0.4, 0.9, 0.6].map((h, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-accent/60"
                      style={{
                        height: `${h * 28}px`,
                        animation: showCompletion
                          ? "none"
                          : `trkiq-waveform 1.2s ease-in-out ${i * 0.15}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-[1.5px] text-foreground/30 mb-0.5 font-medium">
                  {showCompletion ? "COMPLETED" : "PROCESSING"}
                </p>
                <p className="text-foreground font-display font-bold text-lg truncate leading-tight">
                  {metadata.title}
                </p>
                <p className="text-foreground/40 text-sm truncate">
                  {metadata.artist}
                </p>
              </div>

              {durationStr && (
                <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#18181c] text-foreground/40 text-xs font-mono tabular-nums">
                  {durationStr}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Overall Progress Bar ───────────────────────── */}
        {!showCompletion && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-[trkiq-dot-pulse_2s_infinite]" />
                <span className="text-foreground/40">
                  {activeStep
                    ? STEP_CONFIG[activeStep.step].title
                    : "Initializing\u2026"}
                </span>
              </div>
              <span className="text-foreground/30 font-mono tabular-nums">
                {overallPct}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-[#18181c] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-600 ease-out relative"
                style={{
                  width: `${overallPct}%`,
                  background:
                    "linear-gradient(90deg, #991f1f, var(--accent-primary), #ff4444)",
                }}
              >
                {/* Scrubber dot */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#ff4444] shadow-[0_0_8px_rgba(255,68,68,0.5)]" />
              </div>
            </div>
          </div>
        )}

        {/* ── Step List ──────────────────────────────────── */}
        {!showCompletion && (
          <div className="relative space-y-0">
            {pipeline.map((entry, i) => {
              const config = STEP_CONFIG[entry.step];
              const isLast = i === pipeline.length - 1;
              const elapsed = entry.startedAt
                ? Math.floor((now - entry.startedAt) / 1000)
                : 0;
              const isActive = entry.status === "active";
              const isDone = entry.status === "done";
              const isSkipped = entry.status === "skipped";
              const isQueue = isActive && entry.subPhase === "queued";
              const logs = entry.logs ?? [];

              return (
                <div key={entry.step} className="relative flex gap-3.5">
                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className="absolute left-[15px] top-[32px] bottom-0 w-[2px] transition-colors duration-500"
                      style={{
                        backgroundColor: isDone
                          ? "rgba(34, 197, 94, 0.2)"
                          : isActive
                            ? "transparent"
                            : isSkipped
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(255,255,255,0.03)",
                        ...(isActive
                          ? {
                              backgroundImage:
                                "linear-gradient(180deg, var(--accent-primary), rgba(255,255,255,0.03))",
                            }
                          : {}),
                      }}
                    />
                  )}

                  {/* Icon */}
                  <div className="relative z-10 flex-shrink-0 mt-0.5">
                    <StepIcon
                      status={entry.status}
                      subPhase={entry.subPhase}
                      icon={config.icon}
                    />
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 ${isLast ? "pb-2" : "pb-4"}`}>
                    {/* Title row */}
                    <div className="flex items-center gap-2 min-h-[32px] flex-wrap">
                      <span
                        className={`text-[15px] font-display font-semibold transition-colors duration-300 ${
                          isDone
                            ? "text-foreground/50"
                            : isActive
                              ? "text-foreground"
                              : isSkipped
                                ? "text-foreground/25"
                                : entry.status === "error"
                                  ? "text-red-400"
                                  : "text-foreground/20"
                        }`}
                      >
                        {config.title}
                      </span>

                      {/* Time badge */}
                      {entry.startedAt && (isDone || isActive) && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${
                            isActive
                              ? "bg-accent/10 text-accent"
                              : "text-foreground/20"
                          }`}
                        >
                          {formatElapsed(elapsed)}
                        </span>
                      )}

                      {/* Queue badge */}
                      {isQueue && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-400/20 bg-amber-400/5 text-amber-400 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          In queue
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {isActive && (
                      <p className="text-[13px] text-foreground/30 mt-0.5">
                        {config.description}
                      </p>
                    )}

                    {/* Skipped / error detail */}
                    {isSkipped && entry.detail && (
                      <p className="text-xs text-amber-400/60 mt-0.5">
                        {entry.detail}
                      </p>
                    )}
                    {entry.status === "error" && entry.detail && (
                      <p className="text-xs text-red-400/70 mt-0.5">
                        {entry.detail}
                      </p>
                    )}

                    {/* Detail area (active only) */}
                    {isActive && (
                      <div
                        className="mt-2 overflow-hidden transition-all duration-500"
                        style={{ maxHeight: "300px", opacity: 1 }}
                      >
                        {/* Sub-progress bar */}
                        {entry.subProgress != null && (
                          <div className="mb-2 flex items-center gap-2">
                            <div className="flex-1 h-[3px] rounded-full bg-[#18181c] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${entry.subProgress}%`,
                                  backgroundColor: isQueue
                                    ? "#d4a24e"
                                    : "var(--accent-primary)",
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-mono tabular-nums text-foreground/20">
                              {entry.subProgress}%
                            </span>
                          </div>
                        )}

                        {/* Log lines */}
                        {logs.length > 0 && (
                          <div className="relative max-h-[88px] overflow-y-auto rounded bg-[#0d0d0f] border border-[#1a1a1d] px-3 py-2 text-[12px] font-mono leading-relaxed scrollbar-thin">
                            {logs.map((line, li) => {
                              const isLast = li === logs.length - 1;
                              const isCheck = line.startsWith("\u2713");
                              return (
                                <div
                                  key={li}
                                  className="animate-[trkiq-log-in_0.3s_ease-out]"
                                  style={{
                                    color: isCheck
                                      ? "#22c55e"
                                      : "rgba(138,134,144,0.7)",
                                  }}
                                >
                                  <span
                                    className="mr-1.5"
                                    style={{
                                      color: isCheck
                                        ? "#22c55e"
                                        : "rgba(138,134,144,0.35)",
                                    }}
                                  >
                                    {isCheck ? "\u2713" : "\u203A"}
                                  </span>
                                  {isCheck ? line.slice(2) : line}
                                  {isLast && (
                                    <div
                                      ref={(el: HTMLDivElement | null) => {
                                        logEndRefs.current[entry.step] = el;
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                            {/* Fade gradient at bottom */}
                            <div className="sticky bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#0d0d0f] to-transparent pointer-events-none" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Done: show final log line */}
                    {isDone && logs.length > 0 && (
                      <p className="text-[12px] font-mono text-green-500/60 mt-0.5">
                        {logs[logs.length - 1]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Insight Card ("Under the Hood") ────────────── */}
        {!showCompletion && (
          <div className="rounded-xl bg-[#111114] border border-[#222] px-5 py-4 border-l-2 border-l-accent/40">
            <div className="flex items-start gap-3">
              <span className="text-sm flex-shrink-0 mt-0.5" aria-hidden>
                &#9889;
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-foreground/20 mb-1.5 font-semibold">
                  UNDER THE HOOD
                </p>
                <p
                  className={`text-sm text-foreground/40 leading-relaxed transition-all duration-400 ${
                    insightFading
                      ? "opacity-0 translate-y-1"
                      : "opacity-100 translate-y-0"
                  }`}
                >
                  <InsightText insight={INSIGHTS[insightIndex]} />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Timing Footer ──────────────────────────────── */}
        {!showCompletion && firstStarted && (
          <div className="text-center space-y-1 pb-4">
            <div className="flex items-center justify-center gap-6 text-sm font-mono tabular-nums text-foreground/25">
              <span>Elapsed: {formatElapsed(totalElapsed)}</span>
              <span>Est. total: ~5:30</span>
            </div>
            <p className="text-xs text-foreground/15">
              Manual sequencing would take{" "}
              <span className="text-green-500/70 font-semibold">4&ndash;6 hours</span>
              {" "}&mdash; you&rsquo;re saving 99% of that.
            </p>
          </div>
        )}

        {/* ── Completion Banner ───────────────────────────── */}
        {showCompletion && completionStats && (
          <div className="animate-[fadeIn_0.5s_ease-out] space-y-6 py-4">
            {/* Check icon */}
            <div className="flex justify-center">
              <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 flex items-center justify-center animate-[popIn_0.6s_ease-out]">
                <svg
                  className="w-9 h-9 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-[22px] font-display font-bold text-foreground">
                Timing tracks ready
              </h2>
              <p className="text-sm text-foreground/40 mt-1">
                {completionStats.trackCount} timing tracks generated with{" "}
                {completionStats.totalMarks.toLocaleString()} marks
              </p>
            </div>

            {/* Stats row */}
            <div className="flex justify-center gap-10">
              <CompletionStat
                label="Total time"
                value={formatElapsed(completionStats.totalTimeS)}
              />
              <CompletionStat
                label="Timing marks"
                value={completionStats.totalMarks.toLocaleString()}
              />
              <CompletionStat
                label="Tracks"
                value={String(completionStats.trackCount)}
              />
            </div>

            {/* Review & Download button */}
            {onReviewDownload && (
              <div className="flex justify-center">
                <button
                  onClick={onReviewDownload}
                  className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-display font-semibold text-[15px] text-white transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent-primary), #ff4444)",
                    boxShadow: "0 4px 20px rgba(230, 51, 51, 0.3)",
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4" />
                  </svg>
                  Review &amp; Download
                </button>
              </div>
            )}

            {/* New song link */}
            {onNewSong && (
              <div className="text-center">
                <button
                  onClick={onNewSong}
                  className="text-sm text-foreground/30 hover:text-foreground/50 transition-colors"
                >
                  Process another song
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step Icon ───────────────────────────────────────────────────── */

function StepIcon({
  status,
  subPhase,
  icon,
}: {
  status: PipelineStepStatus;
  subPhase?: PipelineSubPhase;
  icon: React.ReactNode;
}) {
  const size = "w-8 h-8";

  if (status === "done") {
    return (
      <div
        className={`${size} rounded-full border border-green-500/30 flex items-center justify-center animate-[popIn_0.3s_ease-out]`}
      >
        <svg
          className="w-4 h-4 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    );
  }

  if (status === "active") {
    const isQueue = subPhase === "queued";
    return (
      <div className={`relative ${size}`}>
        {/* Spinner ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 ${
            isQueue ? "border-amber-400/20 animate-pulse" : "border-accent/30"
          }`}
          style={
            !isQueue
              ? {
                  borderTopColor: "var(--accent-primary)",
                  animation: "spin 0.8s linear infinite",
                }
              : undefined
          }
        />
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-full animate-[trkiq-icon-pulse_2.5s_infinite]"
          style={{
            boxShadow: isQueue
              ? "0 0 12px rgba(212, 162, 78, 0.15)"
              : "0 0 12px rgba(230, 51, 51, 0.2)",
          }}
        />
        {/* Icon */}
        <div
          className={`absolute inset-0 flex items-center justify-center ${isQueue ? "text-amber-400" : "text-accent"}`}
        >
          {icon}
        </div>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div
        className={`${size} rounded-full bg-[#18181c] flex items-center justify-center`}
      >
        <svg
          className="w-3.5 h-3.5 text-foreground/15"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={`${size} rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center`}
      >
        <svg
          className="w-4 h-4 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
    );
  }

  // Pending
  return (
    <div
      className={`${size} rounded-full bg-[#18181c] border border-[#2a2a2a] flex items-center justify-center text-foreground/15`}
    >
      {icon}
    </div>
  );
}

/* ── Insight Text with Bold ──────────────────────────────────────── */

function InsightText({ insight }: { insight: { text: string; bold: string } }) {
  const idx = insight.text.indexOf(insight.bold);
  if (idx === -1) return <>{insight.text}</>;
  return (
    <>
      {insight.text.slice(0, idx)}
      <strong className="text-foreground/70">{insight.bold}</strong>
      {insight.text.slice(idx + insight.bold.length)}
    </>
  );
}

/* ── Completion Stat ─────────────────────────────────────────────── */

function CompletionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[28px] font-display font-extrabold text-foreground tabular-nums">
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-[1.5px] text-foreground/25 mt-0.5">
        {label}
      </p>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
