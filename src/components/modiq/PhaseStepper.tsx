"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { PHASE_CONFIG, UPLOAD_STEP } from "@/types/mappingPhases";
import type { ProgressTrackerState } from "@/hooks/useProgressTracker";
import { useState, useRef, useCallback, memo } from "react";
import { ExpandedProgressCard } from "./ExpandedProgressCard";

/** Format large numbers compactly: 2009 → "2.0K" */
function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

interface PhaseStepperProps {
  progressState?: ProgressTrackerState;
  onOpenProgressModal?: () => void;
}

export function PhaseStepper({ progressState, onOpenProgressModal }: PhaseStepperProps = {}) {
  const { currentPhase, setCurrentPhase, phaseCounts } =
    useMappingPhase();

  const currentIndex = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);
  const displayColor = progressState
    ? progressState.display.percent >= 80 ? "text-green-400" : "text-foreground/50"
    : "text-foreground/50";
  const displayBarColor = progressState
    ? progressState.display.percent >= 80 ? "bg-green-500" : "bg-foreground/40"
    : "bg-foreground/40";

  return (
    <div className="flex items-center justify-between px-5 py-2 border-b border-border bg-surface/50">
      {/* Left: Breadcrumb navigation */}
      <nav className="flex items-center gap-0.5 text-sm min-w-0" aria-label="Mapping phases">
        {/* Upload (always complete) */}
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-green-400/70 hover:bg-foreground/5 transition-colors flex-shrink-0"
          onClick={() => {}}
          disabled
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{UPLOAD_STEP.label}</span>
        </button>

        {PHASE_CONFIG.map((phase, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          const isPending = index > currentIndex;
          const count = phaseCounts.get(phase.id) ?? 0;
          const unmappedCount = phase.id !== "review" && phase.id !== "finalize" ? count : 0;

          return (
            <div key={phase.id} className="flex items-center">
              {/* Separator */}
              <span className="text-foreground/20 mx-0.5 flex-shrink-0" aria-hidden>&rsaquo;</span>

              <button
                type="button"
                onClick={() => setCurrentPhase(phase.id)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all duration-150 whitespace-nowrap
                  ${isComplete ? "text-green-400/70 hover:bg-foreground/5" : ""}
                  ${isCurrent ? "text-foreground bg-accent/10" : ""}
                  ${isPending ? "text-foreground/30 hover:text-foreground/50 hover:bg-foreground/5" : ""}
                `}
              >
                {isComplete && (
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{phase.stepperLabel ?? phase.label}</span>
                {isCurrent && unmappedCount > 0 && (
                  <span className="text-xs tabular-nums text-foreground/40">
                    ({unmappedCount})
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Right: Inline progress */}
      {progressState && onOpenProgressModal ? (
        <InlineProgress state={progressState} onOpenModal={onOpenProgressModal} />
      ) : null}
    </div>
  );
}

// ─── Inline Progress (right side of breadcrumb) ────────────

const InlineProgress = memo(function InlineProgress({
  state,
  onOpenModal,
}: {
  state: ProgressTrackerState;
  onOpenModal: () => void;
}) {
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
    state.display.percent >= 80 ? "text-green-400" : "text-foreground/60";
  const barColor =
    state.display.percent >= 80 ? "bg-green-500" : "bg-foreground/40";

  return (
    <div
      className="relative flex-shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer"
        aria-label="View mapping progress details"
      >
        {/* Compact progress bar */}
        <div className="w-24 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor}`}
            style={{ width: `${state.display.percent}%` }}
          />
        </div>
        <span className={`text-sm font-bold tabular-nums ${displayColor}`}>
          {state.display.percent}%
        </span>
        <span className="text-xs text-foreground/30 tabular-nums">
          {state.display.current}/{state.display.total} mapped
        </span>
        {/* Effects as secondary metric */}
        <span className="text-xs text-foreground/20 tabular-nums" title={`${formatCompact(state.effects.current)}/${formatCompact(state.effects.total)} effects covered`}>
          &middot; {state.effects.percent}% fx
        </span>
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
