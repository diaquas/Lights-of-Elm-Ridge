/**
 * ModIQ — Intelligent Sequence Mapping for xLights
 * by Lights of Elm Ridge
 */

export { parseRgbEffectsXml, normalizeType } from "./parser";
export type { ParsedModel, ParsedLayout, SubModel, GroupType } from "./parser";

export type {
  XLightsEntityType,
  GroupEntityType,
  ModIQPhaseType,
} from "@/types/xLightsTypes";
export {
  detectGroupType,
  getEntityType,
  getPhaseType,
  isSpinnerType,
  isGroupPhaseType,
  parseMemberType,
  analyzeGroupMembers,
} from "@/types/xLightsTypes";

export {
  HALLOWEEN_MODELS,
  CHRISTMAS_MODELS,
  getModelsForDisplay,
  getSourceModelsForSequence,
  sourceModelToParsedModel,
} from "./source-layout";
export type { SourceModel, DisplayType } from "./source-layout";

export {
  matchModels,
  suggestMatches,
  suggestMatchesForSource,
  mapSubmodels,
  scoreToConfidence,
  isDmxModel,
  clearTokenCache,
  clearSubmodelCache,
} from "./matcher";
export type {
  Confidence,
  ModelMapping,
  MappingResult,
  SubmodelMapping,
} from "./matcher";

export {
  generateXmap,
  downloadXmap,
  createXmapBlob,
  generateMappingReport,
  downloadMappingReport,
} from "./xmap-generator";

export { parseXsqModels, getSequenceModelList, getSequenceEffectCounts, getModelEffectCount } from "./xsq-parser";

export {
  buildEffectTree,
  getActiveSourceModels,
  getActiveSourceNamesForExport,
} from "./effect-tree";
export type {
  EffectTree,
  GroupEffectInfo,
  ModelEffectInfo,
  GroupScenario,
  EffectSummary,
} from "./effect-tree";

export {
  computeDisplayCoverage,
  findBoostSuggestions,
  findSpinnerBoostSuggestions,
  projectDisplayCoverage,
} from "./boost-matcher";
export type {
  BoostSuggestion,
  SpinnerBoostSuggestion,
  DisplayCoverage,
} from "./boost-matcher";
