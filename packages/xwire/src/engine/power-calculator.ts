/**
 * Power Calculator
 *
 * Calculates voltage drop, injection points, and PSU sizing for a display.
 *
 * TODO: Implement
 * Inputs: Layout file (via xlights-file-gen), pixel type, voltage, wire gauge
 * Outputs: Injection points, PSU sizing, voltage drop warnings
 *
 * See docs/xwire/product-vision.md for requirements.
 */

export interface PowerPlan {
  totalWatts: number;
  totalAmps: number;
  psuCount: number;
  injectionPoints: { modelName: string; pixelIndex: number; reason: string }[];
  warnings: string[];
}

export function calculatePowerPlan(): PowerPlan {
  throw new Error("Not implemented");
}
