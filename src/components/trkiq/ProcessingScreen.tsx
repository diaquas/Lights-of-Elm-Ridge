"use client";

import type {
  PipelineProgress,
  TrkiqPipelineStep,
  SongMetadata,
} from "@/lib/trkiq/types";

interface ProcessingScreenProps {
  pipeline: PipelineProgress[];
  metadata: SongMetadata | null;
}

const STEP_LABELS: Record<TrkiqPipelineStep, string> = {
  decode: "Decoding audio",
  stems: "Separating instruments (AI)",
  analyze: "Analyzing beats & onsets",
  lyrics: "Fetching lyrics & phonemes",
  generate: "Assembling timing tracks",
};

export default function ProcessingScreen({
  pipeline,
  metadata,
}: ProcessingScreenProps) {
  const completed = pipeline.filter(
    (p) => p.status === "done" || p.status === "skipped",
  ).length;
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
          <div key={entry.step} className="flex items-start gap-3">
            <div className="mt-0.5">
              <StepIcon status={entry.status} />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className={`text-sm ${
                  entry.status === "done"
                    ? "text-foreground/50"
                    : entry.status === "active"
                      ? "text-foreground"
                      : entry.status === "skipped"
                        ? "text-foreground/30"
                        : entry.status === "error"
                          ? "text-red-500"
                          : "text-foreground/25"
                }`}
              >
                {STEP_LABELS[entry.step]}
              </span>
              {entry.detail && (
                <p
                  className={`text-xs mt-0.5 ${
                    entry.status === "error"
                      ? "text-red-400/80"
                      : entry.status === "skipped" && entry.detail.includes("—")
                        ? "text-amber-400/70"
                        : "text-foreground/30"
                  }`}
                  title={entry.detail}
                >
                  {entry.detail}
                </p>
              )}
            </div>
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

  if (status === "skipped") {
    return (
      <div className="w-6 h-6 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-3.5 h-3.5 text-foreground/20"
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
