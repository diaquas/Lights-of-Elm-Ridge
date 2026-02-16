"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "modiq-coach-marks-dismissed";

function getIsDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

interface CoachStep {
  title: string;
  description: string;
}

const COACH_STEPS: CoachStep[] = [
  {
    title: "Your Sequence",
    description:
      "These are the source layers to map. Each row represents a model from the sequence file.",
  },
  {
    title: "Your Display",
    description:
      "Click or drag to assign your models. Suggestions appear as pills you can accept with one click.",
  },
  {
    title: "Smart Suggestions",
    description:
      "Accept suggestions with one click, or skip to move on. Mod:IQ learns from your choices.",
  },
];

export function CoachMarkOverlay() {
  const wasDismissed = useSyncExternalStore(subscribe, getIsDismissed, () => true);
  const [currentStep, setCurrentStep] = useState(0);
  const [localDismissed, setLocalDismissed] = useState(false);

  const dismissed = wasDismissed || localDismissed;

  const dismiss = useCallback(() => {
    setLocalDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < COACH_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [currentStep, dismiss]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        dismiss();
      }
    },
    [dismiss],
  );

  if (dismissed) return null;

  const step = COACH_STEPS[currentStep];

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center"
      onClick={dismiss}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Mapping workspace tutorial"
    >
      <div
        className="bg-surface border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl animate-[slideDown_0.3s_ease-out]"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-4">
          {COACH_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-6 bg-accent"
                  : i < currentStep
                    ? "w-3 bg-accent/40"
                    : "w-3 bg-foreground/10"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center mb-3">
          {currentStep === 0 && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          )}
          {currentStep === 1 && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          )}
          {currentStep === 2 && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
        </div>

        {/* Content */}
        <h3 className="text-base font-display font-bold text-foreground mb-1.5">
          {step.title}
        </h3>
        <p className="text-sm text-foreground/60 leading-relaxed mb-5">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={dismiss}
            className="text-[12px] text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-[12px] font-semibold rounded-lg transition-all duration-200"
          >
            {currentStep < COACH_STEPS.length - 1 ? "Next" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
