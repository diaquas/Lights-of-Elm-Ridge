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
  } = useMappingPhase();

  const phaseIndex = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);
  const nextPhase =
    phaseIndex < PHASE_CONFIG.length - 1 ? PHASE_CONFIG[phaseIndex + 1] : null;

  return (
    <div className="flex items-center justify-between px-6 py-2.5 bg-surface border-b border-border flex-shrink-0">
      {/* Back Button */}
      <button
        type="button"
        onClick={goToPreviousPhase}
        disabled={!canGoPrevious}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${
            canGoPrevious
              ? "bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
              : "text-foreground/20 cursor-not-allowed"
          }
        `}
      >
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      {/* Spacer — status moved to StatusSummaryBar */}
      <div />

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
            flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
            ${
              canGoNext
                ? "bg-accent text-white hover:bg-accent/90 shadow-sm"
                : "bg-foreground/10 text-foreground/20 cursor-not-allowed"
            }
          `}
        >
          Continue{nextPhase ? ` to ${nextPhase.label}` : ""}
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
