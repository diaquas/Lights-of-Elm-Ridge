"use client";

import { memo, useState, useRef, useCallback } from "react";
import type { ProgressTrackerState } from "@/hooks/useProgressTracker";
import { ExpandedProgressCard } from "./ExpandedProgressCard";

interface CompactProgressTrackerProps {
  state: ProgressTrackerState;
  onOpenModal: () => void;
}

/** Format large numbers compactly: 2009 → "2.0K" */
function formatCompact(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return String(n);
}

/**
 * Compact dual-metric progress tracker for the wizard header.
 * Shows display coverage (models) and effects coverage side by side.
 * Hovers to expand, clicks to open full details modal.
 */
export const CompactProgressTracker = memo(function CompactProgressTracker({
  state,
  onOpenModal,
}: CompactProgressTrackerProps) {
  const [showExpanded, setShowExpanded] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setShowExpanded(true), 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = null;
    setShowExpanded(false);
  }, []);

  const handleClick = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = null;
    setShowExpanded(false);
    onOpenModal();
  }, [onOpenModal]);

  const displayColor =
    state.display.percent >= 80 ? "text-green-400" : "text-yellow-400";
  const displayBarColor =
    state.display.percent >= 80 ? "bg-green-500" : "bg-yellow-500";
  const effectsColor =
    state.effects.percent >= 70 ? "text-blue-400" : "text-yellow-400";
  const effectsBarColor =
    state.effects.percent >= 70 ? "bg-blue-500" : "bg-yellow-500";

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="group"
      aria-label="Mapping progress tracker"
    >
      {/* Compact Tracker */}
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-3 bg-foreground/5 hover:bg-foreground/10 rounded-lg px-3 py-1.5 cursor-pointer transition-all duration-200 border border-transparent hover:border-border"
      >
        {/* Display Coverage */}
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-foreground/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
            />
          </svg>
          <span className={`text-[13px] font-bold tabular-nums ${displayColor}`}>
            {state.display.percent}%
          </span>
          <div className="w-14 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${displayBarColor}`}
              style={{ width: `${state.display.percent}%` }}
            />
          </div>
          <span className="text-[11px] text-foreground/40 tabular-nums">
            {state.display.current}/{state.display.total}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-foreground/10" />

        {/* Effects Coverage */}
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-foreground/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <span className={`text-[13px] font-bold tabular-nums ${effectsColor}`}>
            {state.effects.percent}%
          </span>
          <div className="w-14 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${effectsBarColor}`}
              style={{ width: `${state.effects.percent}%` }}
            />
          </div>
          <span className="text-[11px] text-foreground/40 tabular-nums">
            {formatCompact(state.effects.current)}/{formatCompact(state.effects.total)}
          </span>
        </div>
      </button>

      {/* Expanded Hover Card */}
      {showExpanded && (
        <ExpandedProgressCard
          state={state}
          onClickDetails={handleClick}
        />
      )}
    </div>
  );
});
