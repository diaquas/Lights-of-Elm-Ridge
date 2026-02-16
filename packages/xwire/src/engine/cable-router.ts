/**
 * Cable Router
 *
 * Calculates optimal cable routing from controllers to props.
 *
 * TODO: Implement
 * Inputs: Controller positions, prop positions (from layout XML)
 * Outputs: Cable runs with lengths, routing suggestions
 */

export interface CableRun {
  from: string; // controller name
  to: string; // prop name
  port: number;
  lengthFeet: number;
  wireGauge: number;
}

export function calculateCableRoutes(): CableRun[] {
  throw new Error("Not implemented");
}
