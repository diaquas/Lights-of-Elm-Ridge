import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import { isSpinnerType } from "@/types/xLightsTypes";

export type MappingPhase =
  | "auto-accept"
  | "groups"
  | "individuals"
  | "spinners"
  | "review";

export interface PhaseConfig {
  id: MappingPhase;
  label: string;
  /** Shorter label for the stepper pill (falls back to label) */
  stepperLabel?: string;
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
 *
 * Phase routing uses the xLights type system:
 * - Auto-Accept: ALL entity types with 70%+ confidence (opt-out review)
 * - Groups: MODEL_GROUP + META_GROUP + MIXED_GROUP (below 70%)
 * - Models: MODEL + SUBMODEL (below 70%)
 * - Spinners: SUBMODEL_GROUP (below 70%)
 * - Items rejected from auto-accept are routed to their natural phase
 */
export const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: "auto-accept",
    label: "Auto-Matches",
    description: "Review auto-matched items (70%+ confidence)",
    icon: "auto",
    filter: (layer) => {
      return getLayerBestScore(layer) >= 0.70;
    },
  },
  {
    id: "groups",
    label: "Groups",
    description: "Match model groups to your groups",
    icon: "groups",
    filter: (layer) => {
      if (isSpinnerType(layer.sourceModel.groupType)) return false;
      if (!layer.isGroup) return false;
      return getLayerBestScore(layer) < 0.70;
    },
  },
  {
    id: "individuals",
    label: "Models",
    description: "Match individual models one by one",
    icon: "individuals",
    filter: (layer) => {
      if (isSpinnerType(layer.sourceModel.groupType)) return false;
      if (layer.isGroup) return false;
      return getLayerBestScore(layer) < 0.70;
    },
  },
  {
    id: "spinners",
    label: "Submodel Groups",
    stepperLabel: "Submodels",
    description: "Match submodel groups for spinners, wreaths & HD props",
    icon: "spinners",
    filter: (layer) => {
      if (!isSpinnerType(layer.sourceModel.groupType)) return false;
      return getLayerBestScore(layer) < 0.70;
    },
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
