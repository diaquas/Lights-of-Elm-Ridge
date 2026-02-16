/**
 * xLights rgbeffects.xml Layout Parser
 *
 * Parses xlights_rgbeffects.xml files to extract structured model data.
 * This is a stub that will be populated when the parser is fully extracted
 * from the web app's src/lib/modiq/parser.ts.
 *
 * For now, the web app's parser.ts remains the canonical implementation.
 * This file establishes the package boundary for future extraction.
 */

import type { ParsedModel, ParsedLayout } from "../types/models";

export type { ParsedModel, ParsedLayout };

// TODO: Extract parseRgbEffectsXml from web app's src/lib/modiq/parser.ts
// The parser depends on @/types/xLightsTypes for group classification,
// which needs to be inlined or extracted first.
//
// export function parseRgbEffectsXml(xml: string, fileName: string): ParsedLayout
