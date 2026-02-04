/**
 * ModIQ — Intelligent Sequence Mapping for xLights
 * by Lights of Elm Ridge
 */

export { parseRgbEffectsXml, normalizeType } from "./parser";
export type { ParsedModel, ParsedLayout, SubModel } from "./parser";

export {
  SOURCE_MODELS,
  SOURCE_GROUPS,
  getAllSourceModels,
  getSourceModelsForSequence,
  sourceModelToParsedModel,
} from "./source-layout";
export type { SourceModel } from "./source-layout";

export { matchModels } from "./matcher";
export type {
  Confidence,
  ModelMapping,
  MappingResult,
  SubmodelMapping,
} from "./matcher";

export { generateXmap, downloadXmap, createXmapBlob } from "./xmap-generator";
