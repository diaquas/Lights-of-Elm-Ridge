"use client";

import type { BulkSuggestion } from "@/hooks/useBulkInference";

interface BulkInferenceBannerProps {
  suggestion: BulkSuggestion;
  onAcceptAll: () => void;
  onDismiss: () => void;
}

export function BulkInferenceBanner({
  suggestion,
  onAcceptAll,
  onDismiss,
}: BulkInferenceBannerProps) {
  const preview = suggestion.pairs.slice(0, 4);
  const remaining = suggestion.pairs.length - preview.length;

  return (
    <div className="mx-4 my-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 flex-shrink-0">
      <div className="flex items-start gap-2.5">
        {/* Lightning icon */}
        <svg
          className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-blue-300">
            Pattern Detected
          </p>
          <p className="text-[12px] text-foreground/50 mt-0.5">
            <span className="text-foreground/70">{suggestion.sourceFamily}</span>
            {" \u2192 "}
            <span className="text-foreground/70">{suggestion.destFamily}</span>
            {" \u2014 "}
            {suggestion.pairs.length} more{" "}
            {suggestion.pairs.length === 1 ? "match" : "matches"} found
          </p>

          {/* Preview pairs */}
          <div className="mt-2 space-y-0.5">
            {preview.map((pair) => (
              <div
                key={pair.sourceName}
                className="flex items-center gap-1.5 text-[11px] text-foreground/40"
              >
                <span className="truncate">{pair.sourceName}</span>
                <span className="text-foreground/20 flex-shrink-0">&rarr;</span>
                <span className="truncate text-foreground/50">{pair.destName}</span>
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-[11px] text-foreground/25">
                +{remaining} more
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              onClick={onAcceptAll}
              className="px-3 py-1 text-[12px] font-medium rounded-md bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
            >
              Apply All ({suggestion.pairs.length})
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1 text-[12px] text-foreground/30 hover:text-foreground/50 transition-colors"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
