/**
 * @lightsofelmridge/xwire
 *
 * Wiring diagram generator for xLights displays.
 * Generates power plans, cable routes, and bills of materials
 * from xLights layout files.
 *
 * Part of the Wire:IQ tool — Step 5 in the beginner onboarding platform.
 */

// ── Engine ──
export {
  calculatePowerPlan,
  calculateVoltageDrop,
  getWattsPerPixel,
  getAmpsPerPixel,
  getInjectionThresholds,
} from "./engine/power-calculator";
export type { PowerPlan } from "./engine/power-calculator";

export { calculateCableRoutes } from "./engine/cable-router";
export type { CableRun } from "./engine/cable-router";

export {
  assignPorts,
  validatePorts,
  checkControllerCapacity,
} from "./engine/port-assigner";
export type { PortAssignment } from "./engine/port-assigner";

export { generateBillOfMaterials } from "./engine/bill-of-materials";

// ── Data ──
export { WIRE_GAUGE_TABLE } from "./data/wire-gauge-tables";
export type { WireGaugeSpec } from "./data/wire-gauge-tables";
export { PIXEL_POWER_SPECS } from "./data/pixel-power-specs";
export type { PixelPowerSpec } from "./data/pixel-power-specs";
export { CONTROLLER_PORT_SPECS } from "./data/controller-port-specs";

// ── Types ──
export type {
  WiringPlan,
  ControllerPlacement,
  CableRunSpec,
  InjectionPoint,
  PowerSupply,
  PowerCalcInput,
  VoltageDropResult,
  PortPowerInfo,
  PortValidation,
  BomItem,
} from "./types/wiring";
