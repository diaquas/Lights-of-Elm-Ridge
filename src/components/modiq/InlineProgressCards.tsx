"use client";

import { memo } from "react";
import type { ProgressTrackerState } from "@/hooks/useProgressTracker";

interface InlineProgressCardsProps {
  state: ProgressTrackerState;
  /** Variant controls layout: "auto-match" shows starting point, "review" shows final summary */
  variant: "auto-match" | "review";
}

/**
 * Full-size inline progress cards shown on the Auto-Match and Review phases.
 * These are the "bookend" displays that the compact header tracker lives between.
 *
 * On Auto-Match: shows the initial coverage from auto-matching.
 * On Review: shows the final coverage with completion messages.
 */
export const InlineProgressCards = memo(function InlineProgressCards({
  state,
  variant,
}: InlineProgressCardsProps) {
  const isReview = variant === "review";

  const displayBarColor =
    state.display.percent >= 80 ? "bg-green-500" : "bg-yellow-500";
  const displayTextColor =
    state.display.percent >= 80 ? "text-green-400" : "text-yellow-400";
  const displayBorderColor =
    state.display.percent >= 80
      ? "border-green-500/30 bg-green-500/5"
      : "border-border bg-surface";
  const effectsBarColor =
    state.effects.percent >= 70 ? "bg-blue-500" : "bg-yellow-500";
  const effectsTextColor =
    state.effects.percent >= 70 ? "text-blue-400" : "text-yellow-400";
  const effectsBorderColor =
    state.effects.percent >= 70
      ? "border-blue-500/30 bg-blue-500/5"
      : "border-border bg-surface";

  return (
    <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
      {/* Display Coverage Card */}
      <div
        className={`rounded-xl border p-6 text-center transition-all duration-500 ${displayBorderColor}`}
      >
        <div className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">
          Your Display
        </div>
        <div className={`text-5xl font-bold ${displayTextColor} mb-3`}>
          {state.display.percent}%
        </div>
        <div className="h-2.5 bg-foreground/10 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${displayBarColor}`}
            style={{ width: `${state.display.percent}%` }}
          />
        </div>
        <div className="text-sm text-foreground/50">
          {state.display.current} of {state.display.total} models active
        </div>
        {isReview && state.display.percent >= 90 && (
          <div className="text-[12px] text-green-400 mt-2 font-medium">
            Excellent coverage!
          </div>
        )}
        {isReview && state.display.percent >= 70 && state.display.percent < 90 && (
          <div className="text-[12px] text-yellow-400 mt-2 font-medium">
            Good coverage
          </div>
        )}
      </div>

      {/* Effects Coverage Card */}
      <div
        className={`rounded-xl border p-6 text-center transition-all duration-500 ${effectsBorderColor}`}
      >
        <div className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">
          Sequence Effects
        </div>
        <div className={`text-5xl font-bold ${effectsTextColor} mb-3`}>
          {state.effects.percent}%
        </div>
        <div className="h-2.5 bg-foreground/10 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${effectsBarColor}`}
            style={{ width: `${state.effects.percent}%` }}
          />
        </div>
        <div className="text-sm text-foreground/50">
          {state.effects.current.toLocaleString()} of{" "}
          {state.effects.total.toLocaleString()} effects
        </div>
        {isReview && state.effects.percent >= 80 && (
          <div className="text-[12px] text-blue-400 mt-2 font-medium">
            Great effect capture!
          </div>
        )}
        {isReview && state.effects.percent >= 50 && state.effects.percent < 80 && (
          <div className="text-[12px] text-yellow-400 mt-2 font-medium">
            Good coverage
          </div>
        )}
      </div>
    </div>
  );
});
