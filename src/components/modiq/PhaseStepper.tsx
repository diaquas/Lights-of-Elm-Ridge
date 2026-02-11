"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { PHASE_CONFIG, UPLOAD_STEP } from "@/types/mappingPhases";
import type { ProgressTrackerState } from "@/hooks/useProgressTracker";
import { useState, useRef, useCallback, memo } from "react";
import { ExpandedProgressCard } from "./ExpandedProgressCard";

const PHASE_ICONS: Record<string, React.ReactNode> = {
  upload: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  ),
  auto: (
    <svg
      className="w-3.5 h-3.5"
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
  ),
  groups: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  ),
  individuals: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  ),
  spinners: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  review: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

const CHECK_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

interface PhaseStepperProps {
  progressState?: ProgressTrackerState;
  onOpenProgressModal?: () => void;
}

export function PhaseStepper({ progressState, onOpenProgressModal }: PhaseStepperProps = {}) {
  const { currentPhase, setCurrentPhase, phaseCounts } =
    useMappingPhase();

  const currentIndex = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);

  return (
    <div className="space-y-2">
      {/* Row 1 — Stepper Pills */}
      <div className="flex items-center justify-center px-4 py-2.5">
        <div className="flex items-center gap-1">
          {/* Upload Step (always completed) */}
          <div className="flex items-center">
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] font-medium bg-green-500/15 text-green-400 min-h-[2.5rem] min-w-[7rem] text-center">
              {CHECK_ICON}
              <span>{UPLOAD_STEP.label}</span>
            </div>
            <div className="w-5 h-0.5 mx-0.5 bg-green-500/40" />
          </div>

          {/* Mapping Phases */}
          {PHASE_CONFIG.map((phase, index) => {
            const isCurrent = index === currentIndex;
            const isComplete = index < currentIndex;
            const isPending = index > currentIndex;
            const count = phaseCounts.get(phase.id) ?? 0;

            return (
              <div key={phase.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setCurrentPhase(phase.id)}
                  className={`
                    flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] font-medium
                    min-h-[2.5rem] min-w-[7rem] text-center whitespace-normal
                    transition-all duration-200
                    ${isComplete ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : ""}
                    ${isCurrent ? "bg-accent/15 text-accent ring-1 ring-accent/40" : ""}
                    ${isPending ? "bg-foreground/5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/60" : ""}
                  `}
                >
                  {isComplete ? CHECK_ICON : PHASE_ICONS[phase.icon]}
                  <span>{phase.stepperLabel ?? phase.label}</span>
                  {count > 0 && phase.id !== "review" && (
                    <span
                      className={`
                        text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                        ${isComplete ? "bg-green-500/20 text-green-400" : ""}
                        ${isCurrent ? "bg-accent/20 text-accent" : ""}
                        ${isPending ? "bg-foreground/10 text-foreground/30" : ""}
                      `}
                    >
                      {count}
                    </span>
                  )}
                </button>

                {/* Connector Line */}
                {index < PHASE_CONFIG.length - 1 && (
                  <div
                    className={`w-5 h-0.5 mx-0.5 ${isComplete ? "bg-green-500/40" : "bg-foreground/10"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2 — Status Summary Bar */}
      {progressState && onOpenProgressModal ? (
        <StatusSummaryBar state={progressState} onOpenModal={onOpenProgressModal} />
      ) : null}
    </div>
  );
}

// ─── Status Summary Bar (Row 2) ─────────────────────────

/** Format large numbers compactly: 2009 → "2.0K" */
function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const StatusSummaryBar = memo(function StatusSummaryBar({
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
    state.display.percent >= 80 ? "text-green-400" : "text-yellow-400";
  const displayBarColor =
    state.display.percent >= 80 ? "bg-green-500" : "bg-yellow-500";
  const effectsColor =
    state.effects.percent >= 70 ? "text-blue-400" : "text-yellow-400";
  const effectsBarColor =
    state.effects.percent >= 70 ? "bg-blue-500" : "bg-yellow-500";

  return (
    <div
      className="relative mx-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="group"
      aria-label="Mapping progress"
    >
      <button
        type="button"
        onClick={handleClick}
        className="w-full grid grid-cols-2 gap-6 bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-border/50 hover:border-border rounded-lg px-5 py-2.5 cursor-pointer transition-all duration-200"
      >
        {/* Models Mapped */}
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-foreground/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-foreground/50">Models Mapped</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold tabular-nums ${displayColor}`}>
                  {state.display.percent}%
                </span>
                <span className="text-[11px] text-foreground/35 tabular-nums">
                  ({state.display.current}/{state.display.total})
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${displayBarColor}`}
                style={{ width: `${state.display.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Effects Covered */}
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-foreground/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-foreground/50">Effects Covered</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold tabular-nums ${effectsColor}`}>
                  {state.effects.percent}%
                </span>
                <span className="text-[11px] text-foreground/35 tabular-nums">
                  ({formatCompact(state.effects.current)}/{formatCompact(state.effects.total)})
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${effectsBarColor}`}
                style={{ width: `${state.effects.percent}%` }}
              />
            </div>
          </div>
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
