"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { InteractiveMappingState, SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import type { MappingPhase } from "@/types/mappingPhases";
import { PHASE_CONFIG } from "@/types/mappingPhases";
import { isSpinnerType } from "@/types/xLightsTypes";

// ─── Types ──────────────────────────────────────────────

export interface PhaseProgress {
  completed: number;
  total: number;
  percentage: number;
}

interface PhaseContextValue {
  currentPhase: MappingPhase;
  setCurrentPhase: (phase: MappingPhase) => void;
  goToNextPhase: () => void;
  goToPreviousPhase: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  /** Items filtered for the current phase */
  phaseItems: SourceLayerMapping[];
  /** Get items for a specific phase */
  getPhaseItems: (phase: MappingPhase) => SourceLayerMapping[];
  /** Progress within the current phase */
  phaseProgress: PhaseProgress;
  /** Overall mapping progress across all phases */
  overallProgress: PhaseProgress;
  /** Phase counts: how many items in each phase */
  phaseCounts: Map<MappingPhase, number>;
  /** Best match score per layer (source name → score) */
  scoreMap: Map<string, number>;
  /** The full interactive mapping state (for phase components to dispatch actions) */
  interactive: InteractiveMappingState;
  /** Move rejected auto-accept items to their natural fallback phases */
  reassignFromAutoAccept: (rejectedNames: Set<string>) => void;
}

const MappingPhaseContext = createContext<PhaseContextValue | null>(null);

/** Natural sort: "Arch 2" before "Arch 10", case-insensitive */
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function sortLayers(layers: SourceLayerMapping[]): SourceLayerMapping[] {
  return [...layers].sort((a, b) =>
    naturalCompare(a.sourceModel.name, b.sourceModel.name),
  );
}

/** Extract family prefix by stripping trailing numbers: "Mini Pumpkin 8" → "Mini Pumpkin" */
export function extractFamily(name: string): string {
  return name.replace(/\s*\d+\s*$/, "").trim();
}

/**
 * Find the next unmapped item, preferring items in the same "family".
 * E.g., after mapping "Arch 3", prefer "Arch 4" over "Bat 1".
 */
export function findNextUnmapped(
  unmappedItems: SourceLayerMapping[],
  currentName: string,
): string | null {
  if (unmappedItems.length === 0) return null;

  const family = extractFamily(currentName);
  const remaining = unmappedItems.filter(
    (i) => i.sourceModel.name !== currentName && !i.isMapped,
  );

  if (remaining.length === 0) return null;

  // Prefer same family first
  const sameFamily = remaining.filter(
    (i) => extractFamily(i.sourceModel.name) === family,
  );
  if (sameFamily.length > 0) {
    return sameFamily[0].sourceModel.name;
  }

  // Fallback to any unmapped item
  return remaining[0].sourceModel.name;
}

// ─── Provider ──────────────────────────────────────────

interface MappingPhaseProviderProps {
  children: ReactNode;
  interactive: InteractiveMappingState;
}

export function MappingPhaseProvider({
  children,
  interactive,
}: MappingPhaseProviderProps) {
  const [currentPhase, setCurrentPhase] = useState<MappingPhase>("auto-accept");

  const phaseIndex = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);
  const canGoNext = phaseIndex < PHASE_CONFIG.length - 1;
  const canGoPrevious = phaseIndex > 0;

  const goToNextPhase = useCallback(() => {
    const idx = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);
    if (idx < PHASE_CONFIG.length - 1) {
      setCurrentPhase(PHASE_CONFIG[idx + 1].id);
    }
  }, [currentPhase]);

  const goToPreviousPhase = useCallback(() => {
    const idx = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);
    if (idx > 0) {
      setCurrentPhase(PHASE_CONFIG[idx - 1].id);
    }
  }, [currentPhase]);

  // Stable caches: scores and phase assignments are computed once per item
  // and never change. This prevents items from migrating between phases when mapped
  // (e.g., a group getting score 1.0 and jumping to auto-accept).
  const stableScoreRef = useRef(new Map<string, number>());
  const phaseAssignmentRef = useRef(new Map<string, MappingPhase>());
  /** For auto-accept items: the phase they'd belong to if rejected (groups/individuals/spinners) */
  const fallbackPhaseRef = useRef(new Map<string, MappingPhase>());

  /** Auto-accept threshold: items scored 70%+ go to auto-accept for bulk review */
  const AUTO_ACCEPT_THRESHOLD = 0.70;

  // Compute stable scores and phase assignments for any new items.
  // Once an item's score/phase is cached, it never recalculates.
  const scoreMap = useMemo(() => {
    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isSkipped) continue;
      const name = layer.sourceModel.name;

      // Score: compute once from initial suggestions, cache forever
      if (!stableScoreRef.current.has(name)) {
        const suggestions = interactive.getSuggestionsForLayer(layer.sourceModel);
        const topScore = suggestions.length > 0 ? suggestions[0].score : 0;
        stableScoreRef.current.set(name, topScore);
      }

      // Phase: assign once based on stable score, cache forever
      if (!phaseAssignmentRef.current.has(name)) {
        const isSpinner = isSpinnerType(layer.sourceModel.groupType);
        const bestScore = stableScoreRef.current.get(name) ?? 0;

        // All entity types (groups, models, spinners) with 70%+ go to auto-accept
        if (bestScore >= AUTO_ACCEPT_THRESHOLD) {
          phaseAssignmentRef.current.set(name, "auto-accept");
          // Store natural fallback for rejection routing
          if (isSpinner) {
            fallbackPhaseRef.current.set(name, "spinners");
          } else if (layer.isGroup) {
            fallbackPhaseRef.current.set(name, "groups");
          } else {
            fallbackPhaseRef.current.set(name, "individuals");
          }
        } else if (isSpinner) {
          phaseAssignmentRef.current.set(name, "spinners");
        } else if (layer.isGroup) {
          phaseAssignmentRef.current.set(name, "groups");
        } else {
          phaseAssignmentRef.current.set(name, "individuals");
        }
      }
    }

    return new Map(stableScoreRef.current);
  }, [interactive]);

  /**
   * Move rejected auto-accept items to their natural fallback phases.
   * Called by AutoAcceptPhase when user clicks Continue with unchecked items.
   * The ref mutation is visible on next render (triggered by other state changes).
   */
  const reassignFromAutoAccept = useCallback((rejectedNames: Set<string>) => {
    for (const name of rejectedNames) {
      const fallback = fallbackPhaseRef.current.get(name);
      if (fallback) {
        phaseAssignmentRef.current.set(name, fallback);
      }
    }
  }, []);

  const getPhaseItems = useCallback(
    (phase: MappingPhase): SourceLayerMapping[] => {
      if (phase === "review") {
        return sortLayers(interactive.sourceLayerMappings.filter((l) => !l.isSkipped));
      }
      return sortLayers(interactive.sourceLayerMappings.filter((layer) => {
        if (layer.isSkipped) return false;
        return phaseAssignmentRef.current.get(layer.sourceModel.name) === phase;
      }));
    },
    [interactive.sourceLayerMappings],
  );

  const phaseItems = useMemo(
    () => getPhaseItems(currentPhase),
    [getPhaseItems, currentPhase],
  );

  const phaseProgress = useMemo((): PhaseProgress => {
    const total = phaseItems.length;
    const completed = phaseItems.filter((item) => item.isMapped).length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
    };
  }, [phaseItems]);

  const overallProgress = useMemo((): PhaseProgress => {
    const nonSkipped = interactive.sourceLayerMappings.filter((l) => !l.isSkipped);
    const total = nonSkipped.length;
    const completed = nonSkipped.filter((l) => l.isMapped).length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [interactive.sourceLayerMappings]);

  const phaseCounts = useMemo(() => {
    const counts = new Map<MappingPhase, number>();
    for (const config of PHASE_CONFIG) {
      if (config.id === "review") {
        counts.set(config.id, interactive.sourceLayerMappings.filter((l) => !l.isSkipped).length);
      } else {
        counts.set(config.id, getPhaseItems(config.id).length);
      }
    }
    return counts;
  }, [getPhaseItems, interactive.sourceLayerMappings]);

  const value: PhaseContextValue = useMemo(
    () => ({
      currentPhase,
      setCurrentPhase,
      goToNextPhase,
      goToPreviousPhase,
      canGoNext,
      canGoPrevious,
      phaseItems,
      getPhaseItems,
      phaseProgress,
      overallProgress,
      phaseCounts,
      scoreMap,
      interactive,
      reassignFromAutoAccept,
    }),
    [
      currentPhase,
      goToNextPhase,
      goToPreviousPhase,
      canGoNext,
      canGoPrevious,
      phaseItems,
      getPhaseItems,
      phaseProgress,
      overallProgress,
      phaseCounts,
      scoreMap,
      interactive,
      reassignFromAutoAccept,
    ],
  );

  return (
    <MappingPhaseContext.Provider value={value}>
      {children}
    </MappingPhaseContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────

export function useMappingPhase() {
  const context = useContext(MappingPhaseContext);
  if (!context) {
    throw new Error("useMappingPhase must be used within MappingPhaseProvider");
  }
  return context;
}
