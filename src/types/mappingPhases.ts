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

/** Upload is always shown as completed — the actual upload happens before the wizard. */
export const UPLOAD_STEP = {
  id: "upload" as const,
  label: "Upload",
  icon: "upload",
};

/**
 * Phase definitions for the ModIQ mapping wizard.
 *
 * Ordering: [Upload (always done)] → Auto-Accept → Groups → Individuals → Spinners → Review
 */
export const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: "auto-accept",
    label: "Auto-Matches",
    description: "High-confidence matches ready to accept",
    icon: "auto",
    filter: (layer) => {
      if (layer.sourceModel.groupType === "SUBMODEL_GRP") return false;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getLayerBestScore(_layer: SourceLayerMapping): number {
  return 0;
}

export function getLayerBestScoreFromMap(
  layer: SourceLayerMapping,
  scoreMap: Map<string, number>,
): number {
  return scoreMap.get(layer.sourceModel.name) ?? 0;
}
