"use client";

import { memo } from "react";

interface PhaseCompletionSummaryProps {
  phaseName: string;
  beforeCoveragePercent: number;
  afterCoveragePercent: number;
  effectsGained: number;
  itemsMapped: number;
  onContinue: () => void;
}

/**
 * Celebration screen shown after completing each mapping phase.
 * Shows coverage gain, effects covered, and items mapped.
 * Ticket 39: Progress Tracking Redesign
 */
export default memo(function PhaseCompletionSummary({
  phaseName,
  beforeCoveragePercent,
  afterCoveragePercent,
  effectsGained,
  itemsMapped,
  onContinue,
}: PhaseCompletionSummaryProps) {
  const coverageGain = afterCoveragePercent - beforeCoveragePercent;

  return (
    <div className="max-w-md mx-auto text-center py-8">
      {/* Success icon */}
      <div className="flex justify-center mb-4">
        <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg
            className="h-8 w-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6">{phaseName} Complete!</h2>

      {/* Coverage change */}
      <div className="mb-6">
        <div className="text-3xl font-bold mb-3">
          <span className="text-foreground/50">{beforeCoveragePercent}%</span>
          <span className="mx-2 text-foreground/30">&rarr;</span>
          <span className="text-green-400">{afterCoveragePercent}%</span>
        </div>

        {/* Progress bar showing before → after */}
        <div className="h-3 bg-[#222] rounded-full overflow-hidden mx-auto max-w-xs">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${afterCoveragePercent}%` }}
          />
        </div>
        <p className="text-sm text-foreground/50 mt-2">Display Coverage</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {effectsGained > 0 && (
          <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              +{effectsGained.toLocaleString()}
            </div>
            <div className="text-xs text-foreground/50">effects covered</div>
          </div>
        )}
        <div className="p-3 bg-foreground/5 border border-foreground/10 rounded-lg">
          <div className="text-2xl font-bold">{itemsMapped}</div>
          <div className="text-xs text-foreground/50">items mapped</div>
        </div>
        {coverageGain > 0 && effectsGained <= 0 && (
          <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              +{coverageGain}%
            </div>
            <div className="text-xs text-foreground/50">coverage gained</div>
          </div>
        )}
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="w-full py-3 px-6 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors"
      >
        Continue &rarr;
      </button>
    </div>
  );
});
