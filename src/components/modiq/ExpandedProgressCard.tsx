"use client";

import { memo } from "react";
import type { ProgressTrackerState } from "@/hooks/useProgressTracker";

interface ExpandedProgressCardProps {
  state: ProgressTrackerState;
  onClickDetails: () => void;
}

/**
 * Expanded hover card that drops down from the CompactProgressTracker.
 * Shows full progress bars, gains since auto-match, and a link to the details modal.
 */
export const ExpandedProgressCard = memo(function ExpandedProgressCard({
  state,
  onClickDetails,
}: ExpandedProgressCardProps) {
  const displayBarColor =
    state.display.percent >= 80 ? "bg-green-500" : "bg-yellow-500";
  const displayTextColor =
    state.display.percent >= 80 ? "text-green-400" : "text-yellow-400";
  const effectsBarColor =
    state.effects.percent >= 70 ? "bg-blue-500" : "bg-yellow-500";
  const effectsTextColor =
    state.effects.percent >= 70 ? "text-blue-400" : "text-yellow-400";

  return (
    <div
      role="tooltip"
      className="absolute top-full mt-2 right-0 w-80 bg-background border border-border rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Full Progress Bars */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Display Coverage */}
        <div className="text-center">
          <div className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-1">
            Your Display
          </div>
          <div className={`text-2xl font-bold ${displayTextColor}`}>
            {state.display.percent}%
          </div>
          <div className="h-2 bg-foreground/10 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${displayBarColor}`}
              style={{ width: `${state.display.percent}%` }}
            />
          </div>
          <div className="text-xs text-foreground/40 mt-1">
            {state.display.current} of {state.display.total} models
          </div>
        </div>

        {/* Effects Coverage */}
        <div className="text-center">
          <div className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-1">
            Sequence Effects
          </div>
          <div className={`text-2xl font-bold ${effectsTextColor}`}>
            {state.effects.percent}%
          </div>
          <div className="h-2 bg-foreground/10 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${effectsBarColor}`}
              style={{ width: `${state.effects.percent}%` }}
            />
          </div>
          <div className="text-xs text-foreground/40 mt-1">
            {state.effects.current.toLocaleString()} of{" "}
            {state.effects.total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Gains Since Auto-Match */}
      {(state.gains.displayModels > 0 || state.gains.effectsCount > 0) && (
        <div className="bg-foreground/5 rounded-lg p-3 mb-3">
          <div className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-2">
            Since Auto-Match:
          </div>
          <div className="flex justify-between text-sm">
            {state.gains.displayModels > 0 && (
              <span className="text-green-400">
                +{state.gains.displayModels} models (+{state.gains.displayPercent}%)
              </span>
            )}
            {state.gains.effectsCount > 0 && (
              <span className="text-blue-400">
                +{state.gains.effectsCount.toLocaleString()} effects (+
                {state.gains.effectsPercent}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Items Mapped Summary */}
      <div className="space-y-1.5 mb-3">
        {state.itemsMapped.groups.total > 0 && (
          <MiniBar
            label="Groups"
            mapped={state.itemsMapped.groups.mapped}
            total={state.itemsMapped.groups.total}
            percent={state.itemsMapped.groups.percent}
          />
        )}
        {state.itemsMapped.models.total > 0 && (
          <MiniBar
            label="Models"
            mapped={state.itemsMapped.models.mapped}
            total={state.itemsMapped.models.total}
            percent={state.itemsMapped.models.percent}
          />
        )}
        {state.itemsMapped.submodelGroups.total > 0 && (
          <MiniBar
            label="Submodel Groups"
            mapped={state.itemsMapped.submodelGroups.mapped}
            total={state.itemsMapped.submodelGroups.total}
            percent={state.itemsMapped.submodelGroups.percent}
          />
        )}
      </div>

      {/* Click for More */}
      <button
        type="button"
        onClick={onClickDetails}
        className="w-full text-xs text-accent hover:text-accent/80 text-center py-1 transition-colors"
      >
        Click for detailed breakdown &rarr;
      </button>
    </div>
  );
});

function MiniBar({
  label,
  mapped,
  total,
  percent,
}: {
  label: string;
  mapped: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-foreground/50 w-28 truncate">
        {label}:
      </span>
      <span className="text-xs font-bold text-foreground/70 tabular-nums w-12">
        {mapped}/{total}
      </span>
      <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent/60 rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-foreground/40 tabular-nums w-8 text-right">
        {percent}%
      </span>
    </div>
  );
}
