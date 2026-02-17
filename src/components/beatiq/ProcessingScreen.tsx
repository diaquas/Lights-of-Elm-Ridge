"use client";

import type {
  PipelineProgress,
  PipelineStep,
  SongMetadata,
} from "@/lib/beatiq/types";

interface ProcessingScreenProps {
  pipeline: PipelineProgress[];
  metadata: SongMetadata | null;
}

const STEP_LABELS: Record<PipelineStep, string> = {
  decode: "Decoding audio",
  spectrum: "Analyzing frequency spectrum",
  tempo: "Detecting tempo & BPM",
  onsets: "Detecting instrument onsets",
  tracks: "Generating timing tracks",
};

export default function ProcessingScreen({
  pipeline,
  metadata,
}: ProcessingScreenProps) {
  const completed = pipeline.filter((p) => p.status === "done").length;
  const progress = (completed / pipeline.length) * 100;

  return (
    <div className="max-w-md mx-auto space-y-8">
      {/* Song info */}
      {metadata && (
        <div className="text-center">
          <p className="text-foreground font-medium truncate">
            {metadata.title}
          </p>
          <p className="text-foreground/50 text-sm truncate">
            {metadata.artist}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div className="h-1 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-foreground/30 text-xs mt-2 text-center">
          {completed} of {pipeline.length} steps complete
        </p>
      </div>

      {/* Step list */}
      <div className="space-y-3">
        {pipeline.map((entry) => (
          <div key={entry.step} className="flex items-center gap-3">
            <StepIcon status={entry.status} />
            <span
              className={`text-sm ${
                entry.status === "done"
                  ? "text-foreground/50"
                  : entry.status === "active"
                    ? "text-foreground"
                    : entry.status === "error"
                      ? "text-red-500"
                      : "text-foreground/25"
              }`}
            >
              {STEP_LABELS[entry.step]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: PipelineProgress["status"] }) {
  if (status === "done") {
    return (
      <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-3.5 h-3.5 text-green-500"
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
    return (
      <div className="w-6 h-6 rounded-full border-2 border-accent/40 flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-3.5 h-3.5 text-red-500"
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

  // pending
  return (
    <div className="w-6 h-6 rounded-full border border-foreground/10 flex-shrink-0" />
  );
}
