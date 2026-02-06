"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { PHASE_CONFIG } from "@/types/mappingPhases";

const PHASE_ICONS: Record<string, React.ReactNode> = {
  auto: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  groups: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  individuals: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  spinners: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  review: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function PhaseStepper() {
  const {
    currentPhase,
    setCurrentPhase,
    overallProgress,
    phaseCounts,
  } = useMappingPhase();

  const currentIndex = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
      {/* Phase Steps */}
      <div className="flex items-center gap-1.5">
        {PHASE_CONFIG.map((phase, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          const isPending = index > currentIndex;
          const count = phaseCounts.get(phase.id) ?? 0;

          return (
            <PhaseStep
              key={phase.id}
              phase={phase}
              count={count}
              isCurrent={isCurrent}
              isComplete={isComplete}
              isPending={isPending}
              isLast={index === PHASE_CONFIG.length - 1}
              onClick={() => setCurrentPhase(phase.id)}
            />
          );
        })}
      </div>

      {/* Overall Progress */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-foreground/50">
          {overallProgress.completed}/{overallProgress.total} mapped
        </span>
        <div className="w-28 h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PhaseStep({
  phase,
  count,
  isCurrent,
  isComplete,
  isPending,
  isLast,
  onClick,
}: {
  phase: (typeof PHASE_CONFIG)[number];
  count: number;
  isCurrent: boolean;
  isComplete: boolean;
  isPending: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onClick}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium
          transition-all duration-200
          ${isComplete ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : ""}
          ${isCurrent ? "bg-accent/15 text-accent ring-1 ring-accent/40" : ""}
          ${isPending ? "bg-foreground/5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/60" : ""}
        `}
      >
        {isComplete ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          PHASE_ICONS[phase.icon]
        )}
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
      {!isLast && (
        <div
          className={`w-6 h-0.5 mx-0.5 ${isComplete ? "bg-green-500/40" : "bg-foreground/10"}`}
        />
      )}
    </div>
  );
}
