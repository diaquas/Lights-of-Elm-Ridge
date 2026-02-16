/**
 * Core xLights model types used across all packages.
 *
 * These types represent the structured data extracted from xLights XML files.
 * They are the "lingua franca" between parsers, engines, and generators.
 */

/** Submodel within a larger prop (e.g., spinner spoke, face feature) */
export interface SubModel {
  name: string;
  type: string;
  rangeData: string;
  pixelCount: number;
}

/**
 * Group classification for xLights model groups.
 *
 * - MODEL_GROUP    — Group of independent models (e.g., "All Mega Trees")
 * - SUBMODEL_GROUP — Group of submodel parts from a single prop (e.g., spinner spokes)
 * - META_GROUP     — Group containing only other groups
 * - MIXED_GROUP    — Group containing a mix of member types
 */
export type GroupType =
  | "MODEL_GROUP"
  | "SUBMODEL_GROUP"
  | "META_GROUP"
  | "MIXED_GROUP";

/** xLights entity classification */
export type XLightsEntityType =
  | "MODEL"
  | "SUBMODEL"
  | "MODEL_GROUP"
  | "SUBMODEL_GROUP"
  | "META_GROUP"
  | "MIXED_GROUP";

/** A parsed xLights model or group */
export interface ParsedModel {
  name: string;
  displayAs: string;
  type: string;
  pixelCount: number;
  parm1: number;
  parm2: number;
  parm3: number;
  stringType: string;
  startChannel: string;
  worldPosX: number;
  worldPosY: number;
  worldPosZ: number;
  submodels: SubModel[];
  isGroup: boolean;
  aliases: string[];
  memberModels: string[];
  entityType?: XLightsEntityType;
  groupType?: GroupType;
  parentModels?: string[];
  semanticCategory?: string;
}

/** A parsed xLights layout file */
export interface ParsedLayout {
  models: ParsedModel[];
  modelCount: number;
  fileName: string;
}
