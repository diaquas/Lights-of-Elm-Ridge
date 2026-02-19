"use client";

import { useState, useEffect, useRef } from "react";
import type {
  PipelineProgress,
  PipelineStepStatus,
  PipelineSubPhase,
  TrkiqPipelineStep,
  SongMetadata,
} from "@/lib/trkiq/types";

interface ProcessingScreenProps {
  pipeline: PipelineProgress[];
  metadata: SongMetadata | null;
}

/* ── Step Configuration ──────────────────────────────────────────── */

interface StepConfig {
  label: string;
  activeLabel: string;
  icon: React.ReactNode;
}

const STEP_CONFIG: Record<TrkiqPipelineStep, StepConfig> = {
  decode: {
    label: "Reading your track",
    activeLabel: "Reading your track",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h2l3-9 3 18 3-12 3 6 2-3h4" />
      </svg>
    ),
  },
  stems: {
    label: "Splitting into instruments",
    activeLabel: "Splitting into instruments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    label: "Finding every beat",
    activeLabel: "Finding every beat",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="8" width="4" height="13" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
  },
  lyrics: {
    label: "Aligning vocals",
    activeLabel: "Aligning vocals",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  generate: {
    label: "Assembling your file",
    activeLabel: "Assembling your file",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
};

/* ── Fun Facts (rotate during waits) ─────────────────────────────── */

const FUN_FACTS = [
  "Your .xtiming will have individual kick, snare, and hi-hat tracks \u2014 something that takes hours to mark by hand in xLights.",
  "The AI isolates 6 stems: vocals, drums, bass, guitar, piano, and \u201Cother.\u201D Each gets its own onset analysis.",
  "Singing face phonemes use Preston Blair mouth positions \u2014 the same system Disney animators use.",
  "Most sequences need 800\u20132,000 timing marks. TRK:IQ typically generates these in under 90 seconds.",
  "The lyrics alignment maps every syllable to within ~50ms of when it\u2019s actually sung.",
  "Fun fact: the \u201Ct\u201D key in xLights adds one timing mark. We\u2019re about to save you a few thousand presses.",
  "Each stem is analyzed for onsets, beats, and BPM independently \u2014 then cross-referenced for accuracy.",
  "The phoneme engine converts words \u2192 ARPAbet \u2192 Preston Blair mouth codes, all matched to the audio.",
  "Demucs uses a hybrid transformer/RNN architecture trained on 900+ hours of music to separate stems.",
  "Beat detection runs in parallel across all 5 instrument stems \u2014 the AI is working on your whole song at once.",
];

/* ── Main Component ──────────────────────────────────────────────── */

export default function ProcessingScreen({
  pipeline,
  metadata,
}: ProcessingScreenProps) {
  const [now, setNow] = useState(Date.now());
  const [factIndex, setFactIndex] = useState(() =>
    Math.floor(Math.random() * FUN_FACTS.length),
  );
  const [factFading, setFactFading] = useState(false);
  const factTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate fun facts every 10 seconds
  useEffect(() => {
    factTimerRef.current = setInterval(() => {
      setFactFading(true);
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
        setFactFading(false);
      }, 300);
    }, 10000);
    return () => {
      if (factTimerRef.current) clearInterval(factTimerRef.current);
    };
  }, []);

  const completed = pipeline.filter(
    (p) => p.status === "done" || p.status === "skipped",
  ).length;
  const allDone = completed === pipeline.length;

  // Find first step that started (for total elapsed)
  const firstStarted = pipeline.find((p) => p.startedAt)?.startedAt;
  const totalElapsed = firstStarted ? Math.floor((now - firstStarted) / 1000) : 0;

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Song info */}
      {metadata && (
        <div className="text-center">
          <p className="text-foreground/40 text-sm mb-1">Working on</p>
          <p className="text-foreground font-display font-bold text-lg truncate">
            {metadata.title}
          </p>
          <p className="text-foreground/50 text-sm truncate">
            {metadata.artist}
          </p>
        </div>
      )}

      {/* Vertical Timeline Stepper */}
      <div className="relative">
        {pipeline.map((entry, i) => {
          const config = STEP_CONFIG[entry.step];
          const isLast = i === pipeline.length - 1;
          const elapsed = entry.startedAt
            ? Math.floor((now - entry.startedAt) / 1000)
            : 0;

          return (
            <div key={entry.step} className="relative flex gap-4">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[19px] top-[40px] bottom-0 w-[2px]">
                  <div
                    className={`h-full transition-colors duration-500 ${
                      entry.status === "done"
                        ? "bg-green-500/40"
                        : entry.status === "skipped"
                          ? "bg-foreground/10"
                          : entry.status === "active"
                            ? "bg-accent/30"
                            : entry.status === "error"
                              ? "bg-red-500/30"
                              : "bg-foreground/[0.06]"
                    }`}
                    style={
                      entry.status === "active"
                        ? {
                            background:
                              "linear-gradient(180deg, var(--color-accent) 0%, transparent 100%)",
                            opacity: 0.3,
                          }
                        : undefined
                    }
                  />
                </div>
              )}

              {/* Icon circle */}
              <div className="relative z-10 flex-shrink-0">
                <StepCircle
                  status={entry.status}
                  subPhase={entry.subPhase}
                  icon={config.icon}
                />
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-6"}`}>
                <div className="flex items-center gap-2 min-h-[40px]">
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      entry.status === "done"
                        ? "text-foreground/50"
                        : entry.status === "active"
                          ? "text-foreground"
                          : entry.status === "skipped"
                            ? "text-foreground/30"
                            : entry.status === "error"
                              ? "text-red-400"
                              : "text-foreground/25"
                    }`}
                  >
                    {config.label}
                  </span>

                  {/* Elapsed time badge */}
                  {entry.status === "done" && entry.startedAt && (
                    <span className="text-xs text-foreground/25 tabular-nums font-mono">
                      {formatElapsed(elapsed)}
                    </span>
                  )}
                  {entry.status === "active" && entry.startedAt && (
                    <span className="text-xs text-accent/70 tabular-nums font-mono animate-pulse">
                      {formatElapsed(elapsed)}
                    </span>
                  )}
                </div>

                {/* Detail / sub-status line */}
                {entry.status === "active" && entry.detail && (
                  <div className="mt-0.5 flex items-center gap-2">
                    {entry.subPhase === "queued" && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                    )}
                    <p className={`text-xs ${
                      entry.subPhase === "queued"
                        ? "text-amber-400/70"
                        : "text-foreground/30"
                    }`}>
                      {entry.detail}
                    </p>
                  </div>
                )}

                {/* Skipped / error detail */}
                {entry.status === "skipped" && entry.detail && (
                  <p className="text-xs text-amber-400/60 mt-0.5">
                    {entry.detail}
                  </p>
                )}
                {entry.status === "error" && entry.detail && (
                  <p className="text-xs text-red-400/70 mt-0.5">
                    {entry.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fun fact card */}
      {!allDone && (
        <div className="rounded-xl bg-surface border border-border p-5">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent/50"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <p
              className={`text-sm text-foreground/40 leading-relaxed transition-opacity duration-300 ${
                factFading ? "opacity-0" : "opacity-100"
              }`}
            >
              {FUN_FACTS[factIndex]}
            </p>
          </div>
        </div>
      )}

      {/* Total elapsed + estimate */}
      {firstStarted && (
        <div className="text-center">
          <p className="text-xs text-foreground/20 tabular-nums font-mono">
            {allDone ? (
              <>Completed in {formatElapsed(totalElapsed)}</>
            ) : (
              <>
                Elapsed: {formatElapsed(totalElapsed)}
                <span className="mx-1.5 text-foreground/10">&middot;</span>
                Usually 60&ndash;90s
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Step Circle with Icon ───────────────────────────────────────── */

function StepCircle({
  status,
  subPhase,
  icon,
}: {
  status: PipelineStepStatus;
  subPhase?: PipelineSubPhase;
  icon: React.ReactNode;
}) {
  if (status === "done") {
    return (
      <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center animate-[popIn_0.3s_ease-out]">
        <svg
          className="w-5 h-5 text-green-500"
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
    const isQueued = subPhase === "queued";
    return (
      <div className="relative w-10 h-10">
        {/* Spinning ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 ${
            isQueued
              ? "border-amber-400/30 animate-pulse"
              : "border-accent/40 animate-spin"
          }`}
          style={
            !isQueued
              ? {
                  borderTopColor: "var(--color-accent)",
                  animationDuration: "1.2s",
                }
              : undefined
          }
        />
        {/* Icon */}
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            isQueued ? "text-amber-400" : "text-accent"
          }`}
        >
          {icon}
        </div>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div className="w-10 h-10 rounded-full bg-foreground/[0.04] flex items-center justify-center">
        <svg
          className="w-4.5 h-4.5 text-foreground/20"
          width="18"
          height="18"
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
      <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-red-500"
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

  // Pending — muted icon
  return (
    <div className="w-10 h-10 rounded-full border border-foreground/[0.08] flex items-center justify-center text-foreground/15">
      {icon}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
