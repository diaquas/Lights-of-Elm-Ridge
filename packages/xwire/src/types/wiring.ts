/**
 * xWire Core Types
 */

export interface WiringPlan {
  controllers: ControllerPlacement[];
  cableRuns: CableRunSpec[];
  injectionPoints: InjectionPoint[];
  powerSupplies: PowerSupply[];
  totalPixels: number;
  totalWatts: number;
}

export interface ControllerPlacement {
  name: string;
  vendor: string;
  model: string;
  position: { x: number; y: number }; // relative to yard
}

export interface CableRunSpec {
  id: string;
  from: string;
  to: string;
  port: number;
  lengthFeet: number;
  wireGauge: number;
  pixelCount: number;
}

export interface InjectionPoint {
  modelName: string;
  pixelIndex: number;
  voltage: number;
  reason: string;
}

export interface PowerSupply {
  name: string;
  voltage: number;
  amps: number;
  watts: number;
  models: string[]; // which models this PSU powers
}
