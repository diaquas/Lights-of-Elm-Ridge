/**
 * @lightsofelmridge/xlights-file-gen
 *
 * Shared library for parsing and generating xLights XML files.
 * Used by modiq, the web storefront, and xwire.
 */

// ── Parsers ──
export {
  parseXsqModels,
  parseXsqEffectCounts,
  parseXsqEffectTypeCounts,
} from "./parsers";

// Future: export { parseRgbEffectsXml } from './parsers';

// ── Generators ──
export {
  generateRgbEffects,
  generateNetworks,
  generatePackage,
} from "./generators";
export type {
  PackageGeneratorOptions,
  GeneratedPackage,
} from "./generators";

// ── Data ──
export { PROP_TEMPLATES } from "./models/prop-templates";
export type { PropTemplate } from "./models/prop-templates";
export { CONTROLLER_DB, findController } from "./models/controller-db";
export {
  calculateUniverses,
  pixelsToChannels,
  pixelsToUniverses,
} from "./models/universe-calculator";
export type { UniverseBreakdown } from "./models/universe-calculator";
export { PACKAGES } from "./packages";

// ── Types ──
export type {
  ParsedModel,
  ParsedLayout,
  SubModel,
  GroupType,
  XLightsEntityType,
} from "./types/models";
export type {
  ControllerSpec,
  PortAssignment,
  NetworkEntry,
} from "./types/controllers";
export type {
  PackageTier,
  DisplayPackage,
  ShoppingListItem,
} from "./types/packages";
