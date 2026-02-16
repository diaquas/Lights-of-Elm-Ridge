/**
 * xLights rgbeffects.xml Generator
 *
 * Generates valid xlights_rgbeffects.xml files from structured model data.
 * Used by the Shop Wizard to create starter layouts for new users.
 *
 * TODO: Implement
 * Inputs: Array of model definitions with positions, pixel counts, controller assignments
 * Outputs: Valid xlights_rgbeffects.xml string
 */

import type { ParsedModel } from "../types/models";

export function generateRgbEffects(
  _models: ParsedModel[],
  _positions?: Record<string, { x: number; y: number }>,
): string {
  throw new Error("Not implemented — see docs/tickets/ for spec");
}
