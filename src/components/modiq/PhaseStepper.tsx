"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { PHASE_CONFIG, UPLOAD_STEP } from "@/types/mappingPhases";
import type { ProgressTrackerState } from "@/hooks/useProgressTracker";
import { CompactProgressTracker } from "./CompactProgressTracker";

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
    <div className="flex items-center justify-between px-4 py-2.5">
      {/* Phase Steps */}
      <div className="flex items-center gap-1">
        {/* Upload Step (always completed) */}
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] font-medium bg-green-500/15 text-green-400">
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
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] font-medium
                  transition-all duration-200
                  ${isComplete ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : ""}
                  ${isCurrent ? "bg-accent/15 text-accent ring-1 ring-accent/40" : ""}
                  ${isPending ? "bg-foreground/5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/60" : ""}
                `}
              >
                {isComplete ? CHECK_ICON : PHASE_ICONS[phase.icon]}
                <span>{phase.label}</span>
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

      {/* Progress Tracker (replaces old Effects Coverage bar) */}
      {progressState && onOpenProgressModal ? (
        <CompactProgressTracker
          state={progressState}
          onOpenModal={onOpenProgressModal}
        />
      ) : null}
    </div>
  );
}
