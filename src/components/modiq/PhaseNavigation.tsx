"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { PHASE_CONFIG } from "@/types/mappingPhases";

export function PhaseNavigation() {
  const {
    currentPhase,
    goToNextPhase,
    goToPreviousPhase,
    canGoNext,
    canGoPrevious,
    phaseProgress,
  } = useMappingPhase();

  const currentConfig = PHASE_CONFIG.find((p) => p.id === currentPhase);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-surface border-t border-border">
      {/* Back Button */}
      <button
        type="button"
        onClick={goToPreviousPhase}
        disabled={!canGoPrevious}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${canGoPrevious
            ? "bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
            : "text-foreground/20 cursor-not-allowed"}
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Phase Info */}
      <div className="text-center">
        <div className="text-sm text-foreground/50">{currentConfig?.description}</div>
        {currentPhase !== "review" && (
          <div className="text-xs text-foreground/30 mt-0.5">
            {phaseProgress.completed} of {phaseProgress.total} complete in this phase
          </div>
        )}
      </div>

      {/* Next / Export Button */}
      {currentPhase === "review" ? (
        // Review phase: export handled by ReviewPhase component itself
        <div className="w-20" />
      ) : (
        <button
          type="button"
          onClick={goToNextPhase}
          disabled={!canGoNext}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${canGoNext
              ? "bg-accent text-white hover:bg-accent/90"
              : "bg-foreground/10 text-foreground/20 cursor-not-allowed"}
          `}
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
