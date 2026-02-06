import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export type MappingPhase =
  | "auto-accept"
  | "groups"
  | "individuals"
  | "spinners"
  | "review";

export interface PhaseConfig {
  id: MappingPhase;
  label: string;
  description: string;
  icon: string;
  filter: (layer: SourceLayerMapping) => boolean;
}

/**
 * Phase definitions for the ModIQ mapping wizard.
 *
 * Ordering: Auto-Accept → Groups → Individuals → Spinners → Review
 *
 * Auto-accept captures high-confidence matches (score >= 0.85).
 * Groups captures MODEL_GRP items below auto-accept threshold.
 * Individuals captures non-group, non-spinner items below auto-accept.
 * Spinners captures SUBMODEL_GRP items (any confidence).
 * Review is the final summary/export step.
 */
export const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: "auto-accept",
    label: "Auto-Matches",
    description: "High-confidence matches ready to accept",
    icon: "auto",
    filter: (layer) => {
      // Spinners always go to their own phase regardless of confidence
      if (layer.sourceModel.groupType === "SUBMODEL_GRP") return false;
      // High-confidence = auto-accept candidates
      return getLayerBestScore(layer) >= 0.85;
    },
  },
  {
    id: "groups",
    label: "Groups",
    description: "Match model groups to your groups",
    icon: "groups",
    filter: (layer) => {
      if (layer.sourceModel.groupType === "SUBMODEL_GRP") return false;
      if (!layer.isGroup) return false;
      return getLayerBestScore(layer) < 0.85;
    },
  },
  {
    id: "individuals",
    label: "Models",
    description: "Match individual models one by one",
    icon: "individuals",
    filter: (layer) => {
      if (layer.sourceModel.groupType === "SUBMODEL_GRP") return false;
      if (layer.isGroup) return false;
      return getLayerBestScore(layer) < 0.85;
    },
  },
  {
    id: "spinners",
    label: "Spinners",
    description: "Semantic matching for spinner submodel groups",
    icon: "spinners",
    filter: (layer) => layer.sourceModel.groupType === "SUBMODEL_GRP",
  },
  {
    id: "review",
    label: "Review",
    description: "Review all mappings before export",
    icon: "review",
    filter: () => true,
  },
];

/**
 * Helper: get the best match score for a layer.
 * Uses the first suggestion score from the interactive mapping hook.
 * This is a placeholder — will be populated by the context based on actual suggestions.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getLayerBestScore(_layer: SourceLayerMapping): number {
  // The actual score lookup happens in MappingPhaseContext where we have
  // access to getSuggestionsForLayer. This static filter is used as a
  // fallback and re-computed with real scores at runtime.
  return 0;
}

/**
 * Get the best score for a layer from a precomputed score map.
 */
export function getLayerBestScoreFromMap(
  layer: SourceLayerMapping,
  scoreMap: Map<string, number>,
): number {
  return scoreMap.get(layer.sourceModel.name) ?? 0;
}
