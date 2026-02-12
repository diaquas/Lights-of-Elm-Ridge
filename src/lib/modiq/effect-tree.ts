/**
 * ModIQ — Effect Tree Builder
 *
 * Cross-references a source layout (ParsedModel[]) with a sequence's
 * active model list (from .xsq parsing) to determine:
 *   - Which groups have effects at the group level
 *   - Which individual models have their own effects
 *   - Which models are covered by group inheritance (don't need mapping)
 *   - Scenario classification (A / B / C) per the effect-aware spec
 *
 * The effect tree drives both the source panel filtering (214 → 22)
 * and the dest panel's group-aware mapping tiers.
 */

import type { ParsedModel } from "./parser";
import { isModelInSequence } from "./xsq-parser";

// ── Types ──────────────────────────────────────────────────────

export type GroupScenario = "A" | "B" | "C";

export interface GroupEffectInfo {
  /** The group ParsedModel */
  model: ParsedModel;
  /** A = group-only, B = group + some individual, C = individual-only */
  scenario: GroupScenario;
  /** Member names that also have their own effects in the sequence */
  membersWithEffects: string[];
  /** Member names whose effects come solely from the group */
  membersWithoutEffects: string[];
  /** Total member count */
  memberCount: number;
  /**
   * True if this group covers > 80% of total individual models
   * (e.g. "Whole House", "All - Pixels - GRP"). Mapping this group
   * does NOT auto-resolve children — effects overlay on top.
   */
  isAllEncompassing: boolean;
  /**
   * True if this group fully contains the members of 3+ other groups
   * AND has 20+ models (or 50%+ of total, whichever is smaller).
   * These are display-wide / section-wide groups like "All - Pixels - GRP".
   */
  isSuperGroup: boolean;
  /** Number of other groups whose members are fully contained by this group */
  containedGroupCount: number;
}

export interface ModelEffectInfo {
  /** The individual ParsedModel */
  model: ParsedModel;
  /** Parent group name (if this model belongs to a group with effects) */
  parentGroup: string | null;
  /** Whether the parent group itself has effects */
  parentHasEffects: boolean;
  /**
   * True if this model needs its own mapping — either:
   *   - It has no parent group with effects, OR
   *   - It has individual effects beyond what the group provides (Scenario B)
   */
  needsIndividualMapping: boolean;
}

export interface EffectSummary {
  totalModelsInLayout: number;
  modelsGroupsWithEffects: number;
  groupsNeedingMapping: number;
  individualModelsNeedingMapping: number;
  modelsCoveredByGroups: number;
  modelsWithNoEffects: number;
  effectiveMappingItems: number;
  /** Number of detected super groups (display-wide / section-wide) */
  superGroupCount: number;
}

/**
 * A node in the imposed display hierarchy.
 * Each model/group appears once under its most specific parent.
 */
export interface HierarchyNode {
  /** Name of the group or model */
  name: string;
  /** True if this is a group (super or regular), false for individual models */
  isGroup: boolean;
  /** True if this is a super group (display-wide / section-wide) */
  isSuperGroup: boolean;
  /** Child nodes (sub-groups and/or individual models) */
  children: HierarchyNode[];
  /** Effect count for this node */
  effectCount: number;
  /** Total member count (for groups) */
  memberCount: number;
}

export interface EffectTree {
  /** Groups that have effects at the group level (Scenario A or B) */
  groupsWithEffects: GroupEffectInfo[];
  /** Individual models that need their own mapping */
  modelsWithEffects: ModelEffectInfo[];
  /** Model names that have no effects in this sequence */
  modelsWithoutEffects: string[];
  /** Summary statistics */
  summary: EffectSummary;
  /** Set of all model names that are active (have effects or covered by group) */
  activeModelNames: Set<string>;
  /**
   * Map from member model name → parent group name
   * Only for models fully covered by a group (Scenario A members
   * or Scenario B members without individual effects).
   */
  coveredByGroup: Map<string, string>;
  /** Super groups: groups that fully contain 3+ other groups' members */
  superGroups: GroupEffectInfo[];
  /**
   * Map from regular group name → best parent super group name.
   * "Best parent" = smallest super group that fully contains the regular group.
   */
  groupParentMap: Map<string, string>;
  /** Imposed navigational hierarchy for display purposes */
  hierarchy: HierarchyNode[];
}

// ── Heuristics for "all-encompassing" groups ──────────────────

const ALL_ENCOMPASSING_NAME_PATTERNS = [
  /\bwhole\b/i,
  /\beverything\b/i,
  /\bfull\s+house\b/i,
  /\byard\s+only\b/i,
];

/**
 * Threshold: if a group contains more than this fraction of all
 * individual models, it's flagged as "all-encompassing".
 */
const ALL_ENCOMPASSING_MEMBER_RATIO = 0.8;

function isAllEncompassingGroup(
  group: ParsedModel,
  totalIndividualModels: number,
): boolean {
  // Name-based check
  for (const pattern of ALL_ENCOMPASSING_NAME_PATTERNS) {
    if (pattern.test(group.name)) return true;
  }
  // Member-count check
  if (
    totalIndividualModels > 0 &&
    group.memberModels.length / totalIndividualModels >
      ALL_ENCOMPASSING_MEMBER_RATIO
  ) {
    return true;
  }
  return false;
}

// ── Super group detection ─────────────────────────────────────

/**
 * Minimum number of other groups a group must fully contain to be a super group.
 */
const SUPER_GROUP_CONTAINED_THRESHOLD = 3;

/**
 * Minimum member count for super groups (absolute floor).
 */
const SUPER_GROUP_MIN_MEMBERS = 20;

/**
 * Alternative threshold: fraction of total individual models.
 * Super groups must have at least min(SUPER_GROUP_MIN_MEMBERS, totalModels * this).
 */
const SUPER_GROUP_MEMBER_RATIO = 0.5;

/**
 * Detect which groups are "super groups" — groups that fully contain
 * the members of 3+ other groups AND have enough members.
 *
 * Returns a map of group name → number of groups it fully contains.
 */
function detectSuperGroups(
  groupsWithEffects: GroupEffectInfo[],
  totalIndividualModels: number,
): Map<string, number> {
  const result = new Map<string, number>();
  const minMembers = Math.min(
    SUPER_GROUP_MIN_MEMBERS,
    Math.floor(totalIndividualModels * SUPER_GROUP_MEMBER_RATIO),
  );

  // Build member sets for each group
  const memberSets = new Map<string, Set<string>>();
  for (const gInfo of groupsWithEffects) {
    memberSets.set(gInfo.model.name, new Set(gInfo.model.memberModels));
  }

  // For each group G, count how many other groups H it fully contains
  for (const gInfo of groupsWithEffects) {
    if (gInfo.model.memberModels.length < minMembers) continue;

    const gMembers = memberSets.get(gInfo.model.name)!;
    let containedCount = 0;

    for (const hInfo of groupsWithEffects) {
      if (hInfo.model.name === gInfo.model.name) continue;
      if (hInfo.model.memberModels.length === 0) continue;
      // Don't count groups that are the same size or larger
      if (hInfo.model.memberModels.length >= gInfo.model.memberModels.length) continue;

      // Check if every member of H is also in G
      const hMembers = hInfo.model.memberModels;
      const allContained = hMembers.every((m) => gMembers.has(m));
      if (allContained) containedCount++;
    }

    if (containedCount >= SUPER_GROUP_CONTAINED_THRESHOLD) {
      result.set(gInfo.model.name, containedCount);
    }
  }

  return result;
}

/**
 * Build a "best parent" map: for each regular group, find the smallest
 * super group that fully contains it. Used for hierarchy construction.
 */
function buildGroupParentMap(
  groupsWithEffects: GroupEffectInfo[],
  superGroupNames: Set<string>,
): Map<string, string> {
  const parentMap = new Map<string, string>();

  // Build member sets for super groups
  const superMemberSets = new Map<string, Set<string>>();
  const superSizes = new Map<string, number>();
  for (const gInfo of groupsWithEffects) {
    if (!superGroupNames.has(gInfo.model.name)) continue;
    superMemberSets.set(gInfo.model.name, new Set(gInfo.model.memberModels));
    superSizes.set(gInfo.model.name, gInfo.model.memberModels.length);
  }

  // For each non-super group, find its best (smallest) parent super group
  for (const gInfo of groupsWithEffects) {
    if (superGroupNames.has(gInfo.model.name)) continue;
    if (gInfo.model.memberModels.length === 0) continue;

    let bestParent: string | null = null;
    let bestParentSize = Infinity;

    for (const [superName, superMembers] of superMemberSets) {
      const size = superSizes.get(superName)!;
      // Check if this super group fully contains the regular group
      const allContained = gInfo.model.memberModels.every((m) =>
        superMembers.has(m),
      );
      if (allContained && size < bestParentSize) {
        bestParent = superName;
        bestParentSize = size;
      }
    }

    if (bestParent) {
      parentMap.set(gInfo.model.name, bestParent);
    }
  }

  // Also nest super groups inside each other when one is a strict subset
  const superNames = [...superGroupNames];
  for (const childName of superNames) {
    const childMembers = superMemberSets.get(childName)!;
    let bestParent: string | null = null;
    let bestParentSize = Infinity;

    for (const parentName of superNames) {
      if (parentName === childName) continue;
      const parentMembers = superMemberSets.get(parentName)!;
      // Child must be strictly smaller
      if (childMembers.size >= parentMembers.size) continue;
      // Every member of child must be in parent
      let allContained = true;
      for (const m of childMembers) {
        if (!parentMembers.has(m)) { allContained = false; break; }
      }
      if (allContained && parentMembers.size < bestParentSize) {
        bestParent = parentName;
        bestParentSize = parentMembers.size;
      }
    }

    if (bestParent) {
      parentMap.set(childName, bestParent);
    }
  }

  return parentMap;
}

/**
 * Build an imposed navigational hierarchy from the effect tree data.
 * Each model/group appears once under its most specific parent.
 */
function buildHierarchy(
  groupsWithEffects: GroupEffectInfo[],
  superGroupNames: Set<string>,
  groupParentMap: Map<string, string>,
  effectCounts?: Record<string, number>,
): HierarchyNode[] {
  // Build nodes for all groups
  const nodeMap = new Map<string, HierarchyNode>();
  for (const gInfo of groupsWithEffects) {
    nodeMap.set(gInfo.model.name, {
      name: gInfo.model.name,
      isGroup: true,
      isSuperGroup: superGroupNames.has(gInfo.model.name),
      children: [],
      effectCount: effectCounts?.[gInfo.model.name] ?? 0,
      memberCount: gInfo.memberCount,
    });
  }

  // Attach groups to their parents
  for (const [childName, parentName] of groupParentMap) {
    const childNode = nodeMap.get(childName);
    const parentNode = nodeMap.get(parentName);
    if (childNode && parentNode) {
      parentNode.children.push(childNode);
    }
  }

  // Collect top-level nodes (groups not nested under any parent)
  const topLevel: HierarchyNode[] = [];
  for (const gInfo of groupsWithEffects) {
    if (!groupParentMap.has(gInfo.model.name)) {
      const node = nodeMap.get(gInfo.model.name);
      if (node) topLevel.push(node);
    }
  }

  // Sort children at each level alphabetically
  const sortChildren = (nodes: HierarchyNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    for (const node of nodes) {
      if (node.children.length > 0) sortChildren(node.children);
    }
  };
  sortChildren(topLevel);

  return topLevel;
}

// ── Main builder ──────────────────────────────────────────────

/**
 * Build an effect tree by cross-referencing source models with the
 * list of model names that have effects in a specific sequence.
 *
 * @param sourceModels  All source models (groups + individuals) from the layout
 * @param sequenceModelNames  Names of models that have effects in the sequence
 *                            (from parseXsqModels() or getSequenceModelList())
 * @param effectCounts  Optional map of model name → effect count. When provided,
 *                      groups are verified against this map to avoid false positives
 *                      (groups that appear in SEQUENCE_MODELS as containers but have
 *                      no direct effects assigned to them).
 */
export function buildEffectTree(
  sourceModels: ParsedModel[],
  sequenceModelNames: string[],
  effectCounts?: Record<string, number>,
): EffectTree {
  // Separate groups from individual models
  const groups: ParsedModel[] = [];
  const individuals: ParsedModel[] = [];
  const individualByName = new Map<string, ParsedModel>();

  for (const m of sourceModels) {
    if (m.isGroup) {
      groups.push(m);
    } else {
      individuals.push(m);
      individualByName.set(m.name, m);
    }
  }

  const totalIndividual = individuals.length;

  // Determine which models/groups have effects in the sequence
  const hasEffects = (name: string) =>
    isModelInSequence(name, sequenceModelNames);

  // For groups, when effectCounts is available, use it as ground truth.
  // SEQUENCE_MODELS includes all models that *appear* in the .xsq file,
  // including container groups with 0 direct effects (e.g. "All - Yard Left - GRP").
  // effectCounts only has entries for models with actual effects, so it's more accurate.
  const groupHasDirectEffects = (name: string): boolean => {
    if (effectCounts) {
      return (effectCounts[name] ?? 0) > 0;
    }
    // Fallback: use isModelInSequence when no effectCounts available
    return hasEffects(name);
  };

  // ── Phase 1: Classify groups ────────────────────────────────
  const groupsWithEffects: GroupEffectInfo[] = [];
  // Track which individual models are claimed by a non-all-encompassing group
  const coveredByGroup = new Map<string, string>();
  const scenarioBChildren = new Set<string>(); // members with individual effects

  for (const group of groups) {
    const groupHasEffects = groupHasDirectEffects(group.name);
    if (!groupHasEffects) {
      // Check if ANY members have effects → Scenario C
      const membersWithFx: string[] = [];
      const membersWithoutFx: string[] = [];
      for (const memberName of group.memberModels) {
        if (hasEffects(memberName)) {
          membersWithFx.push(memberName);
        } else {
          membersWithoutFx.push(memberName);
        }
      }

      if (membersWithFx.length > 0) {
        // Scenario C: group has no effects, but individual members do
        groupsWithEffects.push({
          model: group,
          scenario: "C",
          membersWithEffects: membersWithFx,
          membersWithoutEffects: membersWithoutFx,
          memberCount: group.memberModels.length,
          isAllEncompassing: isAllEncompassingGroup(group, totalIndividual),
          isSuperGroup: false, // Updated in Phase 1.5
          containedGroupCount: 0,
        });
      }
      // If no members have effects either, skip this group entirely
      continue;
    }

    // Group has effects — determine A or B
    const membersWithFx: string[] = [];
    const membersWithoutFx: string[] = [];
    for (const memberName of group.memberModels) {
      if (hasEffects(memberName)) {
        membersWithFx.push(memberName);
      } else {
        membersWithoutFx.push(memberName);
      }
    }

    const allEncompassing = isAllEncompassingGroup(group, totalIndividual);
    const scenario: GroupScenario =
      membersWithFx.length === 0 ? "A" : "B";

    groupsWithEffects.push({
      model: group,
      scenario,
      membersWithEffects: membersWithFx,
      membersWithoutEffects: membersWithoutFx,
      memberCount: group.memberModels.length,
      isAllEncompassing: allEncompassing,
      isSuperGroup: false, // Updated in Phase 1.5
      containedGroupCount: 0,
    });

    // For non-all-encompassing groups, mark children as covered
    if (!allEncompassing) {
      for (const memberName of membersWithoutFx) {
        // Only covered if they don't have individual effects
        if (!coveredByGroup.has(memberName)) {
          coveredByGroup.set(memberName, group.name);
        }
      }
      // Scenario B children with effects still need mapping
      for (const memberName of membersWithFx) {
        scenarioBChildren.add(memberName);
      }
    }
  }

  // ── Phase 1.5: Detect super groups ─────────────────────────
  const superGroupMap = detectSuperGroups(groupsWithEffects, totalIndividual);
  const superGroupNames = new Set(superGroupMap.keys());

  // Update GroupEffectInfo with super group flags
  for (const gInfo of groupsWithEffects) {
    const contained = superGroupMap.get(gInfo.model.name);
    if (contained !== undefined) {
      gInfo.isSuperGroup = true;
      gInfo.containedGroupCount = contained;
    }
  }

  // Build parent map and hierarchy
  const groupParentMap = buildGroupParentMap(groupsWithEffects, superGroupNames);
  const hierarchy = buildHierarchy(groupsWithEffects, superGroupNames, groupParentMap, effectCounts);

  const superGroups = groupsWithEffects.filter((g) => g.isSuperGroup);

  // ── Phase 2: Classify individual models ─────────────────────
  const modelsWithEffects: ModelEffectInfo[] = [];
  const modelsWithoutEffects: string[] = [];
  const activeModelNames = new Set<string>();

  // All group names that have effects are active
  for (const gInfo of groupsWithEffects) {
    if (gInfo.scenario !== "C") {
      // A and B groups are active (need mapping)
      activeModelNames.add(gInfo.model.name);
    }
  }

  for (const model of individuals) {
    const modelHasEffects = hasEffects(model.name);
    const isCovered = coveredByGroup.has(model.name);

    if (isCovered && !modelHasEffects) {
      // Fully covered by group — doesn't need individual mapping
      activeModelNames.add(model.name); // still "active" (will receive effects)
      continue;
    }

    if (!modelHasEffects) {
      // No effects and not covered by group
      modelsWithoutEffects.push(model.name);
      continue;
    }

    // Model has effects — determine if it needs individual mapping
    // Find if it has a parent group with effects
    let parentGroup: string | null = null;
    let parentHasEffects = false;
    for (const gInfo of groupsWithEffects) {
      if (
        gInfo.scenario !== "C" &&
        !gInfo.isAllEncompassing &&
        gInfo.model.memberModels.includes(model.name)
      ) {
        parentGroup = gInfo.model.name;
        parentHasEffects = true;
        break;
      }
    }

    const needsIndividualMapping =
      !parentGroup || scenarioBChildren.has(model.name);

    modelsWithEffects.push({
      model,
      parentGroup,
      parentHasEffects,
      needsIndividualMapping,
    });

    activeModelNames.add(model.name);
  }

  // ── Phase 3: Compute summary ────────────────────────────────
  const groupsNeedingMapping = groupsWithEffects.filter(
    (g) => g.scenario !== "C" && !g.isAllEncompassing,
  ).length;

  // All-encompassing groups that have effects still need mapping
  // but don't auto-resolve children
  const allEncompassingGroupsWithEffects = groupsWithEffects.filter(
    (g) => g.scenario !== "C" && g.isAllEncompassing,
  ).length;

  const individualModelsNeedingMapping = modelsWithEffects.filter(
    (m) => m.needsIndividualMapping,
  ).length;

  const modelsCoveredByGroups = coveredByGroup.size;

  const summary: EffectSummary = {
    totalModelsInLayout: sourceModels.length,
    modelsGroupsWithEffects:
      groupsWithEffects.filter((g) => g.scenario !== "C").length +
      modelsWithEffects.length,
    groupsNeedingMapping:
      groupsNeedingMapping + allEncompassingGroupsWithEffects,
    individualModelsNeedingMapping,
    modelsCoveredByGroups,
    modelsWithNoEffects: modelsWithoutEffects.length,
    effectiveMappingItems:
      groupsNeedingMapping +
      allEncompassingGroupsWithEffects +
      individualModelsNeedingMapping,
    superGroupCount: superGroups.length,
  };

  return {
    groupsWithEffects,
    modelsWithEffects,
    modelsWithoutEffects,
    summary,
    activeModelNames,
    coveredByGroup,
    superGroups,
    groupParentMap,
    hierarchy,
  };
}

/**
 * Get the set of source model names that need mapping in the xmap export.
 * This excludes:
 * - Models without effects
 * - Models fully covered by a parent group's effects
 *
 * Use this to filter the xmap export to only include layers with effects,
 * eliminating "red rows" in xLights for submodels that have no effects.
 */
export function getActiveSourceNamesForExport(effectTree: EffectTree): Set<string> {
  const names = new Set<string>();

  // Include groups with effects (Scenario A and B, not C)
  for (const gInfo of effectTree.groupsWithEffects) {
    if (gInfo.scenario !== "C") {
      names.add(gInfo.model.name);
    }
  }

  // Include individual models that need mapping
  for (const mInfo of effectTree.modelsWithEffects) {
    if (mInfo.needsIndividualMapping) {
      names.add(mInfo.model.name);
    }
  }

  return names;
}

/**
 * Filter source models to only those that are active in the effect tree.
 * Returns groups with effects first, then individual models with effects.
 */
export function getActiveSourceModels(
  sourceModels: ParsedModel[],
  effectTree: EffectTree,
): ParsedModel[] {
  const activeGroups: ParsedModel[] = [];
  const activeIndividuals: ParsedModel[] = [];

  for (const m of sourceModels) {
    if (!effectTree.activeModelNames.has(m.name)) continue;
    // Skip models that are fully covered by a group
    if (effectTree.coveredByGroup.has(m.name)) continue;

    if (m.isGroup) {
      // Only include groups with effects (not Scenario C)
      const gInfo = effectTree.groupsWithEffects.find(
        (g) => g.model.name === m.name && g.scenario !== "C",
      );
      if (gInfo) activeGroups.push(m);
    } else {
      // Only include models that need individual mapping
      const mInfo = effectTree.modelsWithEffects.find(
        (me) => me.model.name === m.name && me.needsIndividualMapping,
      );
      if (mInfo) activeIndividuals.push(m);
    }
  }

  return [...activeGroups, ...activeIndividuals];
}
