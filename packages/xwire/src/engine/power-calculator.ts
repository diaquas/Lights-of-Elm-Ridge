/**
 * Power Calculator
 *
 * Calculates voltage drop, power supply sizing, and per-port power analysis.
 * Core engine for Wire:IQ power planning.
 */

import type {
  PowerPlan,
  PowerCalcInput,
  VoltageDropResult,
  PowerSupply,
  PortPowerInfo,
  InjectionPoint,
} from "../types/wiring";
import type { PortBinding } from "@lightsofelmridge/xlights-file-gen/src/types/networks";
import { PIXEL_POWER_SPECS } from "../data/pixel-power-specs";
import { WIRE_GAUGE_TABLE } from "../data/wire-gauge-tables";

export type { PowerPlan };

/** Safety factor for PSU sizing (25% headroom) */
const PSU_SAFETY_FACTOR = 1.25;
/** Voltage drop threshold for injection recommendation */
const VOLTAGE_DROP_THRESHOLD = 0.1; // 10%

/** Standard PSU sizes commonly available (watts) */
const STANDARD_PSU_SIZES = [60, 100, 150, 200, 350, 500, 600];

/**
 * Calculate voltage drop for a pixel run.
 *
 * V_drop = I_total x R_wire x 2 x length
 * (x2 for round trip: positive and negative conductors)
 */
export function calculateVoltageDrop(input: PowerCalcInput): VoltageDropResult {
  const pixelSpec =
    PIXEL_POWER_SPECS.find(
      (s) => s.type === input.pixelType && s.voltage === input.voltage,
    ) ?? PIXEL_POWER_SPECS[0]; // Default to WS2811 12V

  const wireSpec = WIRE_GAUGE_TABLE.find((w) => w.awg === input.wireGauge);
  const resistancePerFoot = wireSpec?.resistancePerFoot ?? 0.0065; // Default 18AWG

  const totalAmps = input.pixelCount * pixelSpec.ampsPerPixel;
  // Round-trip resistance (positive + negative conductors)
  const totalResistance = resistancePerFoot * input.cableLengthFeet * 2;
  const dropVolts = totalAmps * totalResistance;
  const dropPercent = input.voltage > 0 ? dropVolts / input.voltage : 0;

  return {
    inputVoltage: input.voltage,
    outputVoltage: Math.max(0, input.voltage - dropVolts),
    dropVolts,
    dropPercent,
    needsInjection: dropPercent > VOLTAGE_DROP_THRESHOLD,
    currentAmps: totalAmps,
  };
}

/**
 * Get the power draw per pixel for a given pixel type and voltage.
 */
export function getWattsPerPixel(pixelType: string, voltage: number): number {
  const spec = PIXEL_POWER_SPECS.find(
    (s) => s.type === pixelType && s.voltage === voltage,
  );
  return spec?.wattsPerPixel ?? 0.3; // Safe default
}

/**
 * Get amps per pixel for a given pixel type and voltage.
 */
export function getAmpsPerPixel(pixelType: string, voltage: number): number {
  const spec = PIXEL_POWER_SPECS.find(
    (s) => s.type === pixelType && s.voltage === voltage,
  );
  return spec?.ampsPerPixel ?? 0.06; // Safe default
}

/**
 * Calculate a complete power plan from port bindings.
 *
 * @param portBindings - Resolved port bindings from the port resolver
 * @param pixelType - Default pixel type for all models
 * @param voltage - Default supply voltage (5 or 12)
 */
export function calculatePowerPlan(
  portBindings: PortBinding[],
  pixelType: string = "WS2811",
  voltage: number = 12,
): PowerPlan {
  const wattsPerPx = getWattsPerPixel(pixelType, voltage);
  const ampsPerPx = getAmpsPerPixel(pixelType, voltage);
  const warnings: string[] = [];
  const injectionPoints: InjectionPoint[] = [];

  // Calculate per-port power
  const portPower: PortPowerInfo[] = portBindings.map((binding) => {
    const totalWatts = binding.totalPixels * wattsPerPx;
    const totalAmps = binding.totalPixels * ampsPerPx;

    const needsInjection = shouldInjectPower(
      binding.totalPixels,
      pixelType,
      voltage,
    );

    if (needsInjection) {
      const points = calculateInjectionPointsForPort(
        binding,
        pixelType,
        voltage,
      );
      injectionPoints.push(...points);
    }

    if (binding.isOverloaded) {
      warnings.push(
        `Port ${binding.port} on ${binding.controllerName} has ${binding.totalPixels}px ` +
          `(max ${binding.maxPixels}px) — overloaded by ${binding.totalPixels - binding.maxPixels}px`,
      );
    }

    return {
      controllerName: binding.controllerName,
      port: binding.port,
      pixelCount: binding.totalPixels,
      wattsPerPixel: wattsPerPx,
      totalWatts,
      totalAmps,
      voltage,
      needsInjection,
    };
  });

  const totalWatts = portPower.reduce((sum, p) => sum + p.totalWatts, 0);
  const totalAmps = portPower.reduce((sum, p) => sum + p.totalAmps, 0);

  const powerSupplies = sizePowerSupplies(portBindings, wattsPerPx, voltage);

  return {
    totalWatts,
    totalAmps,
    powerSupplies,
    injectionPoints,
    warnings,
    portPower,
  };
}

/**
 * Determine if a pixel run needs power injection based on pixel count thresholds.
 */
function shouldInjectPower(
  pixelCount: number,
  pixelType: string,
  voltage: number,
): boolean {
  const thresholds = getInjectionThresholds(pixelType, voltage);
  return pixelCount > thresholds.firstInjectionAt;
}

/**
 * Get injection thresholds for a pixel type/voltage combination.
 */
export function getInjectionThresholds(
  pixelType: string,
  voltage: number,
): { firstInjectionAt: number; repeatEvery: number } {
  const key = `${pixelType}:${voltage}`;
  const thresholds: Record<
    string,
    { firstInjectionAt: number; repeatEvery: number }
  > = {
    "WS2811:12": { firstInjectionAt: 200, repeatEvery: 300 },
    "WS2811:5": { firstInjectionAt: 75, repeatEvery: 100 },
    "WS2812B:5": { firstInjectionAt: 50, repeatEvery: 75 },
    "WS2815:12": { firstInjectionAt: 200, repeatEvery: 300 },
    "SK6812:5": { firstInjectionAt: 50, repeatEvery: 75 },
  };

  return thresholds[key] ?? { firstInjectionAt: 150, repeatEvery: 200 };
}

/**
 * Calculate specific injection points for a port's models.
 */
function calculateInjectionPointsForPort(
  binding: PortBinding,
  pixelType: string,
  voltage: number,
): InjectionPoint[] {
  const thresholds = getInjectionThresholds(pixelType, voltage);
  const points: InjectionPoint[] = [];

  let cumulativePixels = 0;
  let nextInjectionAt = thresholds.firstInjectionAt;

  for (const model of binding.models) {
    const modelStart = cumulativePixels;
    const modelEnd = cumulativePixels + model.pixelCount;

    while (nextInjectionAt < modelEnd) {
      const pixelInModel = nextInjectionAt - modelStart;
      const ampsAtPoint = getAmpsPerPixel(pixelType, voltage) * nextInjectionAt;
      // Fuse at 125% of expected current, rounded up to nearest 5A
      const fuseAmps = Math.ceil((ampsAtPoint * 1.25) / 5) * 5;

      points.push({
        modelName: model.modelName,
        pixelIndex: pixelInModel + 1, // 1-based
        voltage,
        reason: `Voltage drop exceeds 10% at pixel ${nextInjectionAt} in chain`,
        fuseAmps: Math.max(fuseAmps, 5),
      });

      nextInjectionAt += thresholds.repeatEvery;
    }

    cumulativePixels = modelEnd;
  }

  return points;
}

/**
 * Size power supplies for the display.
 * Groups ports by controller and sizes PSUs with 25% safety factor.
 */
function sizePowerSupplies(
  portBindings: PortBinding[],
  wattsPerPixel: number,
  voltage: number,
): PowerSupply[] {
  const controllerGroups = new Map<string, PortBinding[]>();
  for (const binding of portBindings) {
    const existing = controllerGroups.get(binding.controllerName) ?? [];
    existing.push(binding);
    controllerGroups.set(binding.controllerName, existing);
  }

  const psus: PowerSupply[] = [];
  let psuIndex = 1;

  for (const [, bindings] of controllerGroups) {
    const totalPixels = bindings.reduce((sum, b) => sum + b.totalPixels, 0);
    const loadWatts = totalPixels * wattsPerPixel;
    const requiredWatts = loadWatts * PSU_SAFETY_FACTOR;

    const psuWatts =
      STANDARD_PSU_SIZES.find((size) => size >= requiredWatts) ??
      STANDARD_PSU_SIZES[STANDARD_PSU_SIZES.length - 1];

    const amps = psuWatts / voltage;
    const utilization = psuWatts > 0 ? (loadWatts / psuWatts) * 100 : 0;

    const modelNames = bindings.flatMap((b) =>
      b.models.map((m) => m.modelName),
    );

    psus.push({
      name: `PSU-${psuIndex}`,
      voltage,
      amps: Math.round(amps * 10) / 10,
      watts: psuWatts,
      models: modelNames,
      loadWatts: Math.round(loadWatts * 10) / 10,
      utilizationPercent: Math.round(utilization),
    });

    psuIndex++;
  }

  return psus;
}
