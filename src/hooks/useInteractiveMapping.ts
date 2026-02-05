"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  MappingResult,
  ModelMapping,
  Confidence,
  SubmodelMapping,
  EffectTree,
  GroupScenario,
} from "@/lib/modiq";
import type { ParsedModel } from "@/lib/modiq";
import {
  suggestMatches,
  suggestMatchesForSource,
  mapSubmodels,
  isDmxModel,
} from "@/lib/modiq";

// ─── Types ──────────────────────────────────────────────

export interface DestMapping {
  destModel: ParsedModel;
  sourceModel: ParsedModel | null;
  confidence: Confidence;
  score: number;
  reason: string;
  submodelMappings: SubmodelMapping[];
  isSkipped: boolean;
  isManualOverride: boolean;
  /** True if this model is auto-resolved by a parent group mapping */
  isCoveredByGroup: boolean;
  /** Name of the parent group that covers this model */
  coveredByGroupName: string | null;
}

type UndoAction =
  | {
      type: "assign";
      destName: string;
      prevSourceName: string | null;
      wasSkipped: boolean;
    }
  | { type: "clear"; destName: string; prevSourceName: string }
  | { type: "skip"; destName: string; prevSourceName: string | null }
  | {
      type: "swap";
      destNameA: string;
      prevSourceA: string;
      destNameB: string;
      prevSourceB: string;
    };

/** V3 source-first: one entry per source layer that needs mapping */
export interface SourceLayerMapping {
  sourceModel: ParsedModel;
  assignedUserModel: ParsedModel | null;
  isGroup: boolean;
  scenario: GroupScenario | null;
  memberNames: string[];
  membersWithEffects: string[];
  membersWithoutEffects: string[];
  isAllEncompassing: boolean;
  /** How many children are auto-resolved by mapping this group */
  coveredChildCount: number;
  isSkipped: boolean;
  isMapped: boolean;
}

export interface InteractiveMappingState {
  // ── V2 dest-centric (kept for xmap export) ──
  destMappings: DestMapping[];
  availableSourceModels: ParsedModel[];
  allSourceModels: ParsedModel[];
  allDestModels: ParsedModel[];
  assignedSourceNames: Set<string>;
  assignSource: (destModelName: string, sourceModelName: string) => void;
  clearMapping: (destModelName: string) => void;
  skipModel: (destModelName: string) => void;
  unskipModel: (destModelName: string) => void;
  swapMappings: (destNameA: string, destNameB: string) => void;
  undo: () => void;
  canUndo: boolean;
  mappedCount: number;
  totalDest: number;
  skippedCount: number;
  mappedPercentage: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unmappedCount: number;
  coveredByGroupCount: number;
  effectTree: EffectTree | null;
  toMappingResult: () => MappingResult;
  nextUnmappedDest: () => string | null;
  getSuggestions: (destModel: ParsedModel) => ReturnType<typeof suggestMatches>;

  // ── V3 source-first (the primary UI view) ──
  sourceLayerMappings: SourceLayerMapping[];
  /** Assign a user model to a source layer (replacing any previous assignment) */
  assignUserModelToLayer: (sourceLayerName: string, userModelName: string) => void;
  /** Clear a source layer's user model assignment */
  clearLayerMapping: (sourceLayerName: string) => void;
  /** Skip a source layer (remove from task list) */
  skipSourceLayer: (sourceLayerName: string) => void;
  /** Unskip a source layer */
  unskipSourceLayer: (sourceLayerName: string) => void;
  /** Get ranked user model suggestions for a source layer */
  getSuggestionsForLayer: (sourceModel: ParsedModel) => ReturnType<typeof suggestMatchesForSource>;
  /** Set of user model names currently assigned to source layers */
  assignedUserModelNames: Set<string>;
  /** Source-centric stats */
  totalSourceLayers: number;
  mappedLayerCount: number;
  skippedLayerCount: number;
  groupsMappedCount: number;
  groupsCoveredChildCount: number;
  directMappedCount: number;
  unmappedLayerCount: number;
  coveragePercentage: number;
  /** Find next unmapped source layer */
  nextUnmappedLayer: () => string | null;
}

// ─── Hook ───────────────────────────────────────────────

export function useInteractiveMapping(
  initialResult: MappingResult | null,
  sourceModels: ParsedModel[],
  destModels: ParsedModel[],
  effectTree?: EffectTree | null,
): InteractiveMappingState {
  // Core state: dest model name → source model name (or null)
  // Only include auto-mappings that reached a real confidence tier (HIGH/MED/LOW).
  // "unmapped" confidence means the score was too low to be useful — these should
  // start as truly unmapped so they show suggestions instead of a limbo state.
  const [assignments, setAssignments] = useState<Map<string, string | null>>(
    () => {
      if (!initialResult) return new Map();
      const map = new Map<string, string | null>();
      for (const m of initialResult.mappings) {
        if (m.destModel && m.confidence !== "unmapped") {
          map.set(m.destModel.name, m.sourceModel.name);
        }
      }
      return map;
    },
  );
  const [skipped, setSkipped] = useState<Set<string>>(() => {
    // Auto-skip DMX dest models — they're non-pixel fixtures and should
    // never appear as "unmapped" or count in the export warning.
    const dmxSkipped = new Set<string>();
    for (const dm of destModels) {
      if (isDmxModel(dm)) dmxSkipped.add(dm.name);
    }
    return dmxSkipped;
  });
  const [overrides, setOverrides] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Lookup maps
  const sourceByName = useMemo(() => {
    const map = new Map<string, ParsedModel>();
    for (const m of sourceModels) map.set(m.name, m);
    return map;
  }, [sourceModels]);

  const destByName = useMemo(() => {
    const map = new Map<string, ParsedModel>();
    for (const m of destModels) map.set(m.name, m);
    return map;
  }, [destModels]);

  // Group coverage: dest member name → parent dest group name
  // When a dest group has a source assignment, its member children
  // that don't have their own explicit assignment are "covered".
  const groupCovered = useMemo(() => {
    const map = new Map<string, string>();
    for (const dm of destModels) {
      if (
        dm.isGroup &&
        dm.memberModels.length > 0 &&
        assignments.has(dm.name)
      ) {
        for (const memberName of dm.memberModels) {
          // Only cover members that exist as dest models,
          // don't have their own assignment, and aren't skipped
          if (
            destByName.has(memberName) &&
            !assignments.has(memberName) &&
            !skipped.has(memberName)
          ) {
            map.set(memberName, dm.name);
          }
        }
      }
    }
    return map;
  }, [destModels, assignments, skipped, destByName]);

  // Original auto-mapping lookup: destName → ModelMapping
  const autoMappingByDest = useMemo(() => {
    if (!initialResult) return new Map<string, ModelMapping>();
    const map = new Map<string, ModelMapping>();
    for (const m of initialResult.mappings) {
      if (m.destModel) {
        map.set(m.destModel.name, m);
      }
    }
    return map;
  }, [initialResult]);

  // Set of source names currently assigned
  const assignedSourceNames = useMemo(() => {
    const set = new Set<string>();
    for (const srcName of assignments.values()) {
      if (srcName) set.add(srcName);
    }
    return set;
  }, [assignments]);

  // Available (unassigned, non-DMX) source models
  const availableSourceModels = useMemo(
    () =>
      sourceModels.filter(
        (m) => !assignedSourceNames.has(m.name) && !isDmxModel(m),
      ),
    [sourceModels, assignedSourceNames],
  );

  // Build dest-centric mapping view
  const destMappings: DestMapping[] = useMemo(() => {
    return destModels.map((destModel) => {
      const isSkippedModel = skipped.has(destModel.name);

      // Skipped models always render as skipped, regardless of assignments
      if (isSkippedModel) {
        return {
          destModel,
          sourceModel: null,
          confidence: "unmapped" as Confidence,
          score: 0,
          reason: "Skipped by user",
          submodelMappings: [],
          isSkipped: true,
          isManualOverride: false,
          isCoveredByGroup: false,
          coveredByGroupName: null,
        };
      }

      // Check individual assignment first (takes priority over group coverage)
      const srcName = assignments.get(destModel.name) ?? null;
      const srcModel = srcName ? (sourceByName.get(srcName) ?? null) : null;
      const isOverride = overrides.has(destModel.name);

      // Use original auto-mapping data if not overridden
      const autoMapping = autoMappingByDest.get(destModel.name);
      if (autoMapping && srcModel && !isOverride) {
        return {
          destModel,
          sourceModel: srcModel,
          confidence: autoMapping.confidence,
          score: autoMapping.score,
          reason: autoMapping.reason,
          submodelMappings: autoMapping.submodelMappings,
          isSkipped: false,
          isManualOverride: false,
          isCoveredByGroup: false,
          coveredByGroupName: null,
        };
      }

      if (srcModel) {
        const subs = mapSubmodels(srcModel, destModel);
        return {
          destModel,
          sourceModel: srcModel,
          confidence: "medium" as Confidence,
          score: 0.6,
          reason: "Manual mapping",
          submodelMappings: subs,
          isSkipped: false,
          isManualOverride: true,
          isCoveredByGroup: false,
          coveredByGroupName: null,
        };
      }

      // No individual assignment — check if covered by parent group
      const coveringGroup = groupCovered.get(destModel.name);
      if (coveringGroup) {
        return {
          destModel,
          sourceModel: null,
          confidence: "high" as Confidence,
          score: 1.0,
          reason: `Covered by group: ${coveringGroup}`,
          submodelMappings: [],
          isSkipped: false,
          isManualOverride: false,
          isCoveredByGroup: true,
          coveredByGroupName: coveringGroup,
        };
      }

      return {
        destModel,
        sourceModel: null,
        confidence: "unmapped" as Confidence,
        score: 0,
        reason: "No match assigned",
        submodelMappings: [],
        isSkipped: false,
        isManualOverride: false,
        isCoveredByGroup: false,
        coveredByGroupName: null,
      };
    });
  }, [
    destModels,
    assignments,
    skipped,
    overrides,
    groupCovered,
    sourceByName,
    autoMappingByDest,
  ]);

  // Stats — single pass
  const stats = useMemo(() => {
    let mapped = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let unmapped = 0;
    let covered = 0;
    for (const dm of destMappings) {
      if (dm.isCoveredByGroup) {
        covered++;
        mapped++; // Count as mapped for percentage
      } else if (dm.sourceModel) {
        mapped++;
        if (dm.confidence === "high") high++;
        else if (dm.confidence === "medium") medium++;
        else if (dm.confidence === "low") low++;
      } else if (!dm.isSkipped) {
        unmapped++;
      }
    }
    const skippedSize = skipped.size;
    const total = destModels.length;
    const effective = total - skippedSize;
    const pct = effective > 0 ? Math.round((mapped / effective) * 1000) / 10 : 0;
    return { mapped, high, medium, low, unmapped, covered, skippedSize, total, pct };
  }, [destMappings, skipped, destModels.length]);

  const mappedCount = stats.mapped;
  const skippedCount = stats.skippedSize;
  const totalDest = stats.total;
  const mappedPercentage = stats.pct;
  const highCount = stats.high;
  const mediumCount = stats.medium;
  const lowCount = stats.low;
  const unmappedCount = stats.unmapped;

  // Actions
  const assignSource = useCallback(
    (destModelName: string, sourceModelName: string) => {
      const prevSrc = assignments.get(destModelName) ?? null;
      const wasSkipped = skipped.has(destModelName);
      setUndoStack((s) => [
        ...s,
        {
          type: "assign",
          destName: destModelName,
          prevSourceName: prevSrc,
          wasSkipped,
        },
      ]);
      setAssignments((prev) => {
        const next = new Map(prev);
        next.set(destModelName, sourceModelName);
        return next;
      });
      setSkipped((prev) => {
        const next = new Set(prev);
        next.delete(destModelName);
        return next;
      });
      setOverrides((prev) => new Set(prev).add(destModelName));
    },
    [assignments, skipped],
  );

  const clearMapping = useCallback(
    (destModelName: string) => {
      const prevSrc = assignments.get(destModelName) ?? null;
      if (!prevSrc) return;
      setUndoStack((s) => [
        ...s,
        { type: "clear", destName: destModelName, prevSourceName: prevSrc },
      ]);
      setAssignments((prev) => {
        const next = new Map(prev);
        next.delete(destModelName);
        return next;
      });
      setOverrides((prev) => {
        const next = new Set(prev);
        next.delete(destModelName);
        return next;
      });
    },
    [assignments],
  );

  const skipModel = useCallback(
    (destModelName: string) => {
      const prevSrc = assignments.get(destModelName) ?? null;
      setUndoStack((s) => [
        ...s,
        { type: "skip", destName: destModelName, prevSourceName: prevSrc },
      ]);
      setAssignments((prev) => {
        const next = new Map(prev);
        next.delete(destModelName);
        return next;
      });
      setSkipped((prev) => new Set(prev).add(destModelName));
    },
    [assignments],
  );

  const unskipModel = useCallback((destModelName: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.delete(destModelName);
      return next;
    });
  }, []);

  const swapMappings = useCallback(
    (destNameA: string, destNameB: string) => {
      const srcA = assignments.get(destNameA) ?? null;
      const srcB = assignments.get(destNameB) ?? null;
      if (!srcA || !srcB) return; // both must be mapped to swap

      setUndoStack((s) => [
        ...s,
        {
          type: "swap",
          destNameA,
          prevSourceA: srcA,
          destNameB,
          prevSourceB: srcB,
        },
      ]);
      setAssignments((prev) => {
        const next = new Map(prev);
        next.set(destNameA, srcB);
        next.set(destNameB, srcA);
        return next;
      });
      setOverrides((prev) => {
        const next = new Set(prev);
        next.add(destNameA);
        next.add(destNameB);
        return next;
      });
    },
    [assignments],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const action = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);

      if (action.type === "assign") {
        setAssignments((prev) => {
          const next = new Map(prev);
          if (action.prevSourceName) {
            next.set(action.destName, action.prevSourceName);
          } else {
            next.delete(action.destName);
          }
          return next;
        });
        if (action.wasSkipped) {
          setSkipped((prev) => new Set(prev).add(action.destName));
        }
        setOverrides((prev) => {
          const next = new Set(prev);
          next.delete(action.destName);
          return next;
        });
      } else if (action.type === "clear") {
        setAssignments((prev) => {
          const next = new Map(prev);
          next.set(action.destName, action.prevSourceName);
          return next;
        });
      } else if (action.type === "skip") {
        setSkipped((prev) => {
          const next = new Set(prev);
          next.delete(action.destName);
          return next;
        });
        if (action.prevSourceName) {
          setAssignments((prev) => {
            const next = new Map(prev);
            next.set(action.destName, action.prevSourceName!);
            return next;
          });
        }
      } else if (action.type === "swap") {
        setAssignments((prev) => {
          const next = new Map(prev);
          next.set(action.destNameA, action.prevSourceA);
          next.set(action.destNameB, action.prevSourceB);
          return next;
        });
      }

      return newStack;
    });
  }, []);

  // Reconstruct source-centric MappingResult for export
  const toMappingResult = useCallback((): MappingResult => {
    // Build reverse map: source name → dest name
    const srcToDest = new Map<string, string>();
    for (const [destName, srcName] of assignments) {
      if (srcName) srcToDest.set(srcName, destName);
    }

    const mappings: ModelMapping[] = [];

    for (const src of sourceModels) {
      const destName = srcToDest.get(src.name);
      const dest = destName ? (destByName.get(destName) ?? null) : null;

      if (dest) {
        const autoMapping = autoMappingByDest.get(dest.name);
        const isOverride = overrides.has(dest.name);

        if (autoMapping && !isOverride) {
          mappings.push(autoMapping);
        } else {
          const subs = mapSubmodels(src, dest);
          mappings.push({
            sourceModel: src,
            destModel: dest,
            score: 0.6,
            confidence: "medium",
            factors: {
              name: 0.6,
              spatial: 0.5,
              shape: 0.5,
              type: 0.5,
              pixels: 0.5,
            },
            reason: "Manual mapping",
            submodelMappings: subs,
          });
        }
      } else {
        mappings.push({
          sourceModel: src,
          destModel: null,
          score: 0,
          confidence: "unmapped",
          factors: { name: 0, spatial: 0, shape: 0, type: 0, pixels: 0 },
          reason: "No suitable match found in your layout.",
          submodelMappings: [],
        });
      }
    }

    const mapped = mappings.filter((m) => m.destModel !== null);
    const usedDestNames = new Set(mapped.map((m) => m.destModel!.name));
    const unusedDestModels = destModels.filter(
      (m) => !usedDestNames.has(m.name),
    );

    return {
      mappings,
      totalSource: sourceModels.length,
      totalDest: destModels.length,
      mappedCount: mapped.length,
      highConfidence: mapped.filter((m) => m.confidence === "high").length,
      mediumConfidence: mapped.filter((m) => m.confidence === "medium").length,
      lowConfidence: mapped.filter((m) => m.confidence === "low").length,
      unmappedSource: sourceModels.length - mapped.length,
      unmappedDest: unusedDestModels.length,
      unusedDestModels,
    };
  }, [
    assignments,
    overrides,
    sourceModels,
    destModels,
    destByName,
    autoMappingByDest,
  ]);

  // Navigation: find next unmapped dest model name
  const nextUnmappedDest = useCallback((): string | null => {
    for (const dm of destModels) {
      if (
        !assignments.has(dm.name) &&
        !skipped.has(dm.name) &&
        !groupCovered.has(dm.name)
      ) {
        return dm.name;
      }
    }
    return null;
  }, [destModels, assignments, skipped, groupCovered]);

  // Suggestions helper (V2 — dest-centric)
  const getSuggestions = useCallback(
    (destModel: ParsedModel) => {
      return suggestMatches(
        destModel,
        availableSourceModels,
        sourceModels,
        destModels,
      );
    },
    [availableSourceModels, sourceModels, destModels],
  );

  // ═══════════════════════════════════════════════════════════════
  // V3 Source-First View
  // ═══════════════════════════════════════════════════════════════

  // Skipped source layers (separate from dest skips)
  const [skippedSourceLayers, setSkippedSourceLayers] = useState<Set<string>>(
    new Set(),
  );

  // Inverse map: source name → user (dest) model name
  const sourceToUserMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [destName, srcName] of assignments) {
      if (srcName) map.set(srcName, destName);
    }
    return map;
  }, [assignments]);

  // Set of user model names currently assigned to any source layer
  const assignedUserModelNames = useMemo(() => {
    const set = new Set<string>();
    for (const [destName, srcName] of assignments) {
      if (srcName) set.add(destName);
    }
    return set;
  }, [assignments]);

  // Build source-layer mappings from effect tree
  const sourceLayerMappings: SourceLayerMapping[] = useMemo(() => {
    if (!effectTree) return [];

    const layers: SourceLayerMapping[] = [];

    // Groups with effects (Scenario A and B — C are individual-only)
    for (const gInfo of effectTree.groupsWithEffects) {
      if (gInfo.scenario === "C") continue;
      const userModelName = sourceToUserMap.get(gInfo.model.name);
      const userModel = userModelName
        ? destByName.get(userModelName) ?? null
        : null;

      // Count children resolved by mapping this group
      // For non-all-encompassing groups: members without individual effects
      let coveredChildCount = 0;
      if (userModel && !gInfo.isAllEncompassing) {
        coveredChildCount = gInfo.membersWithoutEffects.length;
      }

      layers.push({
        sourceModel: gInfo.model,
        assignedUserModel: userModel,
        isGroup: true,
        scenario: gInfo.scenario,
        memberNames: gInfo.model.memberModels,
        membersWithEffects: gInfo.membersWithEffects,
        membersWithoutEffects: gInfo.membersWithoutEffects,
        isAllEncompassing: gInfo.isAllEncompassing,
        coveredChildCount,
        isSkipped: skippedSourceLayers.has(gInfo.model.name),
        isMapped: !!userModel,
      });
    }

    // Individual models needing mapping
    for (const mInfo of effectTree.modelsWithEffects) {
      if (!mInfo.needsIndividualMapping) continue;
      const userModelName = sourceToUserMap.get(mInfo.model.name);
      const userModel = userModelName
        ? destByName.get(userModelName) ?? null
        : null;

      layers.push({
        sourceModel: mInfo.model,
        assignedUserModel: userModel,
        isGroup: false,
        scenario: null,
        memberNames: [],
        membersWithEffects: [],
        membersWithoutEffects: [],
        isAllEncompassing: false,
        coveredChildCount: 0,
        isSkipped: skippedSourceLayers.has(mInfo.model.name),
        isMapped: !!userModel,
      });
    }

    return layers;
  }, [effectTree, sourceToUserMap, destByName, skippedSourceLayers]);

  // V3 source-centric stats
  const sourceStats = useMemo(() => {
    let mapped = 0;
    let groupsMapped = 0;
    let coveredChildren = 0;
    let direct = 0;
    let unmapped = 0;
    let skippedLayers = 0;
    const total = sourceLayerMappings.length;

    for (const sl of sourceLayerMappings) {
      if (sl.isSkipped) {
        skippedLayers++;
        continue;
      }
      if (sl.isMapped) {
        mapped++;
        if (sl.isGroup) {
          groupsMapped++;
          coveredChildren += sl.coveredChildCount;
        } else {
          direct++;
        }
      } else {
        unmapped++;
      }
    }

    const effective = total - skippedLayers;
    const pct =
      effective > 0 ? Math.round((mapped / effective) * 1000) / 10 : 0;

    return {
      total,
      mapped,
      groupsMapped,
      coveredChildren,
      direct,
      unmapped,
      skippedLayers,
      pct,
    };
  }, [sourceLayerMappings]);

  // V3 actions

  /** Assign a user model to a source layer, clearing any previous assignment */
  const assignUserModelToLayer = useCallback(
    (sourceLayerName: string, userModelName: string) => {
      // Find any user model currently assigned to this source layer
      const existingUserModel = sourceToUserMap.get(sourceLayerName);
      if (existingUserModel && existingUserModel !== userModelName) {
        // Clear the old assignment
        clearMapping(existingUserModel);
      }
      // Assign: user model (dest) → source layer (source)
      assignSource(userModelName, sourceLayerName);
    },
    [sourceToUserMap, clearMapping, assignSource],
  );

  /** Clear a source layer's mapping by finding and removing the assigned user model */
  const clearLayerMapping = useCallback(
    (sourceLayerName: string) => {
      const userModelName = sourceToUserMap.get(sourceLayerName);
      if (userModelName) {
        clearMapping(userModelName);
      }
    },
    [sourceToUserMap, clearMapping],
  );

  const skipSourceLayer = useCallback((sourceLayerName: string) => {
    // Also clear any existing assignment
    const userModelName = sourceToUserMap.get(sourceLayerName);
    if (userModelName) {
      clearMapping(userModelName);
    }
    setSkippedSourceLayers((prev) => new Set(prev).add(sourceLayerName));
  }, [sourceToUserMap, clearMapping]);

  const unskipSourceLayer = useCallback((sourceLayerName: string) => {
    setSkippedSourceLayers((prev) => {
      const next = new Set(prev);
      next.delete(sourceLayerName);
      return next;
    });
  }, []);

  // V3 suggestions: given a source layer, rank user models
  const getSuggestionsForLayer = useCallback(
    (sourceModel: ParsedModel) => {
      // Filter dest models: exclude DMX, include unassigned + currently assigned to this source
      const currentUserModel = sourceToUserMap.get(sourceModel.name);
      const pool = destModels.filter(
        (m) =>
          !isDmxModel(m) &&
          (!assignedUserModelNames.has(m.name) ||
            m.name === currentUserModel),
      );
      return suggestMatchesForSource(
        sourceModel,
        pool,
        sourceModels,
        destModels,
      );
    },
    [
      destModels,
      sourceModels,
      sourceToUserMap,
      assignedUserModelNames,
    ],
  );

  // V3 navigation: find next unmapped source layer
  const nextUnmappedLayer = useCallback((): string | null => {
    for (const sl of sourceLayerMappings) {
      if (!sl.isMapped && !sl.isSkipped) {
        return sl.sourceModel.name;
      }
    }
    return null;
  }, [sourceLayerMappings]);

  return {
    // V2 dest-centric
    destMappings,
    availableSourceModels,
    allSourceModels: sourceModels,
    allDestModels: destModels,
    assignedSourceNames,
    assignSource,
    clearMapping,
    skipModel,
    unskipModel,
    swapMappings,
    undo,
    canUndo: undoStack.length > 0,
    mappedCount,
    totalDest,
    skippedCount,
    mappedPercentage,
    highCount,
    mediumCount,
    lowCount,
    unmappedCount,
    coveredByGroupCount: stats.covered,
    effectTree: effectTree ?? null,
    toMappingResult,
    nextUnmappedDest,
    getSuggestions,

    // V3 source-first
    sourceLayerMappings,
    assignUserModelToLayer,
    clearLayerMapping,
    skipSourceLayer,
    unskipSourceLayer,
    getSuggestionsForLayer,
    assignedUserModelNames,
    totalSourceLayers: sourceStats.total,
    mappedLayerCount: sourceStats.mapped,
    skippedLayerCount: sourceStats.skippedLayers,
    groupsMappedCount: sourceStats.groupsMapped,
    groupsCoveredChildCount: sourceStats.coveredChildren,
    directMappedCount: sourceStats.direct,
    unmappedLayerCount: sourceStats.unmapped,
    coveragePercentage: sourceStats.pct,
    nextUnmappedLayer,
  };
}
