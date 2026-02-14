"use client";

import { memo, useState, useCallback } from "react";

export interface PersistentProgressTrackerProps {
  /** Display coverage metrics */
  displayCoverage: { covered: number; total: number; percent: number };
  /** Effects coverage metrics */
  effectsCoverage: { covered: number; total: number; percent: number };
  /** Current phase name */
  currentPhase: string;
  /** Phase progress (items completed in current phase) */
  phaseProgress: { completed: number; total: number };
  /** Whether we're in the results step (show tracker) vs input/processing */
  visible: boolean;
}

/**
 * Persistent progress tracker shown in the mapping header.
 * Compact dual-metric display with hover expansion.
 * Ticket 48: Persistent Progress Tracker
 */
export default memo(function PersistentProgressTracker({
  displayCoverage,
  effectsCoverage,
  currentPhase,
  phaseProgress,
  visible,
}: PersistentProgressTrackerProps) {
  const [expanded, setExpanded] = useState(false);

  const handleMouseEnter = useCallback(() => setExpanded(true), []);
  const handleMouseLeave = useCallback(() => setExpanded(false), []);

  if (!visible) return null;

  const displayColor = getColorClass(displayCoverage.percent);
  const effectsColor = getColorClass(effectsCoverage.percent);

  return (
    <div
      role="status"
      aria-label="Mapping progress"
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Compact bar (always visible) */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-surface-light rounded-lg border border-foreground/10">
        {/* Display coverage mini ring */}
        <MiniRing
          percent={displayCoverage.percent}
          label="D"
          color={displayColor}
        />

        {/* Effects coverage mini ring */}
        <MiniRing
          percent={effectsCoverage.percent}
          label="E"
          color={effectsColor}
        />

        {/* Phase indicator */}
        <span className="text-[10px] text-foreground/40 uppercase tracking-wider max-w-[80px] truncate">
          {currentPhase}
        </span>

        {/* Phase progress dots */}
        {phaseProgress.total > 0 && phaseProgress.total <= 20 && (
          <div className="flex gap-0.5">
            {Array.from({ length: phaseProgress.total }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i < phaseProgress.completed
                    ? "bg-green-500"
                    : "bg-foreground/20"
                }`}
              />
            ))}
          </div>
        )}
        {phaseProgress.total > 20 && (
          <span className="text-[10px] text-foreground/40 tabular-nums">
            {phaseProgress.completed}/{phaseProgress.total}
          </span>
        )}
      </div>

      {/* Expanded panel (on hover) */}
      {expanded && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 min-w-[260px] p-4 bg-[#1a1a1a] border border-foreground/15 rounded-lg shadow-2xl">
          <div className="space-y-3">
            <ExpandedMetric
              label="Display Coverage"
              covered={displayCoverage.covered}
              total={displayCoverage.total}
              percent={displayCoverage.percent}
              color={displayColor}
              unit="models"
            />
            <ExpandedMetric
              label="Effects Coverage"
              covered={effectsCoverage.covered}
              total={effectsCoverage.total}
              percent={effectsCoverage.percent}
              color={effectsColor}
              unit="effects"
            />

            <div className="pt-2 border-t border-foreground/10">
              <div className="flex justify-between text-[11px]">
                <span className="text-foreground/50">Current Phase</span>
                <span className="font-medium">{currentPhase}</span>
              </div>
              {phaseProgress.total > 0 && (
                <div className="flex justify-between text-[11px] mt-1">
                  <span className="text-foreground/50">Phase Progress</span>
                  <span className="font-medium tabular-nums">
                    {phaseProgress.completed} / {phaseProgress.total}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function MiniRing({
  percent,
  label,
  color,
}: {
  percent: number;
  label: string;
  color: string;
}) {
  const circumference = 2 * Math.PI * 10;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative h-7 w-7 flex items-center justify-center">
      <svg className="h-7 w-7 -rotate-90" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground/10"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-[stroke-dashoffset] duration-500`}
          style={{ stroke: "currentColor" }}
        />
      </svg>
      <span
        className={`absolute text-[8px] font-bold ${color}`}
        style={{ lineHeight: 1 }}
      >
        {label}
      </span>
    </div>
  );
}

function ExpandedMetric({
  label,
  covered,
  total,
  percent,
  color,
  unit,
}: {
  label: string;
  covered: number;
  total: number;
  percent: number;
  color: string;
  unit: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-foreground/50">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${color}`}>
          {Math.round(percent)}%
        </span>
      </div>
      <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getBarColorClass(percent)}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <div className="text-[10px] text-foreground/30 mt-0.5 text-right tabular-nums">
        {covered.toLocaleString()} / {total.toLocaleString()} {unit}
      </div>
    </div>
  );
}

function getColorClass(percent: number): string {
  if (percent >= 90) return "text-green-400";
  if (percent >= 70) return "text-emerald-400";
  if (percent >= 50) return "text-yellow-400";
  if (percent >= 30) return "text-orange-400";
  return "text-foreground/50";
}

function getBarColorClass(percent: number): string {
  if (percent >= 90) return "bg-green-500";
  if (percent >= 70) return "bg-emerald-500";
  if (percent >= 50) return "bg-yellow-500";
  if (percent >= 30) return "bg-orange-500";
  return "bg-foreground/30";
}
