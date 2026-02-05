/**
 * ModIQ — Intelligent Sequence Mapping for xLights
 * by Lights of Elm Ridge
 */

export { parseRgbEffectsXml, normalizeType } from "./parser";
export type { ParsedModel, ParsedLayout, SubModel } from "./parser";

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
  mapSubmodels,
  scoreToConfidence,
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

export { parseXsqModels, getSequenceModelList } from "./xsq-parser";
