/**
 * xLights Type System for ModIQ
 *
 * Defines the six distinct entity types found in xLights XML layouts
 * and their mapping to ModIQ's simplified phase types for UI routing.
 *
 * Based on analysis of production layouts including 14,000+ line
 * configurations with 4,000+ submodels.
 */

// ─── Entity Types ────────────────────────────────────────

/**
 * The six entity types found in xLights layouts:
 *
 * - MODEL          — Physical prop/fixture (e.g., "Arch 1", "Star 1")
 * - SUBMODEL       — Named portion of a model (e.g., "Arch 1/Inner Ring")
 * - MODEL_GROUP    — Group containing only models
 * - SUBMODEL_GROUP — Group containing only submodels (spinner parts)
 * - META_GROUP     — Group containing only other groups
 * - MIXED_GROUP    — Group containing multiple member types
 */
export type XLightsEntityType =
  | "MODEL"
  | "SUBMODEL"
  | "MODEL_GROUP"
  | "SUBMODEL_GROUP"
  | "META_GROUP"
  | "MIXED_GROUP";

/** The four group-specific entity types. */
export type GroupEntityType =
  | "MODEL_GROUP"
  | "SUBMODEL_GROUP"
  | "META_GROUP"
  | "MIXED_GROUP";

/**
 * Simplified phase types for ModIQ UI routing:
 *
 * - MODEL   — Individual props and submodels
 * - GROUP   — MODEL_GROUP + META_GROUP + MIXED_GROUP (groups of "wholes")
 * - SPINNER — SUBMODEL_GROUP only (groups of "parts")
 */
export type ModIQPhaseType = "MODEL" | "GROUP" | "SPINNER";

// ─── Member Analysis ─────────────────────────────────────

/** The type of a single member within a group. */
export type MemberType = "model" | "submodel" | "group";

/** Result of analyzing all members of a group. */
export interface GroupMemberAnalysis {
  models: string[];
  submodels: string[];
  groups: string[];
  total: number;
}

/**
 * Classify a single member name by its type:
 * - Contains `/` → submodel (e.g., "PPD Wreath/Spiral-1")
 * - Ends with ` GRP` (case-insensitive) → group (e.g., "All Arches GRP")
 * - Everything else → model
 */
export function parseMemberType(memberName: string): MemberType {
  if (memberName.includes("/")) return "submodel";
  if (/\sGRP$/i.test(memberName)) return "group";
  return "model";
}

/**
 * Analyze all members of a group, categorizing each by type.
 */
export function analyzeGroupMembers(members: string[]): GroupMemberAnalysis {
  const result: GroupMemberAnalysis = {
    models: [],
    submodels: [],
    groups: [],
    total: members.length,
  };

  for (const member of members) {
    const type = parseMemberType(member);
    switch (type) {
      case "model":
        result.models.push(member);
        break;
      case "submodel":
        result.submodels.push(member);
        break;
      case "group":
        result.groups.push(member);
        break;
    }
  }

  return result;
}

/**
 * Determine the group entity type from its member composition:
 *
 * - All submodels → SUBMODEL_GROUP
 * - All groups → META_GROUP
 * - All models → MODEL_GROUP
 * - Mix of types → MIXED_GROUP
 *
 * Empty groups default to MODEL_GROUP.
 */
export function detectGroupType(members: string[]): GroupEntityType {
  if (members.length === 0) return "MODEL_GROUP";

  const analysis = analyzeGroupMembers(members);

  // Pure composition checks
  if (analysis.submodels.length === analysis.total) return "SUBMODEL_GROUP";
  if (analysis.groups.length === analysis.total) return "META_GROUP";
  if (analysis.models.length === analysis.total) return "MODEL_GROUP";

  // Majority submodel (≥50% submodels with ≤2 unique parents) → SUBMODEL_GROUP
  // This handles cases where a spinner group has a few model refs mixed in
  if (analysis.submodels.length >= analysis.total * 0.5) {
    const parentNames = new Set<string>();
    for (const sub of analysis.submodels) {
      const slashIdx = sub.indexOf("/");
      if (slashIdx > 0) parentNames.add(sub.substring(0, slashIdx));
    }
    if (parentNames.size <= 2) return "SUBMODEL_GROUP";
  }

  // Everything else is mixed
  return "MIXED_GROUP";
}

// ─── Phase Type Mapping ──────────────────────────────────

/**
 * Map an xLights entity type to its ModIQ phase type:
 *
 * - MODEL, SUBMODEL → "MODEL" (Individuals phase)
 * - MODEL_GROUP, META_GROUP, MIXED_GROUP → "GROUP" (Groups phase)
 * - SUBMODEL_GROUP → "SPINNER" (Spinners phase)
 */
export function getPhaseType(entityType: XLightsEntityType): ModIQPhaseType {
  switch (entityType) {
    case "MODEL":
    case "SUBMODEL":
      return "MODEL";
    case "MODEL_GROUP":
    case "META_GROUP":
    case "MIXED_GROUP":
      return "GROUP";
    case "SUBMODEL_GROUP":
      return "SPINNER";
  }
}

/**
 * Determine the entity type for a parsed model.
 * Works with the existing ParsedModel interface.
 */
export function getEntityType(model: {
  isGroup: boolean;
  groupType?: string;
  name: string;
}): XLightsEntityType {
  if (model.isGroup) {
    // Group types map directly
    switch (model.groupType) {
      case "SUBMODEL_GROUP":
        return "SUBMODEL_GROUP";
      case "META_GROUP":
        return "META_GROUP";
      case "MIXED_GROUP":
        return "MIXED_GROUP";
      case "MODEL_GROUP":
      default:
        return "MODEL_GROUP";
    }
  }

  // Non-groups: check for submodel (contains `/`)
  if (model.name.includes("/")) return "SUBMODEL";
  return "MODEL";
}

/**
 * Check if an entity type represents a spinner (SUBMODEL_GROUP).
 * Convenience function for phase filtering.
 */
export function isSpinnerType(groupType?: string): boolean {
  return groupType === "SUBMODEL_GROUP";
}

/**
 * Check if a group type should appear in the Groups phase.
 * MODEL_GROUP, META_GROUP, and MIXED_GROUP are all "groups of wholes".
 */
export function isGroupPhaseType(groupType?: string): boolean {
  return (
    groupType === "MODEL_GROUP" ||
    groupType === "META_GROUP" ||
    groupType === "MIXED_GROUP"
  );
}
