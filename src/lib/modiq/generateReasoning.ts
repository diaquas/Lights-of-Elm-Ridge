import type { MatchReasoning, ReasoningComponent } from "@/types/matching";
import type { ModelMapping } from "./matcher";

/**
 * Generate human-readable reasoning for a match score.
 * Uses the 6-factor scoring breakdown from matcher.ts (V3).
 */
export function generateMatchReasoning(
  factors: ModelMapping["factors"],
  score: number,
  pixelInfo?: { source: number; dest: number },
): MatchReasoning {
  const components: ReasoningComponent[] = [];
  const whyNotHigher: string[] = [];

  // Name factor (weight: 0.38)
  components.push({
    factor: "Name Match",
    description:
      factors.name >= 0.85
        ? "Strong name match"
        : factors.name >= 0.5
          ? "Partial name match"
          : factors.name > 0
            ? "Weak name similarity"
            : "No name overlap",
    score: factors.name * 0.38,
    maxScore: 0.38,
  });
  if (factors.name < 0.5) {
    whyNotHigher.push("Different naming conventions");
  }

  // Spatial factor (weight: 0.22)
  components.push({
    factor: "Spatial Position",
    description:
      factors.spatial >= 0.8
        ? "Similar position in layout"
        : factors.spatial >= 0.4
          ? "Somewhat similar position"
          : "Different layout position",
    score: factors.spatial * 0.22,
    maxScore: 0.22,
  });
  if (factors.spatial < 0.4) {
    whyNotHigher.push("Different layout positions");
  }

  // Shape factor (weight: 0.13)
  components.push({
    factor: "Shape Match",
    description:
      factors.shape >= 0.8
        ? "Same shape/form factor"
        : factors.shape > 0
          ? "Different shapes"
          : "No shape match",
    score: factors.shape * 0.13,
    maxScore: 0.13,
  });

  // Type factor (weight: 0.10)
  components.push({
    factor: "Model Type",
    description:
      factors.type >= 0.8
        ? "Same model type"
        : factors.type > 0
          ? "Related type"
          : "Different types",
    score: factors.type * 0.10,
    maxScore: 0.10,
  });
  if (factors.type < 0.5) {
    whyNotHigher.push("Different model types");
  }

  // Pixels factor (weight: 0.10)
  components.push({
    factor: "Pixel Count",
    description:
      factors.pixels >= 0.8
        ? "Similar pixel count"
        : factors.pixels >= 0.3
          ? "Different pixel counts"
          : factors.pixels > 0
            ? "Very different pixel counts"
            : "No pixel data",
    score: factors.pixels * 0.10,
    maxScore: 0.10,
  });
  if (factors.pixels < 0.3) {
    whyNotHigher.push("Pixel counts differ significantly");
  }

  // Structure factor (weight: 0.07)
  const structureScore = factors.structure ?? 0.5;
  components.push({
    factor: "Structure",
    description:
      structureScore >= 0.8
        ? "Similar submodel structure"
        : structureScore >= 0.4
          ? "Different structure"
          : structureScore > 0
            ? "Very different structure"
            : "No structure data",
    score: structureScore * 0.07,
    maxScore: 0.07,
  });
  if (structureScore <= 0.2) {
    whyNotHigher.push("Different internal structure (submodel count)");
  }

  // Summary
  let summary: string;
  if (score >= 0.85) {
    summary = "Excellent match across all factors";
  } else if (score >= 0.60) {
    summary = "Good match with some differences";
  } else if (score >= 0.40) {
    summary = "Possible match — review recommended";
  } else {
    summary = "Weak match — manual review needed";
  }

  return {
    components,
    whyNotHigher: whyNotHigher.length > 0 ? whyNotHigher : undefined,
    summary,
    pixelComparison:
      pixelInfo && pixelInfo.source > 0 && pixelInfo.dest > 0
        ? pixelInfo
        : undefined,
  };
}
