"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
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
}

const MappingPhaseContext = createContext<PhaseContextValue | null>(null);

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

  // Precompute best-match scores for all layers so phase filters work correctly.
  // We call getSuggestionsForLayer for each layer and cache the top score.
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const layer of interactive.sourceLayerMappings) {
      // If already mapped, treat as high score so it stays in whatever phase it was
      if (layer.isMapped) {
        map.set(layer.sourceModel.name, 1.0);
        continue;
      }
      if (layer.isSkipped) {
        continue;
      }
      const suggestions = interactive.getSuggestionsForLayer(layer.sourceModel);
      const topScore = suggestions.length > 0 ? suggestions[0].score : 0;
      map.set(layer.sourceModel.name, topScore);
    }
    return map;
  }, [interactive]);

  // Create phase-aware filters that use the real scores
  const phaseFilters = useMemo(() => {
    const filters = new Map<MappingPhase, (layer: SourceLayerMapping) => boolean>();

    for (const config of PHASE_CONFIG) {
      filters.set(config.id, (layer: SourceLayerMapping) => {
        // Review shows everything
        if (config.id === "review") return true;

        const isSpinner = isSpinnerType(layer.sourceModel.groupType);
        const bestScore = scoreMap.get(layer.sourceModel.name) ?? 0;

        switch (config.id) {
          case "auto-accept":
            if (isSpinner) return false;
            return bestScore >= 0.85;
          case "groups":
            if (isSpinner) return false;
            if (!layer.isGroup) return false;
            return bestScore < 0.85;
          case "individuals":
            if (isSpinner) return false;
            if (layer.isGroup) return false;
            return bestScore < 0.85;
          case "spinners":
            return isSpinner;
          default:
            return false;
        }
      });
    }

    return filters;
  }, [scoreMap]);

  const getPhaseItems = useCallback(
    (phase: MappingPhase): SourceLayerMapping[] => {
      const filter = phaseFilters.get(phase);
      if (!filter) return [];
      return interactive.sourceLayerMappings.filter(
        (layer) => !layer.isSkipped && filter(layer),
      );
    },
    [phaseFilters, interactive.sourceLayerMappings],
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
