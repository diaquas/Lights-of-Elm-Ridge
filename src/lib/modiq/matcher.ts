/**
 * ModIQ — Matching Engine
 *
 * Multi-factor weighted scoring algorithm that matches source models
 * (from our sequences) to destination models (user's layout).
 *
 * Factors:
 *   1. Model Type Match    (35%)
 *   2. Pixel Count Match   (25%)
 *   3. Spatial Position     (20%)
 *   4. Name Similarity      (10%)
 *   5. Submodel Structure   (10%)
 */

import type { ParsedModel } from "./parser";

// ─── Types ──────────────────────────────────────────────────────────

export type Confidence = "high" | "medium" | "low" | "unmapped";

export interface SubmodelMapping {
  sourceName: string;
  destName: string;
  confidence: Confidence;
  pixelDiff: string; // e.g. "120px → 100px"
}

export interface ModelMapping {
  sourceModel: ParsedModel;
  destModel: ParsedModel | null;
  score: number;
  confidence: Confidence;
  factors: {
    type: number;
    pixels: number;
    spatial: number;
    name: number;
    submodel: number;
  };
  reason: string; // human-readable explanation of key factors
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

// ─── Weights ────────────────────────────────────────────────────────

const WEIGHTS = {
  type: 0.35,
  pixels: 0.25,
  spatial: 0.2,
  name: 0.1,
  submodel: 0.1,
};

// ─── Factor 1: Type Match ───────────────────────────────────────────

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
  // Exact match
  if (source.type === dest.type) return 1.0;

  // Groups match groups with similar names
  if (source.isGroup && dest.isGroup) {
    return scoreGroupTypeMatch(source.name, dest.name);
  }

  // Related type match
  const related = RELATED_TYPES[source.type] || [];
  if (related.includes(dest.type)) return 0.7;

  // If dest is Custom, it might be the same thing with a generic type
  if (dest.type === "Custom") return 0.4;
  if (source.type === "Custom") return 0.4;

  return 0.0;
}

function scoreGroupTypeMatch(sourceName: string, destName: string): number {
  // Extract keywords from group names
  const sourceKeywords = extractGroupKeywords(sourceName);
  const destKeywords = extractGroupKeywords(destName);

  // Check for overlap
  const overlap = sourceKeywords.filter((k) => destKeywords.includes(k));
  if (overlap.length > 0) {
    return Math.min(1.0, overlap.length / Math.max(sourceKeywords.length, 1));
  }

  return 0.3; // Base group-to-group score
}

function extractGroupKeywords(name: string): string[] {
  const lower = name.toLowerCase();
  const keywords: string[] = [];

  const patterns: [RegExp, string][] = [
    [/arch/i, "arch"],
    [/eave|horizontal|roofline/i, "eave"],
    [/vert/i, "vert"],
    [/house|outline/i, "house"],
    [/spider/i, "spider"],
    [/bat/i, "bat"],
    [/tomb/i, "tombstone"],
    [/pumpkin|ghost/i, "pumpkin"],
    [/tree|mini.?tree/i, "tree"],
    [/star/i, "star"],
    [/pole/i, "pole"],
    [/snowflake|flake/i, "snowflake"],
    [/present|gift|wreath/i, "present"],
    [/cane|candy/i, "cane"],
    [/spinner/i, "spinner"],
    [/fence/i, "fence"],
    [/pixel.?forest|forest/i, "forest"],
    [/firework|spiral/i, "firework"],
    [/window/i, "window"],
    [/flood/i, "flood"],
    [/fuzion|rosa/i, "fuzion"],
    [/all|everything|no\s/i, "all"],
    [/icicle/i, "icicle"],
  ];

  for (const [pattern, keyword] of patterns) {
    if (pattern.test(lower)) keywords.push(keyword);
  }

  return keywords;
}

// ─── Factor 2: Pixel Count Match ────────────────────────────────────

function scorePixels(source: ParsedModel, dest: ParsedModel): number {
  // Groups don't have meaningful pixel counts
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcPx = source.pixelCount;
  const destPx = dest.pixelCount;

  if (srcPx === 0 || destPx === 0) return 0.5; // neutral if unknown

  const ratio =
    1.0 - Math.abs(srcPx - destPx) / Math.max(srcPx, destPx);

  // Apply minimum threshold — below 0.3 means they're so different
  // it's probably not the same prop
  return Math.max(ratio, 0);
}

// ─── Factor 3: Spatial Position ─────────────────────────────────────

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

function normalizePosition(
  value: number,
  min: number,
  max: number,
): number {
  const range = max - min;
  if (range === 0) return 0.5;
  return (value - min) / range;
}

function assignZone(normX: number, normY: number): string {
  const col = normX < 0.33 ? "left" : normX < 0.66 ? "center" : "right";
  const row = normY > 0.66 ? "high" : normY > 0.33 ? "mid" : "low";
  return `${row}-${col}`;
}

function scoreSpatial(
  source: ParsedModel,
  dest: ParsedModel,
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): number {
  // Groups don't have meaningful positions
  if (source.isGroup || dest.isGroup) return 0.5;

  const srcNormX = normalizePosition(
    source.worldPosX,
    sourceBounds.minX,
    sourceBounds.maxX,
  );
  const srcNormY = normalizePosition(
    source.worldPosY,
    sourceBounds.minY,
    sourceBounds.maxY,
  );
  const destNormX = normalizePosition(
    dest.worldPosX,
    destBounds.minX,
    destBounds.maxX,
  );
  const destNormY = normalizePosition(
    dest.worldPosY,
    destBounds.minY,
    destBounds.maxY,
  );

  const srcZone = assignZone(srcNormX, srcNormY);
  const destZone = assignZone(destNormX, destNormY);

  if (srcZone === destZone) return 1.0;

  // Adjacent zones
  const [srcRow, srcCol] = srcZone.split("-");
  const [destRow, destCol] = destZone.split("-");
  if (srcRow === destRow || srcCol === destCol) return 0.6;

  return 0.2;
}

// ─── Factor 4: Name Similarity ──────────────────────────────────────

const ABBREVIATION_MAP: Record<string, string[]> = {
  dw: ["driveway"],
  l: ["left"],
  r: ["right"],
  c: ["center"],
  lg: ["large"],
  sm: ["small"],
  med: ["medium"],
  grp: ["group"],
  mod: ["model"],
  vert: ["vertical"],
  horiz: ["horizontal"],
  arch: ["arches"],
  ss: ["showstopper"],
  ge: ["gilbert", "engineering"],
};

function normalizeName(name: string): string {
  let normalized = name.toLowerCase();
  // Remove common separators and prefixes
  normalized = normalized.replace(/[-_.\s]+/g, " ").trim();
  // Remove "all", "my", "the", numeric-only suffixes
  normalized = normalized
    .replace(/^(all|my|the)\s+/i, "")
    .replace(/\s+(grp|group)$/i, "")
    .replace(/\s+\d+$/, "");
  return normalized;
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeName(a).split(/\s+/));
  const tokensB = new Set(normalizeName(b).split(/\s+/));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let matches = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) matches++;
    // Check abbreviation expansions
    const expansions = ABBREVIATION_MAP[token] || [];
    for (const exp of expansions) {
      if (tokensB.has(exp)) matches += 0.5;
    }
  }

  return matches / Math.max(tokensA.size, tokensB.size);
}

function scoreName(source: ParsedModel, dest: ParsedModel): number {
  // Direct name match (case-insensitive)
  if (source.name.toLowerCase() === dest.name.toLowerCase()) return 1.0;

  // Token overlap
  return tokenOverlap(source.name, dest.name);
}

// ─── Factor 5: Submodel Structure ───────────────────────────────────

function scoreSubmodel(source: ParsedModel, dest: ParsedModel): number {
  const srcSubs = source.submodels;
  const destSubs = dest.submodels;

  // Neither has submodels — neutral
  if (srcSubs.length === 0 && destSubs.length === 0) return 0.5;

  // One has submodels, other doesn't — slight penalty
  if (srcSubs.length === 0 || destSubs.length === 0) return 0.3;

  // Both have submodels — compare count similarity
  const countRatio =
    1.0 -
    Math.abs(srcSubs.length - destSubs.length) /
      Math.max(srcSubs.length, destSubs.length);

  // Check name overlap between submodel names
  const srcNames = srcSubs.map((s) => s.name.toLowerCase());
  const destNames = destSubs.map((s) => s.name.toLowerCase());
  let nameMatches = 0;
  for (const sn of srcNames) {
    if (destNames.some((dn) => dn === sn || dn.includes(sn) || sn.includes(dn))) {
      nameMatches++;
    }
  }
  const nameOverlap =
    srcNames.length > 0 ? nameMatches / srcNames.length : 0;

  return countRatio * 0.5 + nameOverlap * 0.5;
}

// ─── Combined Scoring ───────────────────────────────────────────────

function computeScore(
  source: ParsedModel,
  dest: ParsedModel,
  sourceBounds: NormalizedBounds,
  destBounds: NormalizedBounds,
): { score: number; factors: ModelMapping["factors"] } {
  const factors = {
    type: scoreType(source, dest),
    pixels: scorePixels(source, dest),
    spatial: scoreSpatial(source, dest, sourceBounds, destBounds),
    name: scoreName(source, dest),
    submodel: scoreSubmodel(source, dest),
  };

  const score =
    factors.type * WEIGHTS.type +
    factors.pixels * WEIGHTS.pixels +
    factors.spatial * WEIGHTS.spatial +
    factors.name * WEIGHTS.name +
    factors.submodel * WEIGHTS.submodel;

  return { score, factors };
}

function scoreToConfidence(score: number): Confidence {
  if (score >= 0.85) return "high";
  if (score >= 0.6) return "medium";
  if (score >= 0.4) return "low";
  return "unmapped";
}

function generateReason(mapping: ModelMapping): string {
  const { factors, sourceModel, destModel } = mapping;
  if (!destModel) return "No suitable match found in your layout.";

  const parts: string[] = [];

  if (factors.type >= 0.9) parts.push("Type match");
  else if (factors.type >= 0.7) parts.push("Related type");
  else if (factors.type < 0.5) parts.push("Type mismatch");

  if (factors.pixels >= 0.9) {
    parts.push("Pixel count match");
  } else if (factors.pixels < 0.6 && !sourceModel.isGroup) {
    parts.push(
      `Pixel count differs (${sourceModel.pixelCount} vs ${destModel.pixelCount})`,
    );
  }

  if (factors.name >= 0.7) parts.push("Name match");

  if (factors.submodel >= 0.7) parts.push("Submodel structure match");

  return parts.join(" · ") || "Best available match";
}

// ─── Submodel Mapping ───────────────────────────────────────────────

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

      // Score by name similarity and pixel count
      let score = tokenOverlap(srcSub.name, destSub.name);
      if (srcSub.pixelCount > 0 && destSub.pixelCount > 0) {
        const pxRatio =
          1.0 -
          Math.abs(srcSub.pixelCount - destSub.pixelCount) /
            Math.max(srcSub.pixelCount, destSub.pixelCount);
        score = score * 0.6 + pxRatio * 0.4;
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

// ─── Main Matching Algorithm ────────────────────────────────────────

/**
 * Match source models to destination models using the 5-factor scoring algorithm.
 *
 * Uses a greedy approach grouped by type:
 * 1. Build score matrix for each type group
 * 2. Sort by spatial position within groups
 * 3. Assign greedily: best score first
 */
export function matchModels(
  sourceModels: ParsedModel[],
  destModels: ParsedModel[],
): MappingResult {
  const sourceBounds = getNormalizedBounds(sourceModels);
  const destBounds = getNormalizedBounds(destModels);

  // Build full score matrix
  const scoreMatrix: {
    srcIdx: number;
    destIdx: number;
    score: number;
    factors: ModelMapping["factors"];
  }[] = [];

  for (let s = 0; s < sourceModels.length; s++) {
    for (let d = 0; d < destModels.length; d++) {
      const { score, factors } = computeScore(
        sourceModels[s],
        destModels[d],
        sourceBounds,
        destBounds,
      );
      // Only consider pairs with minimum type compatibility
      if (factors.type > 0) {
        scoreMatrix.push({ srcIdx: s, destIdx: d, score, factors });
      }
    }
  }

  // Sort by score descending (greedy: assign best matches first)
  scoreMatrix.sort((a, b) => b.score - a.score);

  const assignedSource = new Set<number>();
  const assignedDest = new Set<number>();
  const mappings: ModelMapping[] = [];

  // Greedy assignment
  for (const entry of scoreMatrix) {
    if (assignedSource.has(entry.srcIdx) || assignedDest.has(entry.destIdx)) {
      continue;
    }

    const sourceModel = sourceModels[entry.srcIdx];
    const destModel = destModels[entry.destIdx];
    const confidence = scoreToConfidence(entry.score);

    // Skip very low scores
    if (entry.score < 0.15) continue;

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
    assignedSource.add(entry.srcIdx);
    assignedDest.add(entry.destIdx);
  }

  // Add unmapped source models
  for (let s = 0; s < sourceModels.length; s++) {
    if (!assignedSource.has(s)) {
      mappings.push({
        sourceModel: sourceModels[s],
        destModel: null,
        score: 0,
        confidence: "unmapped",
        factors: { type: 0, pixels: 0, spatial: 0, name: 0, submodel: 0 },
        reason: "No suitable match found in your layout.",
        submodelMappings: [],
      });
    }
  }

  // Collect unused dest models
  const unusedDestModels: ParsedModel[] = [];
  for (let d = 0; d < destModels.length; d++) {
    if (!assignedDest.has(d)) {
      unusedDestModels.push(destModels[d]);
    }
  }

  // Sort: mapped first (high → medium → low), then unmapped
  const confidenceOrder: Record<Confidence, number> = {
    high: 0,
    medium: 1,
    low: 2,
    unmapped: 3,
  };
  mappings.sort(
    (a, b) =>
      confidenceOrder[a.confidence] - confidenceOrder[b.confidence] ||
      b.score - a.score,
  );

  const mapped = mappings.filter((m) => m.destModel !== null);
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
}
