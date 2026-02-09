"use client";

import { useState, useMemo, useCallback, useRef, startTransition } from "react";
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
  getSequenceEffectCounts,
  getSequenceEffectTypeCounts,
  analyzeSequenceEffects,
  findHiddenGems,
  getEffectSuggestionContext,
} from "@/lib/modiq";
import type {
  SequenceEffectAnalysis,
  HiddenGem,
  EffectSuggestionContext,
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
  // V2 dest-centric
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
    }
  // V3 many-to-many links
  | { type: "v3_addLink"; sourceName: string; destName: string }
  | { type: "v3_removeLink"; sourceName: string; destName: string }
  | { type: "v3_clearLayer"; sourceName: string; prevDests: string[] }
  | { type: "v3_skipLayer"; sourceName: string; prevDests: string[] };

/** V3 source-first: one entry per source layer that needs mapping */
export interface SourceLayerMapping {
  sourceModel: ParsedModel;
  /** All user models linked to this source layer (many-to-one support) */
  assignedUserModels: ParsedModel[];
  isGroup: boolean;
  scenario: GroupScenario | null;
  memberNames: string[];
  membersWithEffects: string[];
  membersWithoutEffects: string[];
  isAllEncompassing: boolean;
  /** How many children are auto-resolved by mapping this group */
  coveredChildCount: number;
  isSkipped: boolean;
  /** True if at least one user model is assigned */
  isMapped: boolean;
  /** Number of effects for this model in the current sequence */
  effectCount: number;
  /** Per-effect-type breakdown (e.g., { Faces: 29, Plasma: 8 }) */
  effectTypeCounts?: Record<string, number>;
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
  /** Add a link from user model to source layer (additive, many-to-one) */
  assignUserModelToLayer: (
    sourceLayerName: string,
    userModelName: string,
  ) => void;
  /** Remove a specific link from a source layer to a user model */
  removeLinkFromLayer: (sourceName: string, destName: string) => void;
  /** Clear ALL user model links for a source layer */
  clearLayerMapping: (sourceLayerName: string) => void;
  /** Skip a source layer (remove from task list) */
  skipSourceLayer: (sourceLayerName: string) => void;
  /** Unskip a source layer */
  unskipSourceLayer: (sourceLayerName: string) => void;
  /** Get ranked user model suggestions for a source layer */
  getSuggestionsForLayer: (
    sourceModel: ParsedModel,
  ) => ReturnType<typeof suggestMatchesForSource>;
  /** Set of user model names currently assigned to any source layer */
  assignedUserModelNames: Set<string>;
  /** Inverse map: dest name → set of source names it's linked to (for right panel indicators) */
  destToSourcesMap: Map<string, Set<string>>;
  /** Source-centric stats */
  totalSourceLayers: number;
  mappedLayerCount: number;
  skippedLayerCount: number;
  groupsMappedCount: number;
  groupsCoveredChildCount: number;
  directMappedCount: number;
  unmappedLayerCount: number;
  coveragePercentage: number;
  /** Number of zero-effect items hidden from mapping (no visual impact) */
  hiddenZeroEffectCount: number;
  /** Find next unmapped source layer */
  nextUnmappedLayer: () => string | null;
  /** Effects-weighted coverage: what % of sequence effects are mapped to user models */
  effectsCoverage: { covered: number; total: number; percent: number };
  /** User display coverage: what % of user's layout models have received mappings */
  displayCoverage: { covered: number; total: number; percent: number };
  /** Sequence-wide effect analysis (types, categories, impact scores) */
  sequenceAnalysis: SequenceEffectAnalysis | null;
  /** High-impact unmapped effects (hidden gems) */
  hiddenGems: HiddenGem[];
  /** Get effect suggestion context for a specific source model */
  getEffectContext: (modelName: string) => EffectSuggestionContext | null;
  /** Serialize mapping state for session recovery */
  getSerializedState: () => {
    assignments: Record<string, string | null>;
    skipped: string[];
    overrides: string[];
    sourceDestLinks: Record<string, string[]>;
  };

  // ── Destination-side skipping ──
  /** Set of destination (user) model names skipped by the user */
  skippedDestModels: Set<string>;
  /** Skip a destination model (hide from suggestions and all-models list) */
  skipDestModel: (destName: string) => void;
  /** Restore a skipped destination model */
  unskipDestModel: (destName: string) => void;
  /** Restore all skipped destination models */
  unskipAllDestModels: () => void;
}

/** Items at or above this score bypass pre-mapping so they can be reviewed
 *  in the Auto-Accept phase first. Must match AUTO_ACCEPT_THRESHOLD in
 *  MappingPhaseContext.tsx. */
const AUTO_ACCEPT_SCORE_THRESHOLD = 0.7;

// ─── Hook ───────────────────────────────────────────────

export function useInteractiveMapping(
  initialResult: MappingResult | null,
  sourceModels: ParsedModel[],
  destModels: ParsedModel[],
  effectTree?: EffectTree | null,
  sequenceSlug?: string,
  externalEffectCounts?: Record<string, number> | null,
): InteractiveMappingState {
  // Core state: dest model name → source model name (or null)
  // Only include auto-mappings that reached a real confidence tier (HIGH/MED/LOW)
  // AND are below the auto-accept threshold. Items at 70%+ are left unmapped so
  // the Auto-Accept phase can show them for user review before confirming.
  const [assignments, setAssignments] = useState<Map<string, string | null>>(
    () => {
      if (!initialResult) return new Map();
      const map = new Map<string, string | null>();
      for (const m of initialResult.mappings) {
        if (
          m.destModel &&
          m.confidence !== "unmapped" &&
          m.score < AUTO_ACCEPT_SCORE_THRESHOLD
        ) {
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

  // V3 link state: source layer name → set of user (dest) model names
  // Declared here (with other state) so toMappingResult can reference it.
  // Items at 70%+ are excluded so the Auto-Accept phase can review them first.
  const [sourceDestLinks, setSourceDestLinks] = useState<
    Map<string, Set<string>>
  >(() => {
    if (!initialResult) return new Map();
    const map = new Map<string, Set<string>>();
    for (const m of initialResult.mappings) {
      if (
        m.destModel &&
        m.confidence !== "unmapped" &&
        m.score < AUTO_ACCEPT_SCORE_THRESHOLD
      ) {
        const set = map.get(m.sourceModel.name) ?? new Set();
        set.add(m.destModel.name);
        map.set(m.sourceModel.name, set);
      }
    }
    return map;
  });

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
    const pct =
      effective > 0 ? Math.round((mapped / effective) * 1000) / 10 : 0;
    return {
      mapped,
      high,
      medium,
      low,
      unmapped,
      covered,
      skippedSize,
      total,
      pct,
    };
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

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const action = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);

      // V2 undo actions
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

      // V3 undo actions (many-to-many links)
      else if (action.type === "v3_addLink") {
        setSourceDestLinks((prev) => {
          const next = new Map(prev);
          const set = new Set(next.get(action.sourceName) ?? []);
          set.delete(action.destName);
          if (set.size === 0) next.delete(action.sourceName);
          else next.set(action.sourceName, set);
          return next;
        });
      } else if (action.type === "v3_removeLink") {
        setSourceDestLinks((prev) => {
          const next = new Map(prev);
          const set = new Set(next.get(action.sourceName) ?? []);
          set.add(action.destName);
          next.set(action.sourceName, set);
          return next;
        });
      } else if (action.type === "v3_clearLayer") {
        setSourceDestLinks((prev) => {
          const next = new Map(prev);
          next.set(action.sourceName, new Set(action.prevDests));
          return next;
        });
      } else if (action.type === "v3_skipLayer") {
        setSkippedSourceLayers((prev) => {
          const next = new Set(prev);
          next.delete(action.sourceName);
          return next;
        });
        // Restore previous links
        if (action.prevDests.length > 0) {
          setSourceDestLinks((prev) => {
            const next = new Map(prev);
            next.set(action.sourceName, new Set(action.prevDests));
            return next;
          });
        }
      }

      return newStack;
    });
  }, []);

  // Reconstruct source-centric MappingResult for export
  // V3 mode uses sourceDestLinks (many-to-many), V2 uses assignments (one-to-one)
  const toMappingResult = useCallback((): MappingResult => {
    const mappings: ModelMapping[] = [];
    const usedDestNames = new Set<string>();

    // Check if V3 links are active
    const hasV3Links = sourceDestLinks.size > 0;

    if (hasV3Links) {
      // V3 mode: build from sourceDestLinks (supports many-to-one)
      for (const src of sourceModels) {
        const dests = sourceDestLinks.get(src.name);
        if (dests && dests.size > 0) {
          for (const destName of dests) {
            const dest = destByName.get(destName) ?? null;
            if (dest) {
              usedDestNames.add(destName);
              const autoMapping = autoMappingByDest.get(dest.name);
              const isOverride = overrides.has(dest.name);
              if (
                autoMapping &&
                !isOverride &&
                autoMapping.sourceModel.name === src.name
              ) {
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
                    structure: 0.5,
                  },
                  reason: "Manual mapping",
                  submodelMappings: subs,
                });
              }
            }
          }
        } else {
          mappings.push({
            sourceModel: src,
            destModel: null,
            score: 0,
            confidence: "unmapped",
            factors: {
              name: 0,
              spatial: 0,
              shape: 0,
              type: 0,
              pixels: 0,
              structure: 0,
            },
            reason: "No suitable match found in your layout.",
            submodelMappings: [],
          });
        }
      }
    } else {
      // V2 mode: build from assignments (one-to-one)
      const srcToDest = new Map<string, string>();
      for (const [destName, srcName] of assignments) {
        if (srcName) srcToDest.set(srcName, destName);
      }

      for (const src of sourceModels) {
        const destName = srcToDest.get(src.name);
        const dest = destName ? (destByName.get(destName) ?? null) : null;

        if (dest) {
          usedDestNames.add(dest.name);
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
                structure: 0.5,
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
            factors: {
              name: 0,
              spatial: 0,
              shape: 0,
              type: 0,
              pixels: 0,
              structure: 0,
            },
            reason: "No suitable match found in your layout.",
            submodelMappings: [],
          });
        }
      }
    }

    const mapped = mappings.filter((m) => m.destModel !== null);
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
    sourceDestLinks,
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
  // V3 Source-First View — Many-to-Many Links
  // ═══════════════════════════════════════════════════════════════

  // Skipped source layers (separate from dest skips)
  const [skippedSourceLayers, setSkippedSourceLayers] = useState<Set<string>>(
    new Set(),
  );

  // Skipped destination (user) models — hidden from suggestions and all-models list
  const [skippedDestModels, setSkippedDestModels] = useState<Set<string>>(
    new Set(),
  );

  // Derived: source → Set<destName> (from sourceDestLinks — already the right shape)
  // Inverse: dest → Set<sourceName> (for right panel assignment indicators)
  const destToSourcesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [srcName, dests] of sourceDestLinks) {
      for (const destName of dests) {
        const set = map.get(destName) ?? new Set();
        set.add(srcName);
        map.set(destName, set);
      }
    }
    return map;
  }, [sourceDestLinks]);

  // Set of user model names currently assigned to any source layer
  const assignedUserModelNames = useMemo(() => {
    const set = new Set<string>();
    for (const dests of sourceDestLinks.values()) {
      for (const destName of dests) {
        set.add(destName);
      }
    }
    return set;
  }, [sourceDestLinks]);

  // Build source-layer mappings from effect tree
  // Zero-effect items are filtered out — they have no visual impact and don't need mapping
  const { sourceLayerMappings, hiddenZeroEffectCount } = useMemo(() => {
    if (!effectTree)
      return {
        sourceLayerMappings: [] as SourceLayerMapping[],
        hiddenZeroEffectCount: 0,
      };

    // Get effect counts for current sequence (if available)
    // Use externally provided counts (from vendor .xsq parsing) if available,
    // otherwise fall back to hardcoded SEQUENCE_EFFECT_COUNTS for elm-ridge mode.
    const effectCounts =
      externalEffectCounts ??
      (sequenceSlug ? getSequenceEffectCounts(sequenceSlug) : undefined);

    // Get per-model effect type distributions (e.g., { Faces: 29, Plasma: 8 })
    const effectTypeMap = sequenceSlug
      ? getSequenceEffectTypeCounts(sequenceSlug)
      : undefined;

    const layers: SourceLayerMapping[] = [];

    // Groups with effects (Scenario A and B — C are individual-only)
    for (const gInfo of effectTree.groupsWithEffects) {
      if (gInfo.scenario === "C") continue;
      const destNames = sourceDestLinks.get(gInfo.model.name);
      const userModels: ParsedModel[] = [];
      if (destNames) {
        for (const dn of destNames) {
          const m = destByName.get(dn);
          if (m) userModels.push(m);
        }
      }

      // Count children resolved by mapping this group
      let coveredChildCount = 0;
      if (userModels.length > 0 && !gInfo.isAllEncompassing) {
        coveredChildCount = gInfo.membersWithoutEffects.length;
      }

      layers.push({
        sourceModel: gInfo.model,
        assignedUserModels: userModels,
        isGroup: true,
        scenario: gInfo.scenario,
        memberNames: gInfo.model.memberModels,
        membersWithEffects: gInfo.membersWithEffects,
        membersWithoutEffects: gInfo.membersWithoutEffects,
        isAllEncompassing: gInfo.isAllEncompassing,
        coveredChildCount,
        isSkipped: skippedSourceLayers.has(gInfo.model.name),
        isMapped: userModels.length > 0,
        effectCount: effectCounts?.[gInfo.model.name] ?? 0,
        effectTypeCounts: effectTypeMap?.[gInfo.model.name],
      });
    }

    // Individual models needing mapping
    for (const mInfo of effectTree.modelsWithEffects) {
      if (!mInfo.needsIndividualMapping) continue;
      const destNames = sourceDestLinks.get(mInfo.model.name);
      const userModels: ParsedModel[] = [];
      if (destNames) {
        for (const dn of destNames) {
          const m = destByName.get(dn);
          if (m) userModels.push(m);
        }
      }

      layers.push({
        sourceModel: mInfo.model,
        assignedUserModels: userModels,
        isGroup: false,
        scenario: null,
        memberNames: [],
        membersWithEffects: [],
        membersWithoutEffects: [],
        isAllEncompassing: false,
        coveredChildCount: 0,
        isSkipped: skippedSourceLayers.has(mInfo.model.name),
        isMapped: userModels.length > 0,
        effectCount: effectCounts?.[mInfo.model.name] ?? 0,
        effectTypeCounts: effectTypeMap?.[mInfo.model.name],
      });
    }

    // Filter out zero-effect items when effect counts are available.
    // These are groups/models that exist in the source layout and pass
    // the effect tree (via isModelInSequence prefix matching) but have
    // 0 direct effects in SEQUENCE_EFFECT_COUNTS for this sequence.
    if (effectCounts) {
      const filtered: SourceLayerMapping[] = [];
      let hidden = 0;
      for (const layer of layers) {
        if (layer.effectCount === 0) {
          hidden++;
        } else {
          filtered.push(layer);
        }
      }
      return { sourceLayerMappings: filtered, hiddenZeroEffectCount: hidden };
    }

    return { sourceLayerMappings: layers, hiddenZeroEffectCount: 0 };
  }, [
    effectTree,
    sourceDestLinks,
    destByName,
    skippedSourceLayers,
    sequenceSlug,
    externalEffectCounts,
  ]);

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

  // Effects-weighted coverage: what % of sequence visual effects are mapped
  const effectsCoverage = useMemo(() => {
    let total = 0;
    let covered = 0;
    for (const sl of sourceLayerMappings) {
      if (sl.isSkipped) continue;
      total += sl.effectCount;
      if (sl.isMapped) covered += sl.effectCount;
    }
    const percent = total > 0 ? Math.round((covered / total) * 100) : 100;
    return { covered, total, percent };
  }, [sourceLayerMappings]);

  // User display coverage: what % of the user's layout models are receiving effects
  const displayCoverage = useMemo(() => {
    // Total user models (excluding DMX and skipped dest models)
    const eligibleDest = destModels.filter(
      (m) => !isDmxModel(m) && !skippedDestModels.has(m.name),
    );
    const total = eligibleDest.length;

    // Build set of "covered" user model names:
    // 1. Directly assigned user models
    // 2. Children of assigned user groups (mapping a group covers its members)
    const coveredNames = new Set(assignedUserModelNames);
    for (const dm of destModels) {
      if (
        dm.isGroup &&
        dm.memberModels.length > 0 &&
        assignedUserModelNames.has(dm.name)
      ) {
        for (const memberName of dm.memberModels) {
          coveredNames.add(memberName);
        }
      }
    }

    const covered = eligibleDest.filter((m) =>
      coveredNames.has(m.name),
    ).length;
    const percent = total > 0 ? Math.round((covered / total) * 100) : 100;
    return { covered, total, percent };
  }, [destModels, assignedUserModelNames, skippedDestModels]);

  // V3 actions — many-to-many

  /** Add a link from user model to source layer (additive, never replaces) */
  const assignUserModelToLayer = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    (sourceLayerName: string, userModelName: string) => {
      // Check if this exact link already exists (no-op for duplicates)
      const existing = sourceDestLinks.get(sourceLayerName);
      if (existing?.has(userModelName)) return;

      // Use startTransition to keep UI responsive during state updates
      // This allows React to prioritize user interactions over re-renders
      startTransition(() => {
        setUndoStack((s) => [
          ...s,
          {
            type: "v3_addLink",
            sourceName: sourceLayerName,
            destName: userModelName,
          },
        ]);
        setSourceDestLinks((prev) => {
          const next = new Map(prev);
          const set = new Set(next.get(sourceLayerName) ?? []);
          set.add(userModelName);
          next.set(sourceLayerName, set);
          return next;
        });
        // Also update V2 assignments for compat (last-write wins for dest→source)
        setAssignments((prev) => {
          const next = new Map(prev);
          next.set(userModelName, sourceLayerName);
          return next;
        });
        // Unskip if it was skipped
        setSkippedSourceLayers((prev) => {
          if (!prev.has(sourceLayerName)) return prev;
          const next = new Set(prev);
          next.delete(sourceLayerName);
          return next;
        });
      });
    },
    [sourceDestLinks],
  );

  /** Remove a specific link from source layer to user model */
  const removeLinkFromLayer = useCallback(
    (sourceName: string, destName: string) => {
      const existing = sourceDestLinks.get(sourceName);
      if (!existing?.has(destName)) return;

      startTransition(() => {
        setUndoStack((s) => [
          ...s,
          { type: "v3_removeLink", sourceName, destName },
        ]);
        setSourceDestLinks((prev) => {
          const next = new Map(prev);
          const set = new Set(next.get(sourceName) ?? []);
          set.delete(destName);
          if (set.size === 0) next.delete(sourceName);
          else next.set(sourceName, set);
          return next;
        });
        // Clean up V2 assignments
        setAssignments((prev) => {
          if (prev.get(destName) === sourceName) {
            const next = new Map(prev);
            next.delete(destName);
            return next;
          }
          return prev;
        });
      });
    },
    [sourceDestLinks],
  );

  /** Clear ALL user model links for a source layer */
  const clearLayerMapping = useCallback(
    (sourceLayerName: string) => {
      const existing = sourceDestLinks.get(sourceLayerName);
      if (!existing || existing.size === 0) return;

      const prevDests = Array.from(existing);
      startTransition(() => {
        setUndoStack((s) => [
          ...s,
          { type: "v3_clearLayer", sourceName: sourceLayerName, prevDests },
        ]);
        setSourceDestLinks((prev) => {
          const next = new Map(prev);
          next.delete(sourceLayerName);
          return next;
        });
        // Clean up V2 assignments
        setAssignments((prev) => {
          const next = new Map(prev);
          for (const dn of prevDests) {
            if (next.get(dn) === sourceLayerName) next.delete(dn);
          }
          return next;
        });
      });
    },
    [sourceDestLinks],
  );

  const skipSourceLayer = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    (sourceLayerName: string) => {
      const existing = sourceDestLinks.get(sourceLayerName);
      const prevDests = existing ? Array.from(existing) : [];

      startTransition(() => {
        setUndoStack((s) => [
          ...s,
          { type: "v3_skipLayer", sourceName: sourceLayerName, prevDests },
        ]);

        // Clear links
        if (prevDests.length > 0) {
          setSourceDestLinks((prev) => {
            const next = new Map(prev);
            next.delete(sourceLayerName);
            return next;
          });
          setAssignments((prev) => {
            const next = new Map(prev);
            for (const dn of prevDests) {
              if (next.get(dn) === sourceLayerName) next.delete(dn);
            }
            return next;
          });
        }

        setSkippedSourceLayers((prev) => new Set(prev).add(sourceLayerName));
      });
    },
    [sourceDestLinks],
  );

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const unskipSourceLayer = useCallback((sourceLayerName: string) => {
    setSkippedSourceLayers((prev) => {
      const next = new Set(prev);
      next.delete(sourceLayerName);
      return next;
    });
  }, []);

  const skipDestModel = useCallback((destName: string) => {
    setSkippedDestModels((prev) => new Set(prev).add(destName));
  }, []);

  const unskipDestModel = useCallback((destName: string) => {
    setSkippedDestModels((prev) => {
      const next = new Set(prev);
      next.delete(destName);
      return next;
    });
  }, []);

  const unskipAllDestModels = useCallback(() => {
    setSkippedDestModels(new Set());
  }, []);

  // Stable effect type map for the current sequence (used by suggestions)
  const effectTypeMap = useMemo(
    () =>
      sequenceSlug ? getSequenceEffectTypeCounts(sequenceSlug) : undefined,
    [sequenceSlug],
  );

  // Full-pool suggestion cache: scored once per source model, never invalidated.
  // Results are filtered at read time to exclude currently-assigned user models.
  // This avoids expensive re-scoring when only the assigned set changes.
  const fullSuggestionCacheRef = useRef(
    new Map<string, ReturnType<typeof suggestMatchesForSource>>(),
  );

  // V3 suggestions: given a source layer, rank user models.
  // Scores are cached permanently (full pool); assigned models are filtered at read time.
  const getSuggestionsForLayer = useCallback(
    (sourceModel: ParsedModel) => {
      const cacheKey = sourceModel.name;
      let fullResults = fullSuggestionCacheRef.current.get(cacheKey);
      if (!fullResults) {
        const fullPool = destModels.filter((m) => !isDmxModel(m));
        fullResults = suggestMatchesForSource(
          sourceModel,
          fullPool,
          sourceModels,
          destModels,
          effectTypeMap?.[sourceModel.name],
        );
        fullSuggestionCacheRef.current.set(cacheKey, fullResults);
      }
      // Filter out currently-assigned and skipped user models at read time
      return fullResults.filter(
        (s) =>
          !assignedUserModelNames.has(s.model.name) &&
          !skippedDestModels.has(s.model.name),
      );
    },
    [
      destModels,
      sourceModels,
      assignedUserModelNames,
      skippedDestModels,
      effectTypeMap,
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

  // Sequence effect analysis: types, categories, impact scores
  const sequenceAnalysis = useMemo((): SequenceEffectAnalysis | null => {
    const effectCounts =
      externalEffectCounts ??
      (sequenceSlug ? getSequenceEffectCounts(sequenceSlug) : undefined);
    const effectTypeMap = sequenceSlug
      ? getSequenceEffectTypeCounts(sequenceSlug)
      : undefined;

    if (!effectCounts && !effectTypeMap) return null;

    return analyzeSequenceEffects(effectTypeMap ?? {}, effectCounts ?? {});
  }, [sequenceSlug, externalEffectCounts]);

  // Hidden gems: high-impact unmapped effects
  const hiddenGems = useMemo((): HiddenGem[] => {
    if (!sequenceAnalysis) return [];
    const mappedNames = new Set<string>();
    for (const sl of sourceLayerMappings) {
      if (sl.isMapped) mappedNames.add(sl.sourceModel.name);
    }
    return findHiddenGems(sequenceAnalysis, mappedNames);
  }, [sequenceAnalysis, sourceLayerMappings]);

  // Get effect context for a specific source model
  const getEffectContext = useCallback(
    (modelName: string): EffectSuggestionContext | null => {
      if (!sequenceAnalysis) return null;
      return getEffectSuggestionContext(modelName, sequenceAnalysis);
    },
    [sequenceAnalysis],
  );

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

    // V3 source-first (many-to-many)
    sourceLayerMappings,
    assignUserModelToLayer,
    removeLinkFromLayer,
    clearLayerMapping,
    skipSourceLayer,
    unskipSourceLayer,
    getSuggestionsForLayer,
    assignedUserModelNames,
    destToSourcesMap,
    totalSourceLayers: sourceStats.total,
    mappedLayerCount: sourceStats.mapped,
    skippedLayerCount: sourceStats.skippedLayers,
    groupsMappedCount: sourceStats.groupsMapped,
    groupsCoveredChildCount: sourceStats.coveredChildren,
    directMappedCount: sourceStats.direct,
    unmappedLayerCount: sourceStats.unmapped,
    coveragePercentage: sourceStats.pct,
    hiddenZeroEffectCount,
    nextUnmappedLayer,
    effectsCoverage,
    displayCoverage,
    sequenceAnalysis,
    hiddenGems,
    getEffectContext,

    // Destination-side skipping
    skippedDestModels,
    skipDestModel,
    unskipDestModel,
    unskipAllDestModels,

    /** Serialize mapping state for session recovery */
    getSerializedState: useCallback(
      () => ({
        assignments: Object.fromEntries(assignments),
        skipped: Array.from(skipped),
        overrides: Array.from(overrides),
        sourceDestLinks: Object.fromEntries(
          Array.from(sourceDestLinks.entries()).map(([k, v]) => [
            k,
            Array.from(v),
          ]),
        ),
      }),
      [assignments, skipped, overrides, sourceDestLinks],
    ),
  };
}
