"use client";

import { memo, useState, useCallback } from "react";
import type { SacrificeInfo } from "@/lib/modiq/matcher";

interface SacrificeIndicatorProps {
  sacrifice: SacrificeInfo;
  onSwap?: (currentDest: string, bestDest: string) => void;
}

/**
 * Subtle indicator showing that a model was assigned to a secondary choice
 * to optimize overall match quality. Expandable to show full explanation
 * and optional swap action.
 */
export const SacrificeIndicator = memo(function SacrificeIndicator({
  sacrifice,
  onSwap,
}: SacrificeIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const handleSwap = useCallback(() => {
    onSwap?.(sacrifice.assignedTo, sacrifice.bestMatch);
  }, [onSwap, sacrifice.assignedTo, sacrifice.bestMatch]);

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        <span>Optimized assignment</span>
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 ml-5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[12px] text-foreground/70 space-y-1.5">
          <div>
            Best match was <span className="font-semibold text-foreground/90">{sacrifice.bestMatch}</span>{" "}
            ({Math.round(sacrifice.bestScore * 100)}%) but it went to{" "}
            <span className="font-semibold text-foreground/90">{sacrifice.bestWentTo}</span>{" "}
            for better overall quality.
          </div>
          <div className="text-foreground/50">
            Score difference: -{Math.round(sacrifice.scoreDifference * 100)} points
          </div>
          {onSwap && (
            <button
              type="button"
              onClick={handleSwap}
              className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              Swap assignments
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Summary Component ─────────────────────────────────

interface SacrificeSummaryProps {
  sacrifices: SacrificeInfo[];
}

/**
 * Compact summary of all optimized assignments. Shown in the auto-match
 * phase header or review phase to give users visibility into trade-offs.
 */
export const SacrificeSummary = memo(function SacrificeSummary({
  sacrifices,
}: SacrificeSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (sacrifices.length === 0) return null;

  const totalSaved = sacrifices.reduce(
    (sum, s) => sum + s.scoreDifference,
    0,
  );

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <span className="font-medium">
            {sacrifices.length} optimized{" "}
            {sacrifices.length === 1 ? "assignment" : "assignments"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/40">
            Net trade-off: {Math.round(totalSaved * 100)} pts
          </span>
          <svg
            className={`w-4 h-4 text-foreground/40 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-500/20">
          <div className="px-4 py-2 text-xs text-foreground/40">
            These items were assigned to secondary matches so that other items
            could receive better overall matches.
          </div>
          <div className="divide-y divide-border/50">
            {sacrifices.map((s) => (
              <div
                key={s.sourceModel}
                className="px-4 py-2.5 text-[12px] flex items-start justify-between gap-4"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="text-foreground/80 font-medium truncate">
                    {s.sourceModel}
                  </div>
                  <div className="text-foreground/50">
                    Assigned to{" "}
                    <span className="text-foreground/70">{s.assignedTo}</span>{" "}
                    ({Math.round(s.assignedScore * 100)}%) instead of{" "}
                    <span className="text-foreground/70">{s.bestMatch}</span>{" "}
                    ({Math.round(s.bestScore * 100)}%)
                  </div>
                  <div className="text-foreground/40">
                    {s.bestMatch} → {s.bestWentTo}
                  </div>
                </div>
                <span className="text-amber-400/70 text-xs tabular-nums whitespace-nowrap">
                  -{Math.round(s.scoreDifference * 100)} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
