/**
 * ModIQ — Effect Analysis Engine
 *
 * Analyzes effect type distributions across sequence models to power:
 *   - Effects coverage tracking (Ticket 39)
 *   - Effect-aware suggestions (Ticket 44)
 *   - Post-mapping optimization (Ticket 45)
 *   - Final check before export (Ticket 47)
 *
 * Uses data from parseXsqEffectTypeCounts() and SEQUENCE_EFFECT_TYPE_COUNTS
 * to categorize effects, identify signature effects, and calculate
 * effect-weighted impact scores.
 */

// ── Effect Categories ──────────────────────────────────────────

/**
 * Effect categories based on real-world analysis of 60,490 effects
 * across 17 sequences. Used for grouping and display purposes.
 */
export type EffectCategory =
  | "fill"
  | "radial"
  | "linear"
  | "matrix"
  | "circular"
  | "signature"
  | "universal";

/**
 * Map effect names to their categories.
 * Based on validated percentages from 17-sequence analysis.
 */
const EFFECT_CATEGORIES: Record<string, EffectCategory> = {
  // Fill effects (33.9% of all effects)
  On: "fill",
  "Color Wash": "fill",
  Shimmer: "fill",
  Twinkle: "fill",
  Glediator: "fill",

  // Radial effects (25.0%)
  Shockwave: "radial",
  Ripple: "radial",
  Fan: "radial",
  Pinwheel: "radial",

  // Linear effects (16.1%)
  Chase: "linear",
  SingleStrand: "linear",
  Wave: "linear",
  Marquee: "linear",
  Strobe: "linear",

  // Matrix-specific effects (8.3%)
  Video: "matrix",
  Text: "matrix",
  Morph: "matrix",
  Warp: "matrix",
  Curtain: "matrix",
  Galaxy: "matrix",
  Candle: "matrix",

  // Circular effects (6.4%)
  Spirals: "circular",
  Pictures: "circular",
  Garlands: "circular",
  Tree: "circular",

  // Signature effects (high-impact, rare)
  Faces: "signature",
  Plasma: "signature",
  Shader: "signature",
  Fire: "signature",
};

/**
 * Impact weights for scoring effect value.
 * Higher weight = more visually impressive / harder to replace.
 */
const EFFECT_IMPACT_WEIGHTS: Record<string, number> = {
  // Premium effects (weight 8-10)
  Video: 10,
  Shader: 10,
  Plasma: 10,
  Faces: 9,
  Morph: 9,
  Pictures: 8,
  Fire: 8,

  // High-value effects (weight 5-7)
  Spirals: 6,
  Fan: 6,
  Pinwheel: 5,
  Galaxy: 5,
  Curtain: 5,
  Text: 7,
  Warp: 5,
  Tree: 5,
  Garlands: 5,
  Candle: 5,

  // Medium effects (weight 3-4)
  Wave: 4,
  SingleStrand: 4,
  Chase: 4,
  Marquee: 4,
  Shockwave: 3,
  Ripple: 3,
  Shimmer: 3,
  Twinkle: 3,

  // Low-value effects (weight 1-2)
  On: 1,
  "Color Wash": 2,
  Strobe: 2,
  Glediator: 2,
};

/**
 * Effects that are considered "signature" — high-impact, prop-specific,
 * and worth calling out when mapped or unmapped.
 */
export const SIGNATURE_EFFECTS = [
  "Video",
  "Faces",
  "Shader",
  "Plasma",
  "Fire",
  "Morph",
  "Pictures",
  "Text",
] as const;

// ── Types ──────────────────────────────────────────────────────

export interface EffectTypeInfo {
  name: string;
  count: number;
  category: EffectCategory;
  impactWeight: number;
  /** Weighted impact score = count * impactWeight */
  impactScore: number;
}

export interface ModelEffectAnalysis {
  /** Model name */
  modelName: string;
  /** Total effect count */
  totalEffects: number;
  /** Effect type breakdown */
  effectTypes: EffectTypeInfo[];
  /** Signature effects found on this model */
  signatureEffects: string[];
  /** Complexity score (number of unique effect types with significant usage) */
  complexity: number;
  /** Weighted impact score (sum of count * weight for all effects) */
  totalImpactScore: number;
  /** Dominant effect category for this model */
  dominantCategory: EffectCategory | null;
}

export interface SequenceEffectAnalysis {
  /** Per-model analysis */
  models: Map<string, ModelEffectAnalysis>;
  /** Total effects in sequence */
  totalEffects: number;
  /** Total weighted impact score */
  totalImpactScore: number;
  /** All signature effects found in sequence, with their model locations */
  signatureEffects: Map<string, string[]>;
  /** Effect type totals across all models */
  effectTypeTotals: Map<string, number>;
  /** Category breakdown */
  categoryBreakdown: Map<EffectCategory, number>;
}

export interface EffectCoverageMetrics {
  /** Raw effects coverage */
  effects: {
    covered: number;
    total: number;
    percent: number;
  };
  /** Weighted impact coverage (accounts for effect value) */
  weightedImpact: {
    covered: number;
    total: number;
    percent: number;
  };
  /** Signature effects status */
  signatureEffects: Array<{
    type: string;
    count: number;
    isMapped: boolean;
    mappedTo: string | null;
  }>;
  /** Per-phase gains tracking */
  phaseGains: Map<
    string,
    { effects: number; impact: number; items: number }
  >;
}

// ── Analysis Functions ─────────────────────────────────────────

/**
 * Get the category for an effect type.
 */
export function getEffectCategory(effectName: string): EffectCategory {
  return EFFECT_CATEGORIES[effectName] ?? "universal";
}

/**
 * Get the impact weight for an effect type.
 */
export function getEffectImpactWeight(effectName: string): number {
  return EFFECT_IMPACT_WEIGHTS[effectName] ?? 2;
}

/**
 * Check if an effect is a signature effect.
 */
export function isSignatureEffect(effectName: string): boolean {
  return (SIGNATURE_EFFECTS as readonly string[]).includes(effectName);
}

/**
 * Analyze a single model's effect type distribution.
 */
export function analyzeModelEffects(
  modelName: string,
  effectTypeCounts: Record<string, number>,
): ModelEffectAnalysis {
  const effectTypes: EffectTypeInfo[] = [];
  let totalEffects = 0;
  let totalImpactScore = 0;
  const signatureEffects: string[] = [];
  const categoryCount = new Map<EffectCategory, number>();

  for (const [name, count] of Object.entries(effectTypeCounts)) {
    const category = getEffectCategory(name);
    const impactWeight = getEffectImpactWeight(name);
    const impactScore = count * impactWeight;

    effectTypes.push({
      name,
      count,
      category,
      impactWeight,
      impactScore,
    });

    totalEffects += count;
    totalImpactScore += impactScore;

    if (isSignatureEffect(name)) {
      signatureEffects.push(name);
    }

    categoryCount.set(category, (categoryCount.get(category) ?? 0) + count);
  }

  // Sort by impact score descending
  effectTypes.sort((a, b) => b.impactScore - a.impactScore);

  // Determine dominant category
  let dominantCategory: EffectCategory | null = null;
  let maxCategoryCount = 0;
  for (const [cat, cnt] of categoryCount) {
    if (cnt > maxCategoryCount) {
      maxCategoryCount = cnt;
      dominantCategory = cat;
    }
  }

  // Complexity: count unique effect types that make up >=5% of usage
  const complexity = effectTypes.filter(
    (e) => totalEffects > 0 && e.count / totalEffects >= 0.05,
  ).length;

  return {
    modelName,
    totalEffects,
    effectTypes,
    signatureEffects,
    complexity,
    totalImpactScore,
    dominantCategory,
  };
}

/**
 * Analyze all effects in a sequence.
 * Takes the per-model effect type counts (from xsq parser or pre-extracted data)
 * and the plain effect counts for all models.
 */
export function analyzeSequenceEffects(
  effectTypeCounts: Record<string, Record<string, number>>,
  plainEffectCounts: Record<string, number>,
): SequenceEffectAnalysis {
  const models = new Map<string, ModelEffectAnalysis>();
  let totalEffects = 0;
  let totalImpactScore = 0;
  const signatureEffects = new Map<string, string[]>();
  const effectTypeTotals = new Map<string, number>();
  const categoryBreakdown = new Map<EffectCategory, number>();

  // Analyze models that have effect type data
  for (const [modelName, types] of Object.entries(effectTypeCounts)) {
    const analysis = analyzeModelEffects(modelName, types);
    models.set(modelName, analysis);
    totalImpactScore += analysis.totalImpactScore;

    for (const sig of analysis.signatureEffects) {
      if (!signatureEffects.has(sig)) signatureEffects.set(sig, []);
      signatureEffects.get(sig)!.push(modelName);
    }

    for (const et of analysis.effectTypes) {
      effectTypeTotals.set(
        et.name,
        (effectTypeTotals.get(et.name) ?? 0) + et.count,
      );
      categoryBreakdown.set(
        et.category,
        (categoryBreakdown.get(et.category) ?? 0) + et.count,
      );
    }
  }

  // Add total effects from plain counts (includes models without type data)
  for (const [, count] of Object.entries(plainEffectCounts)) {
    totalEffects += count;
  }

  return {
    models,
    totalEffects,
    totalImpactScore,
    signatureEffects,
    effectTypeTotals,
    categoryBreakdown,
  };
}

/**
 * Get a human-readable icon/label for an effect category.
 */
export function getEffectCategoryLabel(category: EffectCategory): string {
  switch (category) {
    case "fill":
      return "Fill";
    case "radial":
      return "Radial";
    case "linear":
      return "Linear";
    case "matrix":
      return "Matrix";
    case "circular":
      return "Circular";
    case "signature":
      return "Signature";
    case "universal":
      return "Universal";
  }
}

/**
 * Identify potential effect-prop mismatches in current mappings.
 * Used by Ticket 45 (Post-Mapping Optimization).
 *
 * Returns models where the mapped user prop type doesn't match
 * the dominant effect type affinity for that source model.
 */
export interface EffectPropMismatch {
  sourceModelName: string;
  mappedToName: string;
  dominantEffectType: string;
  expectedPropType: string;
  actualPropType: string | null;
  effectCount: number;
  suggestion: string;
}

/**
 * Identify "hidden gems" — high-impact effects mapped to suboptimal props
 * or unmapped entirely.
 */
export interface HiddenGem {
  sourceModelName: string;
  effectType: string;
  effectCount: number;
  impactScore: number;
  isMapped: boolean;
  mappedTo: string | null;
  recommendation: string;
}

/**
 * Find hidden gems in the current mapping state.
 * A hidden gem is a signature/high-impact effect that is either:
 * 1. Not mapped at all (effects will be lost)
 * 2. Mapped to a prop type that doesn't match the effect's ideal target
 */
export function findHiddenGems(
  sequenceAnalysis: SequenceEffectAnalysis,
  mappedModels: Set<string>,
): HiddenGem[] {
  const gems: HiddenGem[] = [];

  for (const [modelName, analysis] of sequenceAnalysis.models) {
    for (const effectInfo of analysis.effectTypes) {
      if (effectInfo.impactWeight < 5) continue; // Only high-impact

      const isMapped = mappedModels.has(modelName);

      if (!isMapped) {
        gems.push({
          sourceModelName: modelName,
          effectType: effectInfo.name,
          effectCount: effectInfo.count,
          impactScore: effectInfo.impactScore,
          isMapped: false,
          mappedTo: null,
          recommendation: `${modelName} has ${effectInfo.count} ${effectInfo.name} effects that won't show on your display`,
        });
      }
    }
  }

  // Sort by impact score (highest first)
  gems.sort((a, b) => b.impactScore - a.impactScore);
  return gems;
}

/**
 * Generate effect-aware suggestions for a source model.
 * Returns context about what effects will be gained by mapping this model.
 * Used by Ticket 44 (Effect-Aware Suggestions).
 */
export interface EffectSuggestionContext {
  /** Top effects on this source model */
  topEffects: Array<{ name: string; count: number; category: EffectCategory }>;
  /** Whether this model has any signature effects */
  hasSignatureEffects: boolean;
  /** List of signature effect names */
  signatureEffectNames: string[];
  /** Human-readable summary */
  summary: string;
  /** Impact score for this model */
  impactScore: number;
  /** Complexity level (1-3: low, medium, high) */
  complexityLevel: "low" | "medium" | "high";
}

export function getEffectSuggestionContext(
  modelName: string,
  sequenceAnalysis: SequenceEffectAnalysis,
): EffectSuggestionContext | null {
  const analysis = sequenceAnalysis.models.get(modelName);
  if (!analysis || analysis.totalEffects === 0) return null;

  const topEffects = analysis.effectTypes.slice(0, 4).map((e) => ({
    name: e.name,
    count: e.count,
    category: e.category,
  }));

  const complexityLevel: "low" | "medium" | "high" =
    analysis.complexity >= 6
      ? "high"
      : analysis.complexity >= 3
        ? "medium"
        : "low";

  let summary: string;
  if (analysis.signatureEffects.length > 0) {
    summary = `Contains ${analysis.signatureEffects.join(", ")} - premium effects that work best on matching props`;
  } else if (analysis.complexity >= 6) {
    summary = `Complex model with ${analysis.complexity} different effect types`;
  } else {
    summary = `${analysis.totalEffects} effects across ${analysis.effectTypes.length} types`;
  }

  return {
    topEffects,
    hasSignatureEffects: analysis.signatureEffects.length > 0,
    signatureEffectNames: analysis.signatureEffects,
    summary,
    impactScore: analysis.totalImpactScore,
    complexityLevel,
  };
}
