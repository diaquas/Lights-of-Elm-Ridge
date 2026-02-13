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
  XLightsEntity,
  XLightsModel,
  XLightsSubmodel,
  XLightsGroup,
} from "@/types/xLightsTypes";
export {
  detectGroupType,
  getEntityType,
  getPhaseType,
  isSpinnerType,
  isGroupPhaseType,
  parseMemberName,
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
  SacrificeInfo,
  SubmodelMapping,
} from "./matcher";

export {
  generateXmap,
  downloadXmap,
  createXmapBlob,
  generateMappingReport,
  downloadMappingReport,
} from "./xmap-generator";

export {
  parseXsqModels,
  parseXsqEffectCounts,
  parseXsqEffectTypeCounts,
  getSequenceModelList,
  getSequenceEffectCounts,
  getSequenceEffectTypeCounts,
  getModelEffectCount,
} from "./xsq-parser";

export {
  buildEffectTree,
  getActiveSourceModels,
  getActiveSourceNamesForExport,
  detectModelSuperGroups,
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

export {
  analyzeModelEffects,
  analyzeSequenceEffects,
  getEffectCategory,
  getEffectImpactWeight,
  getEffectCategoryLabel,
  isSignatureEffect,
  findHiddenGems,
  getEffectSuggestionContext,
  SIGNATURE_EFFECTS,
} from "./effect-analysis";
export type {
  EffectCategory,
  EffectTypeInfo,
  ModelEffectAnalysis,
  SequenceEffectAnalysis,
  EffectCoverageMetrics,
  EffectPropMismatch,
  HiddenGem,
  EffectSuggestionContext,
} from "./effect-analysis";
