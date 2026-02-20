/**
 * xWire Core Types
 *
 * All types for wiring plans, power calculations, cable routing,
 * and bill of materials generation.
 */

// ── Wiring Plan (top-level output) ──

export interface WiringPlan {
  controllers: ControllerPlacement[];
  cableRuns: CableRunSpec[];
  injectionPoints: InjectionPoint[];
  powerSupplies: PowerSupply[];
  totalPixels: number;
  totalWatts: number;
  warnings: string[];
}

// ── Controller Placement ──

export interface ControllerPlacement {
  name: string;
  vendor: string;
  model: string;
  ip: string;
  protocol: string;
  isReceiver: boolean;
  portCount: number;
  maxPixelsPerPort: number;
  position: { x: number; y: number };
}

// ── Cable Runs ──

export interface CableRunSpec {
  id: string;
  from: string;
  to: string;
  port: number;
  lengthFeet: number;
  wireGauge: number;
  pixelCount: number;
  /** Cable type: data (pixel signal), ethernet, or power */
  cableType: "data" | "ethernet" | "power";
}

// ── Power Injection ──

export interface InjectionPoint {
  modelName: string;
  /** Pixel index where injection is recommended (1-based) */
  pixelIndex: number;
  voltage: number;
  /** Human-readable reason (e.g., "Voltage drop exceeds 10%") */
  reason: string;
  /** Recommended fuse rating in amps */
  fuseAmps: number;
}

// ── Power Supply ──

export interface PowerSupply {
  name: string;
  voltage: number;
  amps: number;
  watts: number;
  /** Which models this PSU powers */
  models: string[];
  /** Current load in watts */
  loadWatts: number;
  /** Utilization percentage (0-100) */
  utilizationPercent: number;
}

// ── Power Plan (output of power calculator) ──

export interface PowerPlan {
  totalWatts: number;
  totalAmps: number;
  powerSupplies: PowerSupply[];
  injectionPoints: InjectionPoint[];
  warnings: string[];
  /** Per-port power breakdown */
  portPower: PortPowerInfo[];
}

export interface PortPowerInfo {
  controllerName: string;
  port: number;
  pixelCount: number;
  wattsPerPixel: number;
  totalWatts: number;
  totalAmps: number;
  voltage: number;
  needsInjection: boolean;
}

// ── Port Validation ──

export interface PortValidation {
  controllerName: string;
  port: number;
  currentPixels: number;
  maxPixels: number;
  isOverloaded: boolean;
  overloadAmount: number;
  suggestion: string;
}

// ── Bill of Materials ──

export interface BomItem {
  category:
    | "cable"
    | "connector"
    | "fuse"
    | "psu"
    | "enclosure"
    | "ethernet"
    | "splitter";
  description: string;
  quantity: number;
  unitCost: number;
  spec: string;
  /** Which prop or run requires this item */
  sourceModel?: string;
  priority: "required" | "recommended" | "optional";
}

// ── Power calculation inputs ──

export interface PowerCalcInput {
  /** Pixel type: WS2811, WS2812B, WS2815, SK6812 */
  pixelType: string;
  /** Supply voltage: 5 or 12 */
  voltage: number;
  /** Total pixel count for the run */
  pixelCount: number;
  /** Cable length in feet */
  cableLengthFeet: number;
  /** Wire gauge (AWG) */
  wireGauge: number;
}

export interface VoltageDropResult {
  inputVoltage: number;
  outputVoltage: number;
  dropVolts: number;
  dropPercent: number;
  needsInjection: boolean;
  currentAmps: number;
}
