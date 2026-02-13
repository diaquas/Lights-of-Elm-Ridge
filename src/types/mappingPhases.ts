import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";
import { isSpinnerType } from "@/types/xLightsTypes";

export type MappingPhase =
  | "individuals"
  | "spinners"
  | "finalize"
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
 * Ordering: [Upload (always done)] → Groups & Models → Submodels → Display Coverage → Review
 *
 * Auto-matches (70%+ confidence) are pre-applied during the loading screen
 * and appear inline in their natural phase with a Link2 badge.
 *
 * Phase routing uses the xLights type system:
 * - Groups & Models: MODEL_GROUP + META_GROUP + MIXED_GROUP + MODEL + SUBMODEL
 * - Spinners: SUBMODEL_GROUP
 */
export const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: "individuals",
    label: "Groups & Models",
    stepperLabel: "Groups & Models",
    description: "Match groups and individual models",
    icon: "groups",
    filter: (layer) => {
      return !isSpinnerType(layer.sourceModel.groupType);
    },
  },
  {
    id: "spinners",
    label: "Submodel Groups",
    stepperLabel: "Submodels",
    description: "Match submodel groups for spinners, wreaths & HD props",
    icon: "spinners",
    filter: (layer) => {
      return isSpinnerType(layer.sourceModel.groupType);
    },
  },
  {
    id: "finalize",
    label: "Display Coverage",
    stepperLabel: "Coverage",
    description: "Fill coverage gaps in your display",
    icon: "finalize",
    filter: () => true, // Shows all non-skipped items
  },
  {
    id: "review",
    label: "Review",
    description: "Review metrics and export",
    icon: "review",
    filter: () => true,
  },
];

/** Score threshold: items at or above are considered "strong" auto-matches */
export const STRONG_THRESHOLD = 0.75;

/** Score threshold: items at or above are auto-matched during loading */
export const AUTO_ACCEPT_THRESHOLD = 0.70;

export function getLayerBestScoreFromMap(
  layer: SourceLayerMapping,
  scoreMap: Map<string, number>,
): number {
  return scoreMap.get(layer.sourceModel.name) ?? 0;
}
