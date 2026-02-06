/**
 * xLights Entity Type System
 *
 * Based on analysis of production xLights layouts including
 * Ron Howard's 14,000+ line layout with 4,071 submodels.
 *
 * Key insight: Detection is deterministic — you can always determine
 * the entity type by examining member names:
 *   - `/` in name → submodel
 *   - ends with ` GRP` → group
 *   - everything else → model
 */

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/**
 * The 6 possible entity types in xLights:
 *
 * - MODEL          — Physical prop/fixture (e.g., "Arch 1", "Star 1")
 * - SUBMODEL       — Named portion of a model (e.g., "Arch 1/Inner Ring")
 * - MODEL_GROUP    — Group containing ONLY models
 * - SUBMODEL_GROUP — Group containing ONLY submodels ("spinners")
 * - META_GROUP     — Group containing ONLY other groups
 * - MIXED_GROUP    — Group with mixed content types
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
 * Simplified type for UI phase filtering:
 *
 * - MODEL   — Individual physical props and submodels
 * - GROUP   — MODEL_GROUP + META_GROUP + MIXED_GROUP (groups of "wholes")
 * - SPINNER — SUBMODEL_GROUP only (groups of "parts")
 */
export type ModIQPhaseType = "MODEL" | "GROUP" | "SPINNER";

// =============================================================================
// ENTITY INTERFACES
// =============================================================================

export interface XLightsEntity {
  name: string;
  entityType: XLightsEntityType;
  phaseType: ModIQPhaseType;
}

export interface XLightsModel extends XLightsEntity {
  entityType: "MODEL";
  phaseType: "MODEL";
  hasSubmodels: boolean;
  submodels: string[];
}

export interface XLightsSubmodel extends XLightsEntity {
  entityType: "SUBMODEL";
  phaseType: "MODEL";
  parentModel: string;
  fullName: string; // "ParentModel/SubmodelName"
}

export interface XLightsGroup extends XLightsEntity {
  entityType: "MODEL_GROUP" | "SUBMODEL_GROUP" | "META_GROUP" | "MIXED_GROUP";
  phaseType: "GROUP" | "SPINNER";
  members: string[];
  memberBreakdown: {
    models: string[];
    submodels: string[];
    groups: string[];
  };
}

// =============================================================================
// TYPE DETECTION FUNCTIONS
// =============================================================================

/**
 * Parse a member name to extract type info.
 *
 * - Contains `/` → submodel with parent/child split
 * - Ends with ` GRP` → group reference
 * - Everything else → model
 */
export function parseMemberName(memberName: string): {
  isSubmodel: boolean;
  isGroup: boolean;
  parentModel?: string;
  submodelName?: string;
} {
  if (memberName.includes("/")) {
    const [parent, child] = memberName.split("/");
    return {
      isSubmodel: true,
      isGroup: false,
      parentModel: parent,
      submodelName: child,
    };
  }
  if (memberName.endsWith(" GRP")) {
    return {
      isSubmodel: false,
      isGroup: true,
    };
  }
  return {
    isSubmodel: false,
    isGroup: false,
  };
}

/**
 * Analyze group members and return breakdown by type.
 */
export function analyzeGroupMembers(members: string[]): {
  models: string[];
  submodels: string[];
  groups: string[];
} {
  const result = {
    models: [] as string[],
    submodels: [] as string[],
    groups: [] as string[],
  };

  for (const member of members) {
    const parsed = parseMemberName(member);
    if (parsed.isSubmodel) {
      result.submodels.push(member);
    } else if (parsed.isGroup) {
      result.groups.push(member);
    } else {
      result.models.push(member);
    }
  }

  return result;
}

/**
 * Determine the entity type of a modelGroup based on its members.
 *
 * Detection is strictly deterministic — based purely on member composition:
 * - All submodels (have `/`) → SUBMODEL_GROUP
 * - All groups (end in ` GRP`) → META_GROUP
 * - All models (no `/`, no ` GRP`) → MODEL_GROUP
 * - Any combination → MIXED_GROUP
 *
 * Empty groups default to MODEL_GROUP.
 */
export function detectGroupType(members: string[]): GroupEntityType {
  if (members.length === 0) return "MODEL_GROUP";

  let hasModels = false;
  let hasSubmodels = false;
  let hasGroups = false;

  for (const member of members) {
    if (member.includes("/")) {
      hasSubmodels = true;
    } else if (member.endsWith(" GRP")) {
      hasGroups = true;
    } else {
      hasModels = true;
    }
  }

  // Determine type based on what it contains
  if (hasSubmodels && !hasModels && !hasGroups) return "SUBMODEL_GROUP";
  if (hasGroups && !hasModels && !hasSubmodels) return "META_GROUP";
  if (hasModels && !hasSubmodels && !hasGroups) return "MODEL_GROUP";
  return "MIXED_GROUP";
}

// =============================================================================
// PHASE TYPE MAPPING
// =============================================================================

/**
 * Determine which ModIQ phase this entity belongs to:
 *
 * - MODEL, SUBMODEL → "MODEL" (Individuals phase)
 * - SUBMODEL_GROUP → "SPINNER" (Spinners phase)
 * - MODEL_GROUP, META_GROUP, MIXED_GROUP → "GROUP" (Groups phase)
 */
export function getPhaseType(entityType: XLightsEntityType): ModIQPhaseType {
  switch (entityType) {
    case "MODEL":
    case "SUBMODEL":
      return "MODEL";
    case "SUBMODEL_GROUP":
      return "SPINNER";
    case "MODEL_GROUP":
    case "META_GROUP":
    case "MIXED_GROUP":
      return "GROUP";
  }
}

/**
 * Determine the entity type for a parsed model.
 * Bridge function for the existing ParsedModel interface.
 */
export function getEntityType(model: {
  isGroup: boolean;
  groupType?: string;
  name: string;
}): XLightsEntityType {
  if (model.isGroup) {
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

// =============================================================================
// CONVENIENCE HELPERS
// =============================================================================

/**
 * Check if an entity type represents a spinner (SUBMODEL_GROUP).
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
