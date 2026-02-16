/**
 * Controller and network types for xLights infrastructure.
 */

export interface ControllerSpec {
  vendor: string;
  model: string;
  ports: number;
  protocol: string;
  maxPixelsPerPort: number;
}

export interface PortAssignment {
  port: number;
  modelName: string;
  pixelCount: number;
  startUniverse: number;
  channels: number;
}

export interface NetworkEntry {
  ip: string;
  controller: ControllerSpec;
  ports: PortAssignment[];
}
