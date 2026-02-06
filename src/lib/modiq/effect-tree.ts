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

// ── Main builder ──────────────────────────────────────────────

/**
 * Build an effect tree by cross-referencing source models with the
 * list of model names that have effects in a specific sequence.
 *
 * @param sourceModels  All source models (groups + individuals) from the layout
 * @param sequenceModelNames  Names of models that have effects in the sequence
 *                            (from parseXsqModels() or getSequenceModelList())
 */
export function buildEffectTree(
  sourceModels: ParsedModel[],
  sequenceModelNames: string[],
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

  // ── Phase 1: Classify groups ────────────────────────────────
  const groupsWithEffects: GroupEffectInfo[] = [];
  // Track which individual models are claimed by a non-all-encompassing group
  const coveredByGroup = new Map<string, string>();
  const scenarioBChildren = new Set<string>(); // members with individual effects

  for (const group of groups) {
    const groupHasEffects = hasEffects(group.name);
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
  };

  return {
    groupsWithEffects,
    modelsWithEffects,
    modelsWithoutEffects,
    summary,
    activeModelNames,
    coveredByGroup,
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
