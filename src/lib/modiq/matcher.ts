/**
 * ModIQ — Matching Engine (V2)
 *
 * Three-phase matching: Groups first, then individual models, then submodels.
 *
 * Scoring priority (updated from community file analysis):
 *   1. Fuzzy Name Match       (40%) — the strongest signal
 *   2. Spatial Position        (25%) — disambiguates duplicates (Arch 1 vs Arch 2)
 *   3. Shape Classification    (15%) — circular, linear, matrix, point, custom
 *   4. Model Type (DisplayAs)  (12%) — xLights universal type
 *   5. Node Count              (8%)  — pixel/node count similarity
 *
 * Groups appear at the top of each confidence section.
 */

import type { ParsedModel } from "./parser";

// ─── Types ──────────────────────────────────────────────────────────

export type Confidence = "high" | "medium" | "low" | "unmapped";

export interface SubmodelMapping {
  sourceName: string;
  destName: string;
  confidence: Confidence;
  pixelDiff: string;
}

export interface ModelMapping {
  sourceModel: ParsedModel;
  destModel: ParsedModel | null;
  score: number;
  confidence: Confidence;
  factors: {
    name: number;
    spatial: number;
    shape: number;
    type: number;
    pixels: number;
  };
  reason: string;
  submodelMappings: SubmodelMapping[];
}

export interface MappingResult {
  mappings: ModelMapping[];
  totalSource: number;
  totalDest: number;
  mappedCount: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  unmappedSource: number;
  unmappedDest: number;
  unusedDestModels: ParsedModel[];
}

// ─── Weights (new priority order) ───────────────────────────────────

const WEIGHTS = {
  name: 0.4,
  spatial: 0.25,
  shape: 0.15,
  type: 0.12,
  pixels: 0.08,
};

// ═══════════════════════════════════════════════════════════════════
// FACTOR 1: Fuzzy Name Matching (40%)
// ═══════════════════════════════════════════════════════════════════

/**
 * Expanded abbreviation/synonym map built from analyzing 7 community files.
 * Maps short forms → canonical forms for cross-matching.
 */
const SYNONYMS: Record<string, string[]> = {
  // Directions
  l: ["left", "lft"],
  r: ["right", "rgt", "rt"],
  c: ["center", "ctr", "centre", "mid", "middle"],
  // Sizes
  lg: ["large", "big"],
  sm: ["small", "mini", "tiny"],
  med: ["medium"],
  // Structural
  grp: ["group", "all"],
  mod: ["model"],
  vert: ["vertical", "verticals"],
  horiz: ["horizontal", "horizontals"],
  // Props
  arch: ["arches", "archway"],
  ss: ["showstopper"],
  ge: ["gilbert", "engineering"],
  dw: ["driveway"],
  sw: ["sidewalk"],
  // Common renames from community files
  tumba: ["tombstone", "tomb"],
  contorno: ["outline"],
  estrella: ["star"],
  arbol: ["tree"],
  cana: ["cane"],
  araña: ["spider"],
  murcielago: ["bat"],
  fantasma: ["ghost"],
  calabaza: ["pumpkin"],
  // Compound abbreviations
  mt: ["mega tree", "megatree"],
  mh: ["moving head", "movinghead"],
  ppd: ["wreath"],
};

/**
 * Canonical prop-type keywords. When these appear in a name,
 * they are the "essence" of what the model is.
 */
const PROP_KEYWORDS = [
  "arch",
  "arches",
  "archway",
  "bat",
  "bulb",
  "cane",
  "candy",
  "cat",
  "circle",
  "cross",
  "eave",
  "fence",
  "firework",
  "flake",
  "flood",
  "forest",
  "fuzion",
  "garage",
  "ghost",
  "horizontal",
  "house",
  "icicle",
  "icicles",
  "matrix",
  "mega",
  "megatree",
  "mini",
  "outline",
  "panel",
  "pole",
  "present",
  "pumpkin",
  "ring",
  "roof",
  "roofline",
  "rosa",
  "sign",
  "singing",
  "skull",
  "snowflake",
  "snowman",
  "spider",
  "spinner",
  "spiral",
  "star",
  "tombstone",
  "tree",
  "tune",
  "vertical",
  "window",
  "wreath",
];

/**
 * Normalize a model name for comparison:
 * - lowercase
 * - strip separators to spaces
 * - strip version prefixes like "01.11" or "02.14.0Grp"
 * - strip common noise words (all, group, grp, my, the, model, mod)
 * - strip trailing numeric indices for base-name comparison
 */
function normalizeName(name: string): string {
  let n = name.toLowerCase();
  // Strip version-prefix patterns like "01.11", "02.14.0Grp", "03.7.0Mod"
  n = n.replace(/^\d{1,3}\.\d{1,3}(\.\d+)?(grp|mod|sub)?\s*/i, "");
  // Replace separators with spaces
  n = n.replace(/[-_.\t]+/g, " ");
  // Strip noise words
  n = n.replace(
    /\b(all|group|grp|my|the|model|mod|no |everything|but)\b/gi,
    "",
  );
  // Collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

/**
 * Extract the "base name" — the prop-type keyword without numeric index.
 * "Arch 3" → "arch", "Spinner - Showstopper 2" → "spinner showstopper"
 */
function baseName(name: string): string {
  let n = normalizeName(name);
  // Strip trailing numbers (but not numbers mid-name like "p5" or "350")
  n = n.replace(/\s+\d+$/, "");
  // Strip leading numbers left over
  n = n.replace(/^\d+\s+/, "");
  return n;
}

/**
 * Extract the numeric index from a name (for positional ordering).
 * "Arch 3" → 3, "Spider - 12" → 12, "Pole" → -1
 */
function extractIndex(name: string): number {
  const n = normalizeName(name);
  const match = n.match(/(\d+)\s*$/);
  return match ? parseInt(match[1]) : -1;
}

/**
 * Tokenize a normalized name, expanding synonyms.
 */
function tokenize(normalized: string): Set<string> {
  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>();
  for (const tok of rawTokens) {
    expanded.add(tok);
    // Add synonym expansions
    const syns = SYNONYMS[tok];
    if (syns) {
      for (const s of syns) expanded.add(s);
    }
    // Reverse: if tok matches a synonym value, add the key too
    for (const [key, vals] of Object.entries(SYNONYMS)) {
      if (vals.includes(tok)) expanded.add(key);
    }
  }
  return expanded;
}

/**
 * Core fuzzy name score.
 *
 * Strategy:
 * 1. Exact normalized match → 1.0
 * 2. Base-name match (ignoring index) → 0.85
 * 3. Token overlap with synonym expansion → proportional score
 * 4. Substring containment bonus
 */
function scoreName(source: ParsedModel, dest: ParsedModel): number {
  const srcNorm = normalizeName(source.name);
  const destNorm = normalizeName(dest.name);

  // Exact normalized match
  if (srcNorm === destNorm) return 1.0;

  const srcBase = baseName(source.name);
  const destBase = baseName(dest.name);

  // Base name exact match (e.g. "arch" === "arch" for "Arch 1" vs "ARCH 3")
  if (srcBase === destBase && srcBase.length > 0) return 0.85;

  // Tokenized overlap with synonym expansion
  const srcTokens = tokenize(srcNorm);
  const destTokens = tokenize(destNorm);

  if (srcTokens.size === 0 || destTokens.size === 0) return 0;

  // Count matches (bidirectional)
  let matches = 0;
  for (const t of srcTokens) {
    if (destTokens.has(t)) matches++;
  }
  const overlapScore = matches / Math.max(srcTokens.size, destTokens.size);

  // Substring containment bonus: "showstopper" in "Showstopper Spinner Left"
  let substringBonus = 0;
  if (srcBase.length >= 3 && destNorm.includes(srcBase)) substringBonus = 0.15;
  else if (destBase.length >= 3 && srcNorm.includes(destBase))
    substringBonus = 0.15;

  // Prop keyword match bonus: if both contain the same prop keyword
  let keywordBonus = 0;
  for (const kw of PROP_KEYWORDS) {
    if (srcNorm.includes(kw) && destNorm.includes(kw)) {
      keywordBonus = 0.2;
      break;
    }
  }

  // Check aliases: if any alias of source matches dest (or vice versa)
  let aliasBonus = 0;
  for (const alias of source.aliases) {
    const aliasNorm = normalizeName(alias.replace(/^oldname:/, ""));
    if (aliasNorm === destNorm || aliasNorm === destBase) {
      aliasBonus = 0.3;
      break;
    }
  }
  for (const alias of dest.aliases) {
    const aliasNorm = normalizeName(alias.replace(/^oldname:/, ""));
    if (aliasNorm === srcNorm || aliasNorm === srcBase) {
      aliasBonus = 0.3;
      break;
    }
  }

  return Math.min(
    1.0,
    overlapScore + substringBonus + keywordBonus + aliasBonus,
  );
}

/**
 * Score how well two groups match based on their member model lists.
 * Compares the base names of member models to find overlap.
 * Returns 0..1 where 1 means identical member composition.
 */
function scoreMemberOverlap(source: ParsedModel, dest: ParsedModel): number {
  const srcMembers = source.memberModels || [];
  const destMembers = dest.memberModels || [];

  if (srcMembers.length === 0 || destMembers.length === 0) return 0;

  // Extract base names from member model names
  const srcBases = new Set(srcMembers.map((m) => baseName(m)));
  const destBases = new Set(destMembers.map((m) => baseName(m)));

  // Count how many base names overlap
  let matches = 0;
  for (const b of srcBases) {
    if (b.length > 0 && destBases.has(b)) matches++;
  }

  if (matches === 0) {
    // Try token-level matching for cross-language cases
    const srcTokenSets = srcMembers.map((m) => tokenize(normalizeName(m)));
    const destTokenSets = destMembers.map((m) => tokenize(normalizeName(m)));

    let tokenMatches = 0;
    for (const srcSet of srcTokenSets) {
      for (const destSet of destTokenSets) {
        let overlap = 0;
        for (const t of srcSet) {
          if (destSet.has(t)) overlap++;
        }
        if (overlap / Math.max(srcSet.size, destSet.size) > 0.5) {
          tokenMatches++;
          break;
        }
      }
    }
    return tokenMatches / Math.max(srcMembers.length, destMembers.length);
  }

  return matches / Math.max(srcBases.size, destBases.size);
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 2: Spatial Position (25%)
// ═══════════════════════════════════════════════════════════════════

interface NormalizedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function getNormalizedBounds(models: ParsedModel[]): NormalizedBounds {
  const nonGroup = models.filter((m) => !m.isGroup);
  if (nonGroup.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }
  return {
    minX: Math.min(...nonGroup.map((m) => m.worldPosX)),
    maxX: Math.max(...nonGroup.map((m) => m.worldPosX)),
    minY: Math.min(...nonGroup.map((m) => m.worldPosY)),
    maxY: Math.max(...nonGroup.map((m) => m.worldPosY)),
  };
}

function normalizePosition(value: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return 0.5;
  return (value - min) / range;
}

/**
 * Spatial scoring using Euclidean distance in normalized space.
 * Closer models score higher. Handles the Arch1-vs-Arch2 problem:
 * when two arches have the same base name, position is the tiebreaker.
 */
function scoreSpatial(
  source: ParsedModel,
  dest: ParsedModel,
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): number {
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcX = normalizePosition(
    source.worldPosX,
    sourceBounds.minX,
    sourceBounds.maxX,
  );
  const srcY = normalizePosition(
    source.worldPosY,
    sourceBounds.minY,
    sourceBounds.maxY,
  );
  const destX = normalizePosition(
    dest.worldPosX,
    destBounds.minX,
    destBounds.maxX,
  );
  const destY = normalizePosition(
    dest.worldPosY,
    destBounds.minY,
    destBounds.maxY,
  );

  // Euclidean distance in normalized [0,1] space. Max possible = sqrt(2) ≈ 1.414
  const dist = Math.sqrt((srcX - destX) ** 2 + (srcY - destY) ** 2);

  // Convert to score: 0 distance = 1.0, sqrt(2) distance = 0.0
  return Math.max(0, 1.0 - dist / 1.414);
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 3: Shape Classification (15%)
// ═══════════════════════════════════════════════════════════════════

type Shape = "circular" | "linear" | "matrix" | "triangle" | "point" | "custom";

/**
 * Classify a model's physical shape from its DisplayAs and name.
 * This is geometry-level, not prop-type-level.
 */
function classifyShape(model: ParsedModel): Shape {
  const da = model.displayAs.toLowerCase();
  const name = model.name.toLowerCase();

  // Circular shapes
  if (
    da === "circle" ||
    da === "spinner" ||
    da === "sphere" ||
    da === "wreaths" ||
    /spinner|wreath|circle|ring|globe|ball|rosa|fuzion|overlord|starburst/i.test(
      name,
    )
  ) {
    return "circular";
  }

  // Matrix / rectangular shapes
  if (
    da.includes("matrix") ||
    da === "cube" ||
    da === "window frame" ||
    /matrix|panel|p5|p10|fence|window|sign|tune.*to/i.test(name)
  ) {
    return "matrix";
  }

  // Linear shapes
  if (
    da === "single line" ||
    da === "poly line" ||
    da === "icicles" ||
    da === "arches" ||
    da === "candy cane" ||
    da === "candy canes" ||
    /eave|vert|horizontal|roofline|outline|driveway|pole|cane|icicle|arch/i.test(
      name,
    )
  ) {
    return "linear";
  }

  // Triangle / tree shapes
  if (da.includes("tree") || /tree|mega.*tree|spiral|firework/i.test(name)) {
    return "triangle";
  }

  // Point shapes (stars, floods, small props)
  if (da === "star" || /star|flood|bulb/i.test(name)) {
    return "point";
  }

  return "custom";
}

function scoreShape(source: ParsedModel, dest: ParsedModel): number {
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcShape = classifyShape(source);
  const destShape = classifyShape(dest);

  if (srcShape === destShape) return 1.0;

  // Partial matches for related shapes
  const related: Record<Shape, Shape[]> = {
    circular: ["custom"],
    linear: ["custom"],
    matrix: ["custom"],
    triangle: ["custom"],
    point: ["custom"],
    custom: ["circular", "linear", "matrix", "triangle", "point"],
  };

  if (related[srcShape]?.includes(destShape)) return 0.4;

  return 0.0;
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 4: Model Type / DisplayAs (12%)
// ═══════════════════════════════════════════════════════════════════

const RELATED_TYPES: Record<string, string[]> = {
  Tree: ["Mega Tree", "Spiral Tree"],
  "Mega Tree": ["Tree"],
  "Spiral Tree": ["Tree"],
  Arch: ["Candy Cane"],
  "Candy Cane": ["Arch"],
  Spinner: ["Wreath"],
  Wreath: ["Spinner"],
  Spider: ["Custom"],
  Bat: ["Custom"],
  Tombstone: ["Custom"],
  Pumpkin: ["Custom", "Ghost"],
  Ghost: ["Custom", "Pumpkin"],
  Matrix: ["Fence", "Sign"],
  Fence: ["Matrix"],
  Sign: ["Matrix"],
  Line: ["Roofline", "Outline"],
  Roofline: ["Line"],
  Outline: ["Line", "Roofline"],
  Pole: ["Line"],
  Flood: [],
  Window: [],
  "Pixel Forest": ["Matrix", "Fence"],
  "Singing Face": ["Custom"],
  Star: [],
  Snowflake: ["Star"],
  Group: [],
};

function scoreType(source: ParsedModel, dest: ParsedModel): number {
  if (source.type === dest.type) return 1.0;

  if (source.isGroup && dest.isGroup) return 0.7;

  const related = RELATED_TYPES[source.type] || [];
  if (related.includes(dest.type)) return 0.7;

  if (dest.type === "Custom" || source.type === "Custom") return 0.3;

  return 0.0;
}

// ═══════════════════════════════════════════════════════════════════
// FACTOR 5: Node Count (8%)
// ═══════════════════════════════════════════════════════════════════

function scorePixels(source: ParsedModel, dest: ParsedModel): number {
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcPx = source.pixelCount;
  const destPx = dest.pixelCount;

  if (srcPx === 0 || destPx === 0) return 0.5;

  return Math.max(0, 1.0 - Math.abs(srcPx - destPx) / Math.max(srcPx, destPx));
}

// ═══════════════════════════════════════════════════════════════════
// Combined Scoring
// ═══════════════════════════════════════════════════════════════════

function computeScore(
  source: ParsedModel,
  dest: ParsedModel,
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): { score: number; factors: ModelMapping["factors"] } {
  const factors = {
    name: scoreName(source, dest),
    spatial: scoreSpatial(source, dest, sourceBounds, destBounds),
    shape: scoreShape(source, dest),
    type: scoreType(source, dest),
    pixels: scorePixels(source, dest),
  };

  // For group-vs-group matching, blend in member overlap as a strong signal.
  // Member overlap replaces spatial/shape/pixels which don't apply to groups.
  if (source.isGroup && dest.isGroup) {
    const memberScore = scoreMemberOverlap(source, dest);
    // Groups: Name 35%, Members 40%, Type 10%, Spatial 15%
    const score =
      factors.name * 0.35 +
      memberScore * 0.4 +
      factors.type * 0.1 +
      factors.spatial * 0.15;
    return { score, factors };
  }

  const score =
    factors.name * WEIGHTS.name +
    factors.spatial * WEIGHTS.spatial +
    factors.shape * WEIGHTS.shape +
    factors.type * WEIGHTS.type +
    factors.pixels * WEIGHTS.pixels;

  return { score, factors };
}

function scoreToConfidence(score: number): Confidence {
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "medium";
  if (score >= 0.35) return "low";
  return "unmapped";
}

function generateReason(mapping: ModelMapping): string {
  const { factors, sourceModel, destModel } = mapping;
  if (!destModel) return "No suitable match found in your layout.";

  const parts: string[] = [];

  if (factors.name >= 0.85) parts.push("Name match");
  else if (factors.name >= 0.5) parts.push("Fuzzy name match");

  if (factors.spatial >= 0.8 && !sourceModel.isGroup)
    parts.push("Position match");

  if (factors.shape >= 0.9) parts.push("Shape match");
  else if (factors.shape < 0.3 && !sourceModel.isGroup)
    parts.push("Shape mismatch");

  if (factors.type >= 0.9) parts.push("Type match");
  else if (factors.type < 0.4) parts.push("Type mismatch");

  if (factors.pixels >= 0.9 && !sourceModel.isGroup) {
    parts.push("Node count match");
  } else if (factors.pixels < 0.5 && !sourceModel.isGroup) {
    parts.push(
      `Node count differs (${sourceModel.pixelCount} vs ${destModel.pixelCount})`,
    );
  }

  return parts.join(" · ") || "Best available match";
}

// ═══════════════════════════════════════════════════════════════════
// Spinner Shared-Source Detection
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if two models are both spinners whose submodel names overlap,
 * indicating they represent the same physical spinner type.
 *
 * When true, the source spinner is NOT consumed after matching, allowing
 * multiple dest spinners (user's layout) to all map to the same source
 * spinner. The xmap output will map each dest spinner's submodels to the
 * source spinner's submodels by exact name.
 */
function isSpinnerSharedMatch(source: ParsedModel, dest: ParsedModel): boolean {
  if (source.isGroup || dest.isGroup) return false;
  if (source.submodels.length === 0 || dest.submodels.length === 0)
    return false;

  // Both must be spinner-type models
  const spinnerPattern =
    /spinner|showstopper|fuzion|rosa.*grande|overlord|click.*click.*boom/i;
  const isSourceSpinner =
    source.type === "Spinner" || spinnerPattern.test(source.name);
  const isDestSpinner =
    dest.type === "Spinner" || spinnerPattern.test(dest.name);

  if (!isSourceSpinner || !isDestSpinner) return false;

  // Check submodel name overlap using normalized names
  const srcNames = new Set(source.submodels.map((s) => normalizeName(s.name)));
  const destNames = new Set(dest.submodels.map((s) => normalizeName(s.name)));

  let matches = 0;
  for (const name of srcNames) {
    if (name.length > 0 && destNames.has(name)) matches++;
  }

  // Require at least 3 matching submodel names (or all if fewer than 3)
  const threshold = Math.min(3, srcNames.size);
  return matches >= threshold;
}

// ═══════════════════════════════════════════════════════════════════
// Submodel Matching
// ═══════════════════════════════════════════════════════════════════

function mapSubmodels(
  source: ParsedModel,
  dest: ParsedModel,
): SubmodelMapping[] {
  if (source.submodels.length === 0) return [];

  const mappings: SubmodelMapping[] = [];
  const usedDest = new Set<number>();

  for (const srcSub of source.submodels) {
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < dest.submodels.length; i++) {
      if (usedDest.has(i)) continue;
      const destSub = dest.submodels[i];

      // Build a temporary ParsedModel-like object for name scoring
      const srcFake = { ...source, name: srcSub.name } as ParsedModel;
      const destFake = { ...dest, name: destSub.name } as ParsedModel;
      let score = scoreName(srcFake, destFake);

      // Blend in pixel similarity if available
      if (srcSub.pixelCount > 0 && destSub.pixelCount > 0) {
        const pxRatio =
          1.0 -
          Math.abs(srcSub.pixelCount - destSub.pixelCount) /
            Math.max(srcSub.pixelCount, destSub.pixelCount);
        score = score * 0.7 + pxRatio * 0.3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore > 0.2) {
      usedDest.add(bestIdx);
      const destSub = dest.submodels[bestIdx];
      mappings.push({
        sourceName: srcSub.name,
        destName: destSub.name,
        confidence: scoreToConfidence(bestScore),
        pixelDiff: `${srcSub.pixelCount || "?"}px → ${destSub.pixelCount || "?"}px`,
      });
    } else {
      mappings.push({
        sourceName: srcSub.name,
        destName: "",
        confidence: "unmapped",
        pixelDiff: `${srcSub.pixelCount || "?"}px`,
      });
    }
  }

  return mappings;
}

// ═══════════════════════════════════════════════════════════════════
// Main Matching Algorithm — Three-Phase
// ═══════════════════════════════════════════════════════════════════

/**
 * Phase 1: Match groups (most important — entire display groups)
 * Phase 2: Match individual models
 * Phase 3: Resolve submodels within matched models
 *
 * Within each phase, greedy assignment by score (highest first).
 * Groups appear at the top of each confidence section in output.
 */
export function matchModels(
  sourceModels: ParsedModel[],
  destModels: ParsedModel[],
): MappingResult {
  const sourceBounds = getNormalizedBounds(sourceModels);
  const destBounds = getNormalizedBounds(destModels);

  // Separate groups from individual models
  const sourceGroups = sourceModels.filter((m) => m.isGroup);
  const sourceIndividuals = sourceModels.filter((m) => !m.isGroup);
  const destGroups = destModels.filter((m) => m.isGroup);
  const destIndividuals = destModels.filter((m) => !m.isGroup);

  const assignedSourceIdx = new Set<number>();
  const assignedDestIdx = new Set<number>();
  const allMappings: ModelMapping[] = [];

  // ── Phase 1: Match Groups ──────────────────────────────
  const groupMappings = greedyMatch(
    sourceGroups,
    destGroups,
    sourceBounds,
    destBounds,
  );
  for (const m of groupMappings) {
    allMappings.push(m);
    if (m.destModel) {
      // Track by original index in full destModels array
      const destIdx = destModels.indexOf(m.destModel);
      if (destIdx >= 0) assignedDestIdx.add(destIdx);
    }
    const srcIdx = sourceModels.indexOf(m.sourceModel);
    if (srcIdx >= 0) assignedSourceIdx.add(srcIdx);
  }

  // ── Phase 2: Match Individual Models ───────────────────
  // Dest pool: individual models + any unmatched groups (a group in dest
  // might be the best match for an individual source model)
  const remainingDest = destModels.filter((_, i) => !assignedDestIdx.has(i));

  const individualMappings = greedyMatch(
    sourceIndividuals,
    remainingDest,
    sourceBounds,
    destBounds,
  );
  for (const m of individualMappings) {
    allMappings.push(m);
  }

  // ── Collect unused dest models ─────────────────────────
  const usedDest = new Set(
    allMappings.filter((m) => m.destModel).map((m) => m.destModel!.name),
  );
  const unusedDestModels = destModels.filter((m) => !usedDest.has(m.name));

  // ── Sort: confidence → groups first → natural source name ──
  const confidenceOrder: Record<Confidence, number> = {
    high: 0,
    medium: 1,
    low: 2,
    unmapped: 3,
  };
  allMappings.sort((a, b) => {
    // Primary: confidence tier
    const cDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (cDiff !== 0) return cDiff;
    // Secondary: groups before individuals within same tier
    const aGroup = a.sourceModel.isGroup ? 0 : 1;
    const bGroup = b.sourceModel.isGroup ? 0 : 1;
    if (aGroup !== bGroup) return aGroup - bGroup;
    // Tertiary: natural number sort on source model name
    // (e.g. "Eave 2" < "Eave 10" < "Eave 100")
    return a.sourceModel.name.localeCompare(b.sourceModel.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const mapped = allMappings.filter((m) => m.destModel !== null);
  return {
    mappings: allMappings,
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
}

/**
 * Greedy matching within a pool of source and dest models.
 * Returns mappings for all source models (matched or unmapped).
 */
function greedyMatch(
  sources: ParsedModel[],
  dests: ParsedModel[],
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): ModelMapping[] {
  // Build score matrix
  const entries: {
    srcIdx: number;
    destIdx: number;
    score: number;
    factors: ModelMapping["factors"];
  }[] = [];

  for (let s = 0; s < sources.length; s++) {
    for (let d = 0; d < dests.length; d++) {
      const { score, factors } = computeScore(
        sources[s],
        dests[d],
        sourceBounds,
        destBounds,
      );
      // Only consider if there's some name or type affinity
      if (score > 0.1) {
        entries.push({ srcIdx: s, destIdx: d, score, factors });
      }
    }
  }

  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);

  const assignedSrc = new Set<number>();
  const assignedDest = new Set<number>();
  const mappings: ModelMapping[] = [];

  // Greedy assignment
  for (const entry of entries) {
    if (assignedSrc.has(entry.srcIdx) || assignedDest.has(entry.destIdx))
      continue;

    const sourceModel = sources[entry.srcIdx];
    const destModel = dests[entry.destIdx];
    const confidence = scoreToConfidence(entry.score);

    // Don't assign if confidence is too low
    if (confidence === "unmapped") continue;

    const mapping: ModelMapping = {
      sourceModel,
      destModel,
      score: entry.score,
      confidence,
      factors: entry.factors,
      reason: "",
      submodelMappings: mapSubmodels(sourceModel, destModel),
    };
    mapping.reason = generateReason(mapping);

    mappings.push(mapping);
    assignedDest.add(entry.destIdx);

    // For spinner models with matching submodels, allow the source to be
    // reused by other dest spinners — multiple user spinners can all map
    // to the same source spinner when submodel names match exactly.
    if (!isSpinnerSharedMatch(sourceModel, destModel)) {
      assignedSrc.add(entry.srcIdx);
    }
  }

  // Add unmapped source models
  for (let s = 0; s < sources.length; s++) {
    if (!assignedSrc.has(s)) {
      mappings.push({
        sourceModel: sources[s],
        destModel: null,
        score: 0,
        confidence: "unmapped",
        factors: { name: 0, spatial: 0, shape: 0, type: 0, pixels: 0 },
        reason: "No suitable match found in your layout.",
        submodelMappings: [],
      });
    }
  }

  return mappings;
}
