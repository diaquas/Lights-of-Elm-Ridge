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
    focusMode,
    toggleFocusMode,
    interactive,
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

      {/* Undo + Focus mode */}
      <div className="flex items-center gap-2">
        {interactive.canUndo && (
          <button
            type="button"
            onClick={interactive.undo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-foreground/50 hover:text-foreground/80 hover:bg-foreground/5 border border-transparent hover:border-border transition-all"
            title="Undo last action (Ctrl+Z)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
            </svg>
            Undo
          </button>
        )}
      <button
        type="button"
        onClick={toggleFocusMode}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5 border border-transparent hover:border-border transition-all"
        title={focusMode ? "Exit Focus View (Esc)" : "Focus View"}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {focusMode ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.5 3.5L9 9m0 0V4.5M9 9H4.5M20.5 3.5L15 9m0 0V4.5M15 9h4.5M3.5 20.5L9 15m0 0v4.5M9 15H4.5M20.5 20.5L15 15m0 0v4.5m0-4.5h4.5" />
          )}
        </svg>
        {focusMode ? "Exit Focus" : "Focus View"}
      </button>
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
