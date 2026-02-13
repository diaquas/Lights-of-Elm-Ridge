/* eslint-disable react-hooks/refs -- Intentional: refs used as lazy-init caches in useMemo,
   scores/phases are computed once and never change, so stale-ref is not a concern. */
"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type {
  InteractiveMappingState,
  SourceLayerMapping,
} from "@/hooks/useInteractiveMapping";
import type { MappingPhase } from "@/types/mappingPhases";
import {
  PHASE_CONFIG,
  AUTO_ACCEPT_THRESHOLD,
  STRONG_THRESHOLD,
} from "@/types/mappingPhases";
import { isSpinnerType } from "@/types/xLightsTypes";
import {
  suggestMatchesForSource,
  type ModelMapping,
} from "@/lib/modiq/matcher";

// ─── Types ──────────────────────────────────────────────

export interface PhaseProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface AutoMatchStats {
  /** Total number of auto-matched items */
  total: number;
  /** Items with score >= 75% */
  strongCount: number;
  /** Items with score 70–74% */
  reviewCount: number;
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
  /** Factor breakdown per layer (source name → 6-factor scores). Used to generate reasoning tooltips. */
  factorsMap: Map<string, ModelMapping["factors"]>;
  /** The full interactive mapping state (for phase components to dispatch actions) */
  interactive: InteractiveMappingState;
  /** Set of source names that were auto-matched during loading (for Link2 badge) */
  autoMatchedNames: ReadonlySet<string>;
  /** Aggregate stats about auto-matched items */
  autoMatchStats: AutoMatchStats;
  /** Global focus mode — expands work area to full viewport */
  focusMode: boolean;
  /** Toggle focus mode on/off */
  toggleFocusMode: () => void;
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
  focusMode: boolean;
  toggleFocusMode: () => void;
}

export function MappingPhaseProvider({
  children,
  interactive,
  focusMode,
  toggleFocusMode,
}: MappingPhaseProviderProps) {
  const [currentPhase, setCurrentPhase] = useState<MappingPhase>("individuals");

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
  // and never change. This prevents items from migrating between phases when mapped.
  const stableScoreRef = useRef(new Map<string, number>());
  const stableFactorsRef = useRef(new Map<string, ModelMapping["factors"]>());
  const phaseAssignmentRef = useRef(new Map<string, MappingPhase>());

  /** Names of items that were auto-matched (pre-applied). Persists across renders. */
  const autoMatchedRef = useRef(new Set<string>());
  const didAutoApply = useRef(false);

  // Compute stable scores and phase assignments for any new items.
  // Once an item's score/phase is cached, it never recalculates.
  // All items go directly to their natural phase (spinners or individuals).
  const _scoreMaps = useMemo(() => {
    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isSkipped) continue;
      const name = layer.sourceModel.name;

      // Score: compute once, cache forever.
      // For pre-mapped items, score the assigned pair directly against the matcher
      // (getSuggestionsForLayer excludes assigned dest models from its pool,
      //  giving artificially low scores for items that matchModels() already mapped)
      if (!stableScoreRef.current.has(name)) {
        if (layer.isMapped && layer.assignedUserModels.length > 0) {
          const assigned = layer.assignedUserModels[0];
          const result = suggestMatchesForSource(
            layer.sourceModel,
            [assigned],
            interactive.allSourceModels,
            interactive.allDestModels,
          );
          stableScoreRef.current.set(
            name,
            result.length > 0 ? result[0].score : 0,
          );
          if (result.length > 0)
            stableFactorsRef.current.set(name, result[0].factors);
        } else {
          const suggestions = interactive.getSuggestionsForLayer(
            layer.sourceModel,
          );
          const topScore = suggestions.length > 0 ? suggestions[0].score : 0;
          stableScoreRef.current.set(name, topScore);
          if (suggestions.length > 0)
            stableFactorsRef.current.set(name, suggestions[0].factors);
        }
      }

      // Phase: assign to natural phase based on entity type (no auto-accept phase)
      if (!phaseAssignmentRef.current.has(name)) {
        if (isSpinnerType(layer.sourceModel.groupType)) {
          phaseAssignmentRef.current.set(name, "spinners");
        } else {
          phaseAssignmentRef.current.set(name, "individuals");
        }
      }
    }

    return {
      scores: new Map(stableScoreRef.current),
      factors: new Map(stableFactorsRef.current),
    };
  }, [interactive]);

  const scoreMap = _scoreMaps.scores;
  const factorsMap = _scoreMaps.factors;

  /**
   * Auto-apply matches: one-time side effect that runs the greedy assignment
   * algorithm and pre-applies 70%+ matches. Items that were already mapped
   * by matchModels() are also tracked as auto-matched.
   *
   * Uses the same two-pass greedy algorithm from the old AutoAcceptPhase:
   * Pass 1: Each dest claimed only once (highest-scoring source wins)
   * Pass 2: Conflicted items (all dests taken) are skipped
   */
  useEffect(() => {
    if (didAutoApply.current) return;
    if (interactive.sourceLayerMappings.length === 0) return;
    if (stableScoreRef.current.size === 0) return;
    didAutoApply.current = true;

    // Track ALL pre-mapped items as auto-matched (ticket-73 §4: all matches
    // must be visible in Groups & Models, regardless of confidence level).
    // Also collect eligible unmapped items for greedy auto-apply (score >= 70%).
    const eligible: SourceLayerMapping[] = [];
    for (const layer of interactive.sourceLayerMappings) {
      if (layer.isSkipped) continue;
      const score = stableScoreRef.current.get(layer.sourceModel.name) ?? 0;
      if (layer.isMapped) {
        // Already mapped by matchModels() — track as auto-matched
        autoMatchedRef.current.add(layer.sourceModel.name);
      } else if (score >= AUTO_ACCEPT_THRESHOLD) {
        eligible.push(layer);
      }
    }

    if (eligible.length === 0) return;

    // Pre-compute suggestions cache
    const suggestionsCache = new Map<
      string,
      ReturnType<typeof interactive.getSuggestionsForLayer>
    >();
    for (const item of eligible) {
      suggestionsCache.set(
        item.sourceModel.name,
        interactive.getSuggestionsForLayer(item.sourceModel),
      );
    }

    // Sort by score descending for greedy pass
    const sorted = [...eligible].sort((a, b) => {
      const sa = stableScoreRef.current.get(a.sourceModel.name) ?? 0;
      const sb = stableScoreRef.current.get(b.sourceModel.name) ?? 0;
      return sb - sa;
    });

    // Pass 1 — greedy unique assignment
    const usedDests = new Set<string>();
    const assignments = new Map<string, string>(); // sourceName → destName

    for (const item of sorted) {
      const suggs = suggestionsCache.get(item.sourceModel.name) ?? [];
      for (const sugg of suggs) {
        if (!usedDests.has(sugg.model.name)) {
          usedDests.add(sugg.model.name);
          assignments.set(item.sourceModel.name, sugg.model.name);
          break;
        }
      }
    }

    // Apply assignments
    for (const [sourceName, destName] of assignments) {
      interactive.assignUserModelToLayer(sourceName, destName);
      autoMatchedRef.current.add(sourceName);
    }
  }, [interactive, scoreMap]);

  // Expose autoMatchedNames as a stable set (updates when the ref changes)
  const [autoMatchedNames, setAutoMatchedNames] = useState<ReadonlySet<string>>(
    new Set(),
  );
  useEffect(() => {
    if (
      autoMatchedRef.current.size > 0 &&
      autoMatchedRef.current.size !== autoMatchedNames.size
    ) {
      setAutoMatchedNames(new Set(autoMatchedRef.current));
    }
  }, [scoreMap, autoMatchedNames.size]);

  const autoMatchStats = useMemo((): AutoMatchStats => {
    let strongCount = 0;
    let reviewCount = 0;
    for (const name of autoMatchedNames) {
      const score = stableScoreRef.current.get(name) ?? 0;
      if (score >= STRONG_THRESHOLD) strongCount++;
      else reviewCount++;
    }
    return { total: autoMatchedNames.size, strongCount, reviewCount };
  }, [autoMatchedNames]);

  const getPhaseItems = useCallback(
    (phase: MappingPhase): SourceLayerMapping[] => {
      if (phase === "review" || phase === "finalize") {
        return sortLayers(
          interactive.sourceLayerMappings.filter((l) => !l.isSkipped),
        );
      }
      return sortLayers(
        interactive.sourceLayerMappings.filter((layer) => {
          if (layer.isSkipped) return false;
          return (
            phaseAssignmentRef.current.get(layer.sourceModel.name) === phase
          );
        }),
      );
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
    const nonSkipped = interactive.sourceLayerMappings.filter(
      (l) => !l.isSkipped,
    );
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
      if (config.id === "review" || config.id === "finalize") {
        counts.set(
          config.id,
          interactive.sourceLayerMappings.filter((l) => !l.isSkipped).length,
        );
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
      factorsMap,
      interactive,
      autoMatchedNames,
      autoMatchStats,
      focusMode,
      toggleFocusMode,
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
      factorsMap,
      interactive,
      autoMatchedNames,
      autoMatchStats,
      focusMode,
      toggleFocusMode,
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
