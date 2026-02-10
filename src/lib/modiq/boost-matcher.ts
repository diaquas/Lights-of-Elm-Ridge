/**
 * ModIQ — Export-Time Coverage Boost: Group-to-Group Structural Matcher
 *
 * Matches unmapped user groups to already-mapped source groups by structural
 * similarity (no name matching). Used at export time to suggest many-to-one
 * links that fill display coverage gaps.
 *
 * Scoring factors (no name matching):
 *   - Member pixel count proximity (35%)
 *   - Member count similarity (30%)
 *   - Geometric compatibility (20%)
 *   - Source group mapped-ness as tiebreaker (15%) — prefer source groups
 *     with more existing dests (richer effects)
 */

import type { ParsedModel } from "./parser";

// ── Geometry Classification ────────────────────────────────────

type GeometryClass = "radial" | "linear" | "flat" | "3d" | "unknown";

const GEOMETRY_MAP: Record<string, GeometryClass> = {
  spinner: "radial",
  wreath: "radial",
  snowflake: "radial",
  star: "radial",
  tree: "radial",
  arch: "linear",
  "candy cane": "linear",
  icicle: "linear",
  icicles: "linear",
  roofline: "linear",
  matrix: "flat",
  tombstone: "flat",
  pumpkin: "flat",
  face: "flat",
  sign: "flat",
  custom: "flat",
  "mega tree": "3d",
  "spiral tree": "3d",
  wireframe: "3d",
};

const ADJACENT_GEOMETRY: Record<GeometryClass, GeometryClass[]> = {
  radial: ["3d"],
  linear: ["flat"],
  flat: ["linear"],
  "3d": ["radial"],
  unknown: [],
};

function classifyGeometry(model: ParsedModel): GeometryClass {
  const typeLower = model.type.toLowerCase();
  for (const [key, geo] of Object.entries(GEOMETRY_MAP)) {
    if (typeLower.includes(key)) return geo;
  }
  // Check displayAs if type didn't match
  const displayLower = model.displayAs?.toLowerCase() ?? "";
  for (const [key, geo] of Object.entries(GEOMETRY_MAP)) {
    if (displayLower.includes(key)) return geo;
  }
  return "unknown";
}

// ── Scoring Functions ──────────────────────────────────────────

function pixelProximityScore(
  sourcePixels: number,
  destPixels: number,
): number {
  if (sourcePixels === 0 || destPixels === 0) return 10;
  const ratio = Math.max(sourcePixels, destPixels) / Math.min(sourcePixels, destPixels);
  if (ratio <= 1.2) return 100;
  if (ratio <= 1.5) return 70;
  if (ratio <= 2.0) return 40;
  return 10;
}

function memberCountScore(sourceCount: number, destCount: number): number {
  const diff = Math.abs(sourceCount - destCount);
  if (diff === 0) return 100;
  if (diff === 1) return 80;
  if (diff <= 2) return 60;
  if (diff <= 4) return 40;
  return 10;
}

function geometryScore(
  sourceModel: ParsedModel,
  destModel: ParsedModel,
): number {
  const srcGeo = classifyGeometry(sourceModel);
  const destGeo = classifyGeometry(destModel);

  if (srcGeo === destGeo) return 100;
  if (srcGeo === "unknown" || destGeo === "unknown") return 50;
  if (ADJACENT_GEOMETRY[srcGeo]?.includes(destGeo)) return 50;
  return 10;
}

// ── Average pixel count per member ─────────────────────────────

function avgMemberPixels(
  group: ParsedModel,
  allModels: Map<string, ParsedModel>,
): number {
  if (group.memberModels.length === 0) {
    return group.pixelCount;
  }
  let total = 0;
  let count = 0;
  for (const memberName of group.memberModels) {
    const m = allModels.get(memberName);
    if (m && !m.isGroup) {
      total += m.pixelCount;
      count++;
    }
  }
  return count > 0 ? total / count : group.pixelCount;
}

// ── Public Types ───────────────────────────────────────────────

export interface BoostSuggestion {
  /** The unmapped user group */
  userGroup: ParsedModel;
  /** The already-mapped source group to duplicate effects from */
  sourceGroup: ParsedModel;
  /** The user group(s) already assigned to the source group */
  existingDests: string[];
  /** Overall match score (0–1) */
  score: number;
  /** Factor breakdown */
  factors: {
    pixelProximity: number;
    memberCount: number;
    geometry: number;
  };
  /** Human-readable reason */
  reason: string;
}

export interface DisplayCoverage {
  /** Number of user models covered by at least one mapping */
  coveredModels: number;
  /** Total user models (excluding DMX) */
  totalModels: number;
  /** Coverage percentage */
  percentage: number;
  /** User groups with zero assignments */
  unmappedUserGroups: ParsedModel[];
  /** User groups with at least one mapping */
  mappedUserGroups: ParsedModel[];
}

// ── Display Coverage Calculator ────────────────────────────────

/**
 * Calculate display coverage — what percentage of the user's physical
 * display will receive effects.
 *
 * A user group is "covered" if it (as a group) has at least one link,
 * OR if enough of its members are individually linked. A model is
 * covered if its parent group is covered OR it has a direct link.
 */
export function computeDisplayCoverage(
  destModels: ParsedModel[],
  destToSourcesMap: Map<string, Set<string>>,
  isDmxModel: (m: ParsedModel) => boolean,
): DisplayCoverage {
  const nonDmx = destModels.filter((m) => !isDmxModel(m));
  const groups = nonDmx.filter((m) => m.isGroup);
  const individuals = nonDmx.filter((m) => !m.isGroup);

  // Cascade threshold: encompassing aggregation groups (> 20% of total
  // individual models) shouldn't inflate coverage. Only specific category
  // groups (e.g., "All Arches" with 8 members) cascade to children.
  const cascadeThreshold = Math.max(30, Math.round(individuals.length * 0.2));

  // Groups with at least one link
  const mappedGroups: ParsedModel[] = [];
  const unmappedGroups: ParsedModel[] = [];
  const coveredByGroup = new Set<string>();

  for (const g of groups) {
    const srcs = destToSourcesMap.get(g.name);
    if (srcs && srcs.size > 0) {
      mappedGroups.push(g);
      // Only cascade members for category-level groups (not encompassing ones)
      if (g.memberModels.length <= cascadeThreshold) {
        for (const memberName of g.memberModels) {
          coveredByGroup.add(memberName);
        }
      }
    } else {
      unmappedGroups.push(g);
    }
  }

  // Count individual models that are covered
  let covered = 0;
  for (const m of individuals) {
    if (coveredByGroup.has(m.name)) {
      covered++;
    } else {
      const srcs = destToSourcesMap.get(m.name);
      if (srcs && srcs.size > 0) {
        covered++;
      }
    }
  }

  const total = individuals.length;
  const pct = total > 0 ? Math.round((covered / total) * 1000) / 10 : 100;

  return {
    coveredModels: covered,
    totalModels: total,
    percentage: pct,
    unmappedUserGroups: unmappedGroups,
    mappedUserGroups: mappedGroups,
  };
}

// ── Group-to-Group Structural Matcher ──────────────────────────

/**
 * Find boost suggestions: unmapped user groups that could receive
 * effects from already-mapped source groups.
 *
 * @param unmappedUserGroups - User groups with zero assignments
 * @param sourceLayerMappings - All source layer mappings (to find mapped source groups)
 * @param sourceModels - All source models (for pixel lookups)
 * @param destModels - All dest models (for pixel lookups)
 * @param sourceDestLinks - Current link state (source → set of dests)
 * @returns Suggestions sorted by score, filtered to ≥ 70%
 */
export function findBoostSuggestions(
  unmappedUserGroups: ParsedModel[],
  mappedSourceGroups: ParsedModel[],
  sourceModels: ParsedModel[],
  destModels: ParsedModel[],
  sourceDestLinks: Map<string, Set<string>>,
): BoostSuggestion[] {
  if (unmappedUserGroups.length === 0 || mappedSourceGroups.length === 0) {
    return [];
  }

  // Build lookup maps
  const sourceByName = new Map<string, ParsedModel>();
  for (const m of sourceModels) sourceByName.set(m.name, m);
  const destByName = new Map<string, ParsedModel>();
  for (const m of destModels) destByName.set(m.name, m);

  const suggestions: BoostSuggestion[] = [];
  const THRESHOLD = 0.70;

  for (const userGroup of unmappedUserGroups) {
    let bestMatch: BoostSuggestion | null = null;

    for (const srcGroup of mappedSourceGroups) {
      // Skip if this user group is already linked to this source group
      const existingDests = sourceDestLinks.get(srcGroup.name);
      if (existingDests?.has(userGroup.name)) continue;

      // Compute structural score
      const srcAvgPx = avgMemberPixels(srcGroup, sourceByName);
      const destAvgPx = avgMemberPixels(userGroup, destByName);

      const pixelScore = pixelProximityScore(srcAvgPx, destAvgPx);
      const memberScore = memberCountScore(
        srcGroup.memberModels.length,
        userGroup.memberModels.length,
      );
      const geoScore = geometryScore(srcGroup, userGroup);

      // Weighted combination (pixel 35%, member 30%, geo 20%, richness 15%)
      // For richness, use number of existing dests as proxy
      const destsCount = existingDests?.size ?? 0;
      const richnessScore = Math.min(destsCount * 30, 100);

      const totalScore =
        pixelScore * 0.35 +
        memberScore * 0.30 +
        geoScore * 0.20 +
        richnessScore * 0.15;

      const normalizedScore = totalScore / 100;

      if (normalizedScore >= THRESHOLD) {
        const existingDestNames = existingDests ? Array.from(existingDests) : [];

        // Build reason string
        const reasons: string[] = [];
        if (pixelScore >= 70) reasons.push("similar pixel count");
        if (memberScore >= 60) reasons.push("compatible member count");
        if (geoScore >= 50) reasons.push("similar geometry");

        const candidate: BoostSuggestion = {
          userGroup,
          sourceGroup: srcGroup,
          existingDests: existingDestNames,
          score: normalizedScore,
          factors: {
            pixelProximity: pixelScore / 100,
            memberCount: memberScore / 100,
            geometry: geoScore / 100,
          },
          reason: reasons.length > 0 ? reasons.join(", ") : "structural match",
        };

        if (!bestMatch || candidate.score > bestMatch.score) {
          bestMatch = candidate;
        }
      }
    }

    if (bestMatch) {
      suggestions.push(bestMatch);
    }
  }

  // Sort by score descending, then member count for tiebreaker
  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.userGroup.memberModels.length - a.userGroup.memberModels.length;
  });

  // Limit to 5
  return suggestions.slice(0, 5);
}


// ========================================================================
// Spinner / Submodel Boost
// ========================================================================

export interface SpinnerBoostSuggestion {
  /** The unmapped user model (spinner or submodel-bearing model) */
  userModel: ParsedModel;
  /** The source model it should copy submodel mappings from */
  sourceModel: ParsedModel;
  /** The already-mapped user model whose mapping we'd clone */
  templateModel: ParsedModel;
  /** Structural similarity score (0-1) */
  score: number;
  /** Factor breakdown */
  factors: {
    armCount: number;
    ringCount: number;
    totalPixels: number;
    pixelsPerArm: number;
  };
  /** Human-readable description of the match quality */
  reason: string;
}

// -- Spinner Structure Extraction --

interface SpinnerStructure {
  armCount: number;
  ringCount: number;
  totalPixels: number;
  pixelsPerArm: number;
  hasSubmodels: boolean;
}

/**
 * Extract spinner structural data from a model's submodels.
 * Recognizes arm/blade and ring/layer patterns common in xLights spinners.
 */
function extractSpinnerStructure(model: ParsedModel): SpinnerStructure | null {
  if (model.submodels.length === 0) return null;

  let armCount = 0;
  let ringCount = 0;
  let armPixels = 0;

  for (const sub of model.submodels) {
    const lower = sub.name.toLowerCase();
    if (/arm|blade|spoke|wing/i.test(lower) || /^(a|arm|blade)\s*\d/i.test(lower)) {
      armCount++;
      armPixels += sub.pixelCount;
    } else if (/ring|layer|circle|loop/i.test(lower) || /^(r|ring)\s*\d/i.test(lower)) {
      ringCount++;
    }
  }

  // If no explicit arm/ring submodels found, not a spinner-structured model
  if (armCount === 0 && ringCount === 0) {
    return null;
  }

  return {
    armCount,
    ringCount,
    totalPixels: model.pixelCount,
    pixelsPerArm: armCount > 0 ? Math.round(armPixels / armCount) : 0,
    hasSubmodels: true,
  };
}

/**
 * Score structural similarity between two spinner-like models.
 *
 * Weights:
 *   - Arm count match (40%)
 *   - Ring count match (25%)
 *   - Total pixel count proximity (20%)
 *   - Pixels per arm proximity (15%)
 */
function spinnerSimilarityScore(
  a: SpinnerStructure,
  b: SpinnerStructure,
): { score: number; factors: SpinnerBoostSuggestion["factors"]; reason: string } {
  // Arm count (40%)
  const armDiff = Math.abs(a.armCount - b.armCount);
  let armScore: number;
  if (armDiff === 0) armScore = 100;
  else if (armDiff === 1) armScore = 60;
  else if (armDiff === 2) armScore = 20;
  else armScore = 0; // hard fail

  // Ring count (25%)
  const ringDiff = Math.abs(a.ringCount - b.ringCount);
  let ringScore: number;
  if (ringDiff === 0) ringScore = 100;
  else if (ringDiff === 1) ringScore = 70;
  else if (ringDiff === 2) ringScore = 30;
  else ringScore = 5;

  // Total pixel count (20%)
  const pixelRatio =
    a.totalPixels > 0 && b.totalPixels > 0
      ? Math.max(a.totalPixels, b.totalPixels) / Math.min(a.totalPixels, b.totalPixels)
      : 999;
  let totalPixelScore: number;
  if (pixelRatio <= 1.2) totalPixelScore = 100;
  else if (pixelRatio <= 1.5) totalPixelScore = 60;
  else totalPixelScore = 20;

  // Pixels per arm (15%)
  const armPxRatio =
    a.pixelsPerArm > 0 && b.pixelsPerArm > 0
      ? Math.max(a.pixelsPerArm, b.pixelsPerArm) / Math.min(a.pixelsPerArm, b.pixelsPerArm)
      : 999;
  let perArmScore: number;
  if (armPxRatio <= 1.2) perArmScore = 100;
  else if (armPxRatio <= 1.5) perArmScore = 60;
  else perArmScore = 20;

  const total = armScore * 0.40 + ringScore * 0.25 + totalPixelScore * 0.20 + perArmScore * 0.15;

  // Build reason
  const parts: string[] = [];
  if (armDiff === 0) parts.push("same arm count");
  else if (armDiff === 1) parts.push(armDiff + " fewer arm");
  if (ringDiff === 0) parts.push("same ring count");
  else if (ringDiff <= 2) parts.push(ringDiff + " fewer ring" + (ringDiff > 1 ? "s" : ""));
  if (totalPixelScore >= 60) parts.push("similar pixel count");
  else parts.push("smaller pixel count");

  return {
    score: total / 100,
    factors: {
      armCount: armScore / 100,
      ringCount: ringScore / 100,
      totalPixels: totalPixelScore / 100,
      pixelsPerArm: perArmScore / 100,
    },
    reason: parts.length > 0 ? parts.join(", ") : "structural match",
  };
}

/**
 * Find spinner/submodel boost suggestions: unmapped user models that
 * have spinner-like submodel structures and match already-mapped spinners.
 *
 * For each unmapped spinner, finds the best already-mapped user spinner
 * whose source mapping could be cloned.
 */
export function findSpinnerBoostSuggestions(
  destModels: ParsedModel[],
  sourceDestLinks: Map<string, Set<string>>,
  isDmxFn: (m: ParsedModel) => boolean,
): SpinnerBoostSuggestion[] {
  const THRESHOLD = 0.70;

  // Build inverse map: dest -> source
  const destToSource = new Map<string, string>();
  for (const [srcName, dests] of sourceDestLinks) {
    for (const destName of dests) {
      destToSource.set(destName, srcName);
    }
  }

  // Find all non-DMX individual models (not groups)
  const nonDmxModels = destModels.filter((m) => !isDmxFn(m) && !m.isGroup);

  // Partition into mapped spinners and unmapped spinners
  const mappedSpinners: { model: ParsedModel; structure: SpinnerStructure; sourceName: string }[] = [];
  const unmappedSpinners: { model: ParsedModel; structure: SpinnerStructure }[] = [];

  for (const model of nonDmxModels) {
    const structure = extractSpinnerStructure(model);
    if (!structure) continue;

    const srcName = destToSource.get(model.name);
    if (srcName) {
      mappedSpinners.push({ model, structure, sourceName: srcName });
    } else {
      // Also check if covered by a group
      let coveredByGroup = false;
      for (const g of destModels) {
        if (g.isGroup && g.memberModels.includes(model.name)) {
          const groupSrc = destToSource.get(g.name);
          if (groupSrc) {
            coveredByGroup = true;
            break;
          }
        }
      }
      if (!coveredByGroup) {
        unmappedSpinners.push({ model, structure });
      }
    }
  }

  if (unmappedSpinners.length === 0 || mappedSpinners.length === 0) {
    return [];
  }

  const suggestions: SpinnerBoostSuggestion[] = [];

  for (const unmapped of unmappedSpinners) {
    let best: SpinnerBoostSuggestion | null = null;

    for (const mapped of mappedSpinners) {
      const result = spinnerSimilarityScore(unmapped.structure, mapped.structure);

      if (result.score >= THRESHOLD) {
        const candidate: SpinnerBoostSuggestion = {
          userModel: unmapped.model,
          sourceModel: { name: mapped.sourceName } as ParsedModel,
          templateModel: mapped.model,
          score: result.score,
          factors: result.factors,
          reason: result.reason,
        };

        if (!best || candidate.score > best.score) {
          best = candidate;
        }
      }
    }

    if (best) {
      suggestions.push(best);
    }
  }

  // Sort by score descending, pixel count proximity as tiebreaker
  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.userModel.pixelCount - a.userModel.pixelCount;
  });

  // Limit to 5
  return suggestions.slice(0, 5);
}

// ========================================================================
// Projected Coverage Calculation
// ========================================================================

/**
 * Calculate what display coverage would be if the given boost suggestions
 * were accepted. Used to show live-updating coverage as user toggles
 * checkboxes in the boost prompt.
 */
export function projectDisplayCoverage(
  baseCoverage: DisplayCoverage,
  acceptedGroupSuggestions: BoostSuggestion[],
  acceptedSpinnerSuggestions: SpinnerBoostSuggestion[],
  destModels: ParsedModel[],
): number {
  let additionalCovered = 0;
  const alreadyCounted = new Set<string>();

  // Group boost: each accepted group adds its member count
  for (const s of acceptedGroupSuggestions) {
    const group = s.userGroup;
    for (const memberName of group.memberModels) {
      const member = destModels.find((m) => m.name === memberName && !m.isGroup);
      if (member && !alreadyCounted.has(memberName)) {
        alreadyCounted.add(memberName);
        additionalCovered++;
      }
    }
  }

  // Spinner boost: each accepted spinner adds 1 model
  for (const s of acceptedSpinnerSuggestions) {
    if (!alreadyCounted.has(s.userModel.name)) {
      alreadyCounted.add(s.userModel.name);
      additionalCovered++;
    }
  }

  const newCovered = baseCoverage.coveredModels + additionalCovered;
  const total = baseCoverage.totalModels;
  return total > 0 ? Math.round((newCovered / total) * 1000) / 10 : 100;
}
