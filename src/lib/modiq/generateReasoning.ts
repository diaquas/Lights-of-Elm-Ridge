import type { MatchReasoning, ReasoningComponent } from "@/types/matching";
import type { ModelMapping } from "./matcher";

/**
 * Generate human-readable reasoning for a match score.
 * Uses the 5-factor scoring breakdown from matcher.ts.
 */
export function generateMatchReasoning(
  factors: ModelMapping["factors"],
  score: number,
): MatchReasoning {
  const components: ReasoningComponent[] = [];
  const whyNotHigher: string[] = [];

  // Name factor (weight: 0.40)
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
    score: factors.name * 0.4,
    maxScore: 0.4,
  });
  if (factors.name < 0.5) {
    whyNotHigher.push("Different naming conventions");
  }

  // Spatial factor (weight: 0.25)
  components.push({
    factor: "Spatial Position",
    description:
      factors.spatial >= 0.8
        ? "Similar position in layout"
        : factors.spatial >= 0.4
          ? "Somewhat similar position"
          : "Different layout position",
    score: factors.spatial * 0.25,
    maxScore: 0.25,
  });
  if (factors.spatial < 0.4) {
    whyNotHigher.push("Different layout positions");
  }

  // Shape factor (weight: 0.15)
  components.push({
    factor: "Shape Match",
    description:
      factors.shape >= 0.8
        ? "Same shape/form factor"
        : factors.shape > 0
          ? "Different shapes"
          : "No shape match",
    score: factors.shape * 0.15,
    maxScore: 0.15,
  });

  // Type factor (weight: 0.12)
  components.push({
    factor: "Model Type",
    description:
      factors.type >= 0.8
        ? "Same model type"
        : factors.type > 0
          ? "Related type"
          : "Different types",
    score: factors.type * 0.12,
    maxScore: 0.12,
  });
  if (factors.type < 0.5) {
    whyNotHigher.push("Different model types");
  }

  // Pixels factor (weight: 0.08)
  components.push({
    factor: "Pixel Count",
    description:
      factors.pixels >= 0.8
        ? "Similar pixel count"
        : factors.pixels > 0
          ? "Different pixel counts"
          : "No pixel data",
    score: factors.pixels * 0.08,
    maxScore: 0.08,
  });

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
  };
}
