"use client";

import { memo } from "react";

export interface CoverageProgressBarProps {
  /** Display coverage percentage (0-100) */
  displayCoveragePercent: number;
  /** Effects coverage percentage (0-100) */
  effectsCoveragePercent: number;
  /** Display coverage counts */
  displayCoverage: { covered: number; total: number };
  /** Effects coverage counts */
  effectsCoverage: { covered: number; total: number };
  /** Optional gain from current phase */
  phaseGain?: { display: number; effects: number };
  /** Show compact mode (for persistent header) */
  compact?: boolean;
}

/**
 * Dual-metric coverage progress bar.
 * Shows both display coverage and effects coverage as the primary metrics.
 * Ticket 39: Progress Tracking Redesign — percentage-centric display.
 */
export default memo(function CoverageProgressBar({
  displayCoveragePercent,
  effectsCoveragePercent,
  displayCoverage,
  effectsCoverage,
  phaseGain,
  compact = false,
}: CoverageProgressBarProps) {
  const displayColor = getColorForPercent(displayCoveragePercent);
  const effectsColor = getColorForPercent(effectsCoveragePercent);

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <CompactMetric
          label="Display"
          percent={displayCoveragePercent}
          color={displayColor}
        />
        <CompactMetric
          label="Effects"
          percent={effectsCoveragePercent}
          color={effectsColor}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Display Coverage */}
      <CoverageRow
        label="Display Coverage"
        percent={displayCoveragePercent}
        covered={displayCoverage.covered}
        total={displayCoverage.total}
        color={displayColor}
        unit="models"
        gain={phaseGain?.display}
      />

      {/* Effects Coverage */}
      <CoverageRow
        label="Effects Coverage"
        percent={effectsCoveragePercent}
        covered={effectsCoverage.covered}
        total={effectsCoverage.total}
        color={effectsColor}
        unit="effects"
        gain={phaseGain?.effects}
      />
    </div>
  );
});

function CoverageRow({
  label,
  percent,
  covered,
  total,
  color,
  unit,
  gain,
}: {
  label: string;
  percent: number;
  covered: number;
  total: number;
  color: string;
  unit: string;
  gain?: number;
}) {
  return (
    <div>
      {/* Label and percentage */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs uppercase tracking-wider text-foreground/50">
          {label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-extrabold tabular-nums ${color}`}>
            {Math.round(percent)}%
          </span>
          {gain != null && gain > 0 && (
            <span className="text-xs font-semibold text-green-400 animate-fade-in">
              +{gain}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#222] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${getBarColor(percent)}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      {/* Count */}
      <div className="flex justify-end mt-1">
        <span className="text-[11px] text-foreground/40 tabular-nums">
          {covered.toLocaleString()} / {total.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
}

function CompactMetric({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 bg-[#333] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getBarColor(percent)}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums ${color}`}>
        {Math.round(percent)}%
      </span>
      <span className="text-[10px] text-foreground/40">{label}</span>
    </div>
  );
}

function getColorForPercent(percent: number): string {
  if (percent >= 90) return "text-green-400";
  if (percent >= 70) return "text-emerald-400";
  if (percent >= 50) return "text-yellow-400";
  if (percent >= 30) return "text-orange-400";
  return "text-foreground/60";
}

function getBarColor(percent: number): string {
  if (percent >= 90) return "bg-green-500";
  if (percent >= 70) return "bg-emerald-500";
  if (percent >= 50) return "bg-yellow-500";
  if (percent >= 30) return "bg-orange-500";
  return "bg-foreground/30";
}
