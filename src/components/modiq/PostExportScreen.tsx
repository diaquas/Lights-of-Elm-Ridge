"use client";

import { useState } from "react";

type SurveyRating = "great" | "okay" | "rough" | null;

interface PostExportScreenProps {
  sequenceTitle: string;
  fileName: string;
  onDownloadAgain: () => void;
  onMapAnother: () => void;
  skippedCount: number;
}

export default function PostExportScreen({
  sequenceTitle,
  fileName,
  onDownloadAgain,
  onMapAnother,
  skippedCount,
}: PostExportScreenProps) {
  const [surveyRating, setSurveyRating] = useState<SurveyRating>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [shareData, setShareData] = useState(false);

  const handleSurveySubmit = (rating: SurveyRating) => {
    setSurveyRating(rating);
    setSurveySubmitted(true);
    // Future: send to telemetry endpoint
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Success message */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold">Mapping exported!</h2>
        <p className="text-foreground/60">
          <span className="font-mono text-sm bg-surface-light px-2 py-1 rounded">
            {fileName}
          </span>{" "}
          saved to your downloads.
        </p>
        {skippedCount > 0 && (
          <p className="text-sm text-foreground/40">
            {skippedCount} model{skippedCount !== 1 ? "s" : ""} were skipped and
            won&apos;t receive effects.
          </p>
        )}
      </div>

      {/* How to import */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="font-display font-semibold mb-3">
          How to import into xLights
        </h3>
        <ol className="text-sm text-foreground/60 space-y-2 list-decimal list-inside">
          <li>Open xLights</li>
          <li>Open or create your sequence</li>
          <li>
            <strong>File &rarr; Import Effects</strong> &rarr; select the
            purchased sequence file
          </li>
          <li>
            In the mapping dialog, click <strong>Load Mapping</strong>
          </li>
          <li>Select the .xmap file you just downloaded</li>
          <li>Review and click OK</li>
        </ol>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onDownloadAgain}
          className="flex-1 py-4 rounded-xl font-display font-bold text-lg bg-surface border border-border hover:bg-surface-light text-foreground transition-all"
        >
          Download Again
        </button>
        <button
          onClick={onMapAnother}
          className="flex-1 py-4 rounded-xl font-display font-bold text-lg bg-accent hover:bg-accent/90 text-white transition-all"
        >
          Map Another Sequence
        </button>
      </div>

      {/* Survey */}
      <div className="bg-surface rounded-xl border border-border p-6 text-center">
        {!surveySubmitted ? (
          <>
            <h3 className="font-display font-semibold mb-4">
              How was the auto-mapping?
            </h3>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleSurveySubmit("great")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl hover:bg-surface-light transition-colors"
              >
                <span className="text-2xl">&#x1F60A;</span>
                <span className="text-xs text-foreground/50">
                  Great, barely changed anything
                </span>
              </button>
              <button
                onClick={() => handleSurveySubmit("okay")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl hover:bg-surface-light transition-colors"
              >
                <span className="text-2xl">&#x1F610;</span>
                <span className="text-xs text-foreground/50">
                  Okay, fixed a few things
                </span>
              </button>
              <button
                onClick={() => handleSurveySubmit("rough")}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl hover:bg-surface-light transition-colors"
              >
                <span className="text-2xl">&#x1F615;</span>
                <span className="text-xs text-foreground/50">
                  Rough, had to fix a lot
                </span>
              </button>
            </div>
            <button
              onClick={() => setSurveySubmitted(true)}
              className="mt-3 text-xs text-foreground/30 hover:text-foreground/50"
            >
              Skip
            </button>
          </>
        ) : (
          <div className="space-y-2">
            {surveyRating ? (
              <p className="text-sm text-foreground/60">
                Thanks for your feedback! This helps us improve ModIQ.
              </p>
            ) : (
              <p className="text-sm text-foreground/40">Survey skipped</p>
            )}
          </div>
        )}
      </div>

      {/* Share data opt-in */}
      <div className="flex items-center justify-center gap-2 text-sm text-foreground/40 pb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={shareData}
            onChange={(e) => setShareData(e.target.checked)}
            className="rounded border-border"
          />
          <span>Help improve ModIQ: Share anonymous mapping data</span>
        </label>
      </div>
    </div>
  );
}
