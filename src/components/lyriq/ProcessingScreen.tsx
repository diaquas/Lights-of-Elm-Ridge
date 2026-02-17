"use client";

import type { PipelineProgress, SongMetadata } from "@/lib/lyriq/types";

interface ProcessingScreenProps {
  pipeline: PipelineProgress[];
  metadata: SongMetadata | null;
}

const STEP_LABELS: Record<string, string> = {
  separating: "Separating vocals",
  "fetching-lyrics": "Fetching lyrics",
  "aligning-lead": "Aligning lead vocals",
  "aligning-background": "Aligning background vocals",
  "generating-phonemes": "Generating phonemes",
  optimizing: "Optimizing timing",
};

/**
 * Screen 2: Processing — Animated pipeline step indicators.
 */
export default function ProcessingScreen({
  pipeline,
  metadata,
}: ProcessingScreenProps) {
  const activeStep = pipeline.find((s) => s.status === "active");
  const completedCount = pipeline.filter((s) => s.status === "done").length;
  const progress = (completedCount / pipeline.length) * 100;

  return (
    <div className="max-w-md mx-auto space-y-8">
      {/* Song info */}
      {metadata && (
        <div className="text-center">
          <p className="text-foreground/50 text-sm">Processing</p>
          <p className="text-foreground font-medium text-lg mt-1">
            {metadata.title}
          </p>
          <p className="text-foreground/40 text-sm">{metadata.artist}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="relative">
        <div className="h-1 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-foreground/30 text-xs mt-2 text-center">
          {completedCount} of {pipeline.length} steps
        </p>
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {pipeline.map((step) => (
          <div
            key={step.step}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
              ${step.status === "active" ? "bg-surface-light" : ""}
            `}
          >
            <StepIcon status={step.status} />
            <span
              className={`text-sm transition-colors duration-300 ${
                step.status === "done"
                  ? "text-foreground/50"
                  : step.status === "active"
                    ? "text-foreground font-medium"
                    : "text-foreground/25"
              }`}
            >
              {STEP_LABELS[step.step] ?? step.step}
            </span>
          </div>
        ))}
      </div>

      {/* Active step highlight */}
      {activeStep && (
        <p className="text-center text-foreground/30 text-xs animate-pulse">
          {STEP_LABELS[activeStep.step]}...
        </p>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  if (status === "done") {
    return (
      <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
        <svg
          className="w-3.5 h-3.5 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
          />
        </svg>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="w-6 h-6 rounded-full border-2 border-accent flex items-center justify-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
        <svg
          className="w-3.5 h-3.5 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </div>
    );
  }

  // pending
  return (
    <div className="w-6 h-6 rounded-full border border-foreground/10 shrink-0" />
  );
}
