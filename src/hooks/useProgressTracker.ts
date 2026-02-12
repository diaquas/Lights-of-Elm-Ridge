"use client";

import { useMemo, useState } from "react";
import type { InteractiveMappingState, SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import type { MappingPhase } from "@/types/mappingPhases";
import { PHASE_CONFIG } from "@/types/mappingPhases";

// ─── Types ──────────────────────────────────────────────

export interface PhaseBreakdown {
  phase: string;
  phaseId: MappingPhase;
  items: number;
  displayGain: number;
  effectsGain: number;
  isActive: boolean;
  isComplete: boolean;
}

export interface EffectTypeEntry {
  type: string;
  count: number;
  captured: number;
  isSignature: boolean;
}

export interface SignatureEffectEntry {
  type: string;
  count: number;
  isMapped: boolean;
  mappedTo: string | null;
}

export interface ProgressTrackerState {
  /** Display coverage: what % of user's layout models have received mappings */
  display: {
    current: number;
    total: number;
    percent: number;
  };
  /** Effects coverage: what % of sequence effects are mapped */
  effects: {
    current: number;
    total: number;
    percent: number;
  };
  /** Gains since auto-match baseline */
  gains: {
    displayModels: number;
    displayPercent: number;
    effectsCount: number;
    effectsPercent: number;
  };
  /** Per-phase breakdown */
  phases: PhaseBreakdown[];
  /** Items mapped per phase category */
  itemsMapped: {
    groups: { mapped: number; total: number; percent: number };
    models: { mapped: number; total: number; percent: number };
    submodelGroups: { mapped: number; total: number; percent: number };
  };
  /** Effect type breakdown */
  effectTypes: EffectTypeEntry[];
  /** Signature effect status */
  signatureEffects: SignatureEffectEntry[];
  /** Total items auto-matched */
  autoMatchedCount: number;
}

/** Effect types considered "signature" (high-value, unique to sequence) */
const SIGNATURE_EFFECT_TYPES = [
  "Video",
  "Morph",
  "Faces",
  "Shader",
  "Fire",
  "Glediator",
  "Pictures",
];

// ─── Hook ──────────────────────────────────────────────

export function useProgressTracker(
  interactive: InteractiveMappingState,
  currentPhase: MappingPhase,
  getPhaseItems: (phase: MappingPhase) => SourceLayerMapping[],
): ProgressTrackerState {
  const { displayCoverage, effectsCoverage, sourceLayerMappings } = interactive;

  // Capture the auto-match baseline (first render values, never recalculates).
  // Using useState initializer to capture baseline once, stable across re-renders.
  const [baseline] = useState(() => {
    if (sourceLayerMappings.length > 0) {
      return {
        displayCurrent: displayCoverage.covered,
        displayPercent: displayCoverage.percent,
        effectsCurrent: effectsCoverage.covered,
        effectsPercent: effectsCoverage.percent,
      };
    }
    return {
      displayCurrent: 0,
      displayPercent: 0,
      effectsCurrent: 0,
      effectsPercent: 0,
    };
  });

  // Compute gains since auto-match
  const gains = useMemo(
    () => ({
      displayModels: displayCoverage.covered - baseline.displayCurrent,
      displayPercent: displayCoverage.percent - baseline.displayPercent,
      effectsCount: effectsCoverage.covered - baseline.effectsCurrent,
      effectsPercent: effectsCoverage.percent - baseline.effectsPercent,
    }),
    [displayCoverage, effectsCoverage, baseline],
  );

  // Phase breakdown
  const phases = useMemo((): PhaseBreakdown[] => {
    const currentIndex = PHASE_CONFIG.findIndex((p) => p.id === currentPhase);

    return PHASE_CONFIG.map((config, index) => {
      const items = getPhaseItems(config.id);
      const mapped = items.filter((i) => i.isMapped).length;

      return {
        phase: config.label,
        phaseId: config.id,
        items: mapped,
        displayGain: 0, // Computed per-phase gains would require per-phase snapshots
        effectsGain: 0,
        isActive: index === currentIndex,
        isComplete: index < currentIndex,
      };
    });
  }, [currentPhase, getPhaseItems]);

  // Items mapped per category
  const itemsMapped = useMemo(() => {
    const allItems = getPhaseItems("individuals");
    const groupItems = allItems.filter((i) => i.isGroup);
    const modelItems = allItems.filter((i) => !i.isGroup);
    const spinnerItems = getPhaseItems("spinners");

    const compute = (items: SourceLayerMapping[]) => {
      const total = items.length;
      const mapped = items.filter((i) => i.isMapped).length;
      return {
        mapped,
        total,
        percent: total > 0 ? Math.round((mapped / total) * 100) : 100,
      };
    };

    return {
      groups: compute(groupItems),
      models: compute(modelItems),
      submodelGroups: compute(spinnerItems),
    };
  }, [getPhaseItems]);

  // Effect type breakdown
  const effectTypes = useMemo((): EffectTypeEntry[] => {
    const typeMap = new Map<string, { count: number; captured: number }>();

    for (const layer of sourceLayerMappings) {
      if (layer.isSkipped || !layer.effectTypeCounts) continue;

      for (const [effectType, count] of Object.entries(layer.effectTypeCounts)) {
        const existing = typeMap.get(effectType) ?? { count: 0, captured: 0 };
        existing.count += count;
        if (layer.isMapped) existing.captured += count;
        typeMap.set(effectType, existing);
      }
    }

    return Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        captured: data.captured,
        isSignature: SIGNATURE_EFFECT_TYPES.includes(type),
      }))
      .sort((a, b) => b.captured - a.captured);
  }, [sourceLayerMappings]);

  // Signature effects status
  const signatureEffects = useMemo((): SignatureEffectEntry[] => {
    const sigMap = new Map<
      string,
      { count: number; isMapped: boolean; mappedTo: string | null }
    >();

    for (const layer of sourceLayerMappings) {
      if (layer.isSkipped || !layer.effectTypeCounts) continue;

      for (const [effectType, count] of Object.entries(layer.effectTypeCounts)) {
        if (!SIGNATURE_EFFECT_TYPES.includes(effectType)) continue;

        const existing = sigMap.get(effectType) ?? {
          count: 0,
          isMapped: false,
          mappedTo: null,
        };
        existing.count += count;
        if (layer.isMapped && layer.assignedUserModels.length > 0) {
          existing.isMapped = true;
          existing.mappedTo = layer.assignedUserModels[0].name;
        }
        sigMap.set(effectType, existing);
      }
    }

    return Array.from(sigMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        isMapped: data.isMapped,
        mappedTo: data.mappedTo,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sourceLayerMappings]);

  // Auto-matched count (items mapped in auto-accept phase)
  const autoMatchedCount = useMemo(() => {
    const autoItems = getPhaseItems("auto-accept");
    return autoItems.filter((i) => i.isMapped).length;
  }, [getPhaseItems]);

  return {
    display: {
      current: displayCoverage.covered,
      total: displayCoverage.total,
      percent: displayCoverage.percent,
    },
    effects: {
      current: effectsCoverage.covered,
      total: effectsCoverage.total,
      percent: effectsCoverage.percent,
    },
    gains,
    phases,
    itemsMapped,
    effectTypes,
    signatureEffects,
    autoMatchedCount,
  };
}
